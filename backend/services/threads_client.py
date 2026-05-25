import httpx
import re
import json
from core.config import settings

THREADS_API_BASE = "https://graph.threads.net/v1.0"

class ThreadsClient:
    def __init__(self, access_token: str = None):
        self.access_token = access_token or settings.threads_access_token
        self.client = httpx.AsyncClient(timeout=30.0)

    async def get_user_profile(self, user_id: str = "me") -> dict:
        resp = await self.client.get(
            f"{THREADS_API_BASE}/{user_id}",
            params={
                "fields": "id,username,name,threads_profile_picture_url,threads_biography",
                "access_token": self.access_token,
            },
        )
        resp.raise_for_status()
        return resp.json()

    async def search_by_username(self, username: str) -> dict | None:
        """Look up a Threads user by username. Scrapes Threads web page to get user ID, then fetches via API."""
        username = username.lstrip("@").strip()

        # Step 1: Scrape Threads profile page to extract the numeric user ID
        user_id = await self._get_user_id_from_page(username)
        if user_id:
            try:
                profile = await self.get_user_profile(user_id)
                if profile.get("id"):
                    return profile
            except Exception as e:
                print(f"[search] Profile fetch for {user_id} failed: {e}")

        print(f"[search] Could not find user: @{username}")
        return None

    async def _get_user_id_from_page(self, username: str) -> str | None:
        """Fetch Threads profile page and extract numeric user ID."""
        url = f"https://www.threads.net/@{username}"
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ja,en-US;q=0.7,en;q=0.3",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-Mode": "navigate",
        }
        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as web:
                resp = await web.get(url, headers=headers)
                print(f"[page] @{username} → {resp.status_code}")
                if resp.status_code != 200:
                    return None

                text = resp.text

                # Pattern 1: Next.js __NEXT_DATA__ JSON blob
                m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', text, re.DOTALL)
                if m:
                    try:
                        nd = json.loads(m.group(1))
                        # Traverse common paths
                        for path in [
                            ["props", "pageProps", "user_id"],
                            ["props", "pageProps", "data", "user", "id"],
                            ["props", "pageProps", "userProfile", "id"],
                        ]:
                            node = nd
                            for key in path:
                                node = node.get(key) if isinstance(node, dict) else None
                                if node is None:
                                    break
                            if node and str(node).isdigit():
                                print(f"[page] Found ID via __NEXT_DATA__: {node}")
                                return str(node)
                    except Exception:
                        pass

                # Pattern 2: Inline JSON patterns common in Threads HTML
                patterns = [
                    r'"user_id"\s*:\s*"(\d{5,})"',
                    r'"userID"\s*:\s*"(\d{5,})"',
                    r'"pk"\s*:\s*"(\d{5,})"',
                    r'"user_pk"\s*:\s*"(\d{5,})"',
                    r'threads_user_id[^\d]*(\d{5,})',
                ]
                for pat in patterns:
                    m2 = re.search(pat, text)
                    if m2:
                        print(f"[page] Found ID via regex '{pat}': {m2.group(1)}")
                        return m2.group(1)

        except Exception as e:
            print(f"[page] Error fetching @{username}: {e}")

        return None

    async def get_user_threads(self, user_id: str, limit: int = 10) -> dict:
        resp = await self.client.get(
            f"{THREADS_API_BASE}/{user_id}/threads",
            params={
                "fields": "id,text,like_count,replies_count,repost_count,timestamp",
                "limit": limit,
                "access_token": self.access_token,
            },
        )
        resp.raise_for_status()
        return resp.json()

    async def publish_post(self, text: str) -> dict:
        # Step 1: Create media container
        resp = await self.client.post(
            f"{THREADS_API_BASE}/me/threads",
            params={"access_token": self.access_token},
            json={"media_type": "TEXT", "text": text},
        )
        resp.raise_for_status()
        container_id = resp.json()["id"]

        # Step 2: Publish
        resp2 = await self.client.post(
            f"{THREADS_API_BASE}/me/threads_publish",
            params={"access_token": self.access_token},
            json={"creation_id": container_id},
        )
        resp2.raise_for_status()
        return resp2.json()

    async def get_insights(self, post_id: str) -> dict:
        resp = await self.client.get(
            f"{THREADS_API_BASE}/{post_id}/insights",
            params={
                "metric": "likes,replies,reposts,quotes,views",
                "access_token": self.access_token,
            },
        )
        resp.raise_for_status()
        return resp.json()

    async def close(self):
        await self.client.aclose()

threads_client = ThreadsClient()
