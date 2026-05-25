import httpx
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
        """Look up a Threads user by username. Returns profile dict or None."""
        username = username.lstrip("@").strip()

        # Method 1: Threads Graph API by_username endpoint
        try:
            resp = await self.client.get(
                f"{THREADS_API_BASE}/by_username",
                params={
                    "username": username,
                    "fields": "id,username,name,threads_profile_picture_url,threads_biography",
                    "access_token": self.access_token,
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                if data.get("id"):
                    return data
        except Exception:
            pass

        # Method 2: Graph API username lookup via ?id=@username
        try:
            resp2 = await self.client.get(
                "https://graph.threads.net/v1.0/",
                params={
                    "id": username,
                    "type": "threads_username",
                    "fields": "id,username,name,threads_profile_picture_url,threads_biography",
                    "access_token": self.access_token,
                },
            )
            if resp2.status_code == 200:
                data2 = resp2.json()
                if data2.get("id"):
                    return data2
        except Exception:
            pass

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
