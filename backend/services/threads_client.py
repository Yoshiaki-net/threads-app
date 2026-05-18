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
