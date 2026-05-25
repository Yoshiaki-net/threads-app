import httpx
import re
import json
import asyncio
from core.config import settings

THREADS_API_BASE = "https://graph.threads.net/v1.0"

# Browser-like headers (used for any HTML/scraping requests)
BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/126.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    "Sec-Ch-Ua": '"Chromium";v="126", "Google Chrome";v="126", "Not-A.Brand";v="99"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"macOS"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}

# Instagram public web profile API (Threads & Instagram share user IDs)
INSTAGRAM_API_HEADERS = {
    "User-Agent": "Instagram 219.0.0.12.117 Android",
    "X-IG-App-ID": "936619743392459",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
}


class UserNotAccessibleError(Exception):
    """User exists but cannot be accessed (dev-mode tester restriction)."""
    pass


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
        if resp.status_code == 400:
            err = resp.json().get("error", {})
            # OAuthException 100 / code 24 = "Object does not exist or insufficient permissions"
            if err.get("code") in (100, 24, 803):
                raise UserNotAccessibleError(err.get("message", "アクセス権限がありません"))
        resp.raise_for_status()
        return resp.json()

    async def search_by_username(self, username: str) -> dict | None:
        """
        Resolve a Threads username to a profile.
        Returns a dict with id, username, name, profile_picture_url, bio.
        May return data sourced from web scraping if API access is restricted.
        """
        username = username.lstrip("@").strip()
        if not username:
            return None

        # Try multiple strategies in parallel
        api_profile = None
        scraped = await self._scrape_profile_from_web(username)

        user_id = scraped.get("id") if scraped else None

        # If we got a user_id, try fetching via the official API for the most accurate data
        if user_id:
            try:
                api_profile = await self.get_user_profile(user_id)
            except UserNotAccessibleError:
                print(f"[search] User {user_id} not accessible (dev mode). Using scraped data.")
            except Exception as e:
                print(f"[search] API fetch error for {user_id}: {e}")

        # Merge: prefer API data, fall back to scraped data
        if api_profile:
            return {
                "id": api_profile.get("id", user_id),
                "username": api_profile.get("username", username),
                "name": api_profile.get("name", scraped.get("name", "") if scraped else ""),
                "threads_profile_picture_url": (
                    api_profile.get("threads_profile_picture_url")
                    or (scraped.get("avatar") if scraped else None)
                ),
                "threads_biography": (
                    api_profile.get("threads_biography")
                    or (scraped.get("bio") if scraped else "")
                ),
            }
        if scraped and scraped.get("id"):
            return {
                "id": scraped["id"],
                "username": scraped.get("username", username),
                "name": scraped.get("name", username),
                "threads_profile_picture_url": scraped.get("avatar"),
                "threads_biography": scraped.get("bio", ""),
                "_source": "scrape",
            }

        return None

    async def _scrape_profile_from_web(self, username: str) -> dict | None:
        """Try multiple URLs/strategies to extract Threads profile data."""
        # Strategy 1: Instagram public web profile API (shares user IDs with Threads)
        try:
            ig_data = await self._fetch_instagram_profile(username)
            if ig_data:
                return ig_data
        except Exception as e:
            print(f"[scrape] Instagram API failed: {e}")

        # Strategy 2: Scrape Threads web profile page
        for domain in ["www.threads.net", "www.threads.com"]:
            try:
                data = await self._scrape_threads_page(domain, username)
                if data and data.get("id"):
                    return data
            except Exception as e:
                print(f"[scrape] {domain}/@{username} failed: {e}")

        return None

    async def _fetch_instagram_profile(self, username: str) -> dict | None:
        """Use Instagram's public web profile endpoint to fetch user info."""
        url = f"https://i.instagram.com/api/v1/users/web_profile_info/?username={username}"
        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as web:
                resp = await web.get(url, headers=INSTAGRAM_API_HEADERS)
                print(f"[ig-api] @{username} → {resp.status_code}")
                if resp.status_code != 200:
                    return None
                data = resp.json()
                user = data.get("data", {}).get("user", {})
                if not user.get("id"):
                    return None
                return {
                    "id": str(user["id"]),
                    "username": user.get("username", username),
                    "name": user.get("full_name", ""),
                    "avatar": user.get("profile_pic_url_hd") or user.get("profile_pic_url"),
                    "bio": user.get("biography", ""),
                }
        except Exception as e:
            print(f"[ig-api] Error: {e}")
            return None

    async def _scrape_threads_page(self, domain: str, username: str) -> dict | None:
        """Scrape a Threads profile HTML page and extract data."""
        url = f"https://{domain}/@{username}"
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, http2=False) as web:
            resp = await web.get(url, headers=BROWSER_HEADERS)
            print(f"[scrape] {url} → {resp.status_code} ({len(resp.text)} bytes)")
            if resp.status_code != 200:
                return None
            html = resp.text

            result = {"username": username}

            # OG meta tags - often contain avatar and description
            og_title = re.search(r'<meta\s+property="og:title"\s+content="([^"]+)"', html)
            og_image = re.search(r'<meta\s+property="og:image"\s+content="([^"]+)"', html)
            og_desc = re.search(r'<meta\s+property="og:description"\s+content="([^"]+)"', html)
            if og_title:
                # Title format: "@username on Threads" or "Name (@username) on Threads"
                t = og_title.group(1)
                name_match = re.match(r'^(.+?)\s*\(@', t)
                if name_match:
                    result["name"] = name_match.group(1)
            if og_image:
                result["avatar"] = og_image.group(1)
            if og_desc:
                result["bio"] = og_desc.group(1)

            # Extract user_id - try many patterns
            user_id = self._extract_user_id(html)
            if user_id:
                result["id"] = user_id

            return result if result.get("id") else None

    def _extract_user_id(self, html: str) -> str | None:
        """Try many regex patterns to find the numeric Threads user ID."""
        patterns = [
            r'"user_id"\s*:\s*"(\d{5,})"',
            r'"user_id"\s*:\s*(\d{5,})',
            r'"userID"\s*:\s*"(\d{5,})"',
            r'"pk"\s*:\s*"(\d{5,})"',
            r'"pk_id"\s*:\s*"(\d{5,})"',
            r'"user_pk"\s*:\s*"(\d{5,})"',
            r'"owner"\s*:\s*\{\s*"id"\s*:\s*"(\d{5,})"',
            r'"profile_user"\s*:\s*\{\s*"id"\s*:\s*"(\d{5,})"',
            r'"id"\s*:\s*"(\d{5,})"\s*,\s*"username"',
            r'instagram_user_id["\s:]+(\d{5,})',
        ]
        for pat in patterns:
            m = re.search(pat, html)
            if m:
                uid = m.group(1)
                if uid.isdigit() and 6 <= len(uid) <= 20:
                    return uid

        # Try parsing __NEXT_DATA__ if present
        nd = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.DOTALL)
        if nd:
            try:
                data = json.loads(nd.group(1))
                # Recursively search for user_id-like keys
                return self._find_id_recursive(data)
            except Exception:
                pass

        return None

    def _find_id_recursive(self, obj, max_depth=8) -> str | None:
        if max_depth <= 0:
            return None
        if isinstance(obj, dict):
            for key in ("user_id", "userID", "pk", "pk_id"):
                v = obj.get(key)
                if v and str(v).isdigit() and 6 <= len(str(v)) <= 20:
                    return str(v)
            # If this object has both id+username, the id is likely the user_id
            if "username" in obj and "id" in obj:
                v = obj["id"]
                if v and str(v).isdigit() and 6 <= len(str(v)) <= 20:
                    return str(v)
            for v in obj.values():
                r = self._find_id_recursive(v, max_depth - 1)
                if r:
                    return r
        elif isinstance(obj, list):
            for v in obj:
                r = self._find_id_recursive(v, max_depth - 1)
                if r:
                    return r
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
        if resp.status_code == 400:
            err = resp.json().get("error", {})
            if err.get("code") in (100, 24, 803):
                raise UserNotAccessibleError(err.get("message", "アクセス権限がありません"))
        resp.raise_for_status()
        return resp.json()

    async def publish_post(self, text: str) -> dict:
        resp = await self.client.post(
            f"{THREADS_API_BASE}/me/threads",
            params={"access_token": self.access_token},
            json={"media_type": "TEXT", "text": text},
        )
        resp.raise_for_status()
        container_id = resp.json()["id"]

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
