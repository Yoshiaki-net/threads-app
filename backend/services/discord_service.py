import httpx
from datetime import datetime
from core.config import settings

async def send_buzz_notification(competitor_username: str, post_text: str, likes: int, avg_likes: float, post_url: str = "", webhook_url: str = ""):
    url = webhook_url or settings.discord_webhook_url
    if not url:
        return

    embed = {
        "title": f"🔥 バズ投稿検出: @{competitor_username}",
        "description": post_text[:300] + ("..." if len(post_text) > 300 else ""),
        "color": 0xFF4500,
        "fields": [
            {"name": "❤️ いいね数", "value": str(likes), "inline": True},
            {"name": "📊 7日平均", "value": f"{avg_likes:.0f}", "inline": True},
            {"name": "📈 倍率", "value": f"{likes / avg_likes:.1f}x" if avg_likes > 0 else "N/A", "inline": True},
        ],
        "timestamp": datetime.utcnow().isoformat(),
        "footer": {"text": "Threads Monitor"},
    }

    if post_url:
        embed["url"] = post_url

    async with httpx.AsyncClient() as client:
        await client.post(
            url,
            json={"embeds": [embed]},
        )

async def send_post_published_notification(post_content: str, threads_post_id: str):
    if not settings.discord_webhook_url:
        return

    embed = {
        "title": "✅ 投稿が公開されました",
        "description": post_content[:300],
        "color": 0x00C851,
        "fields": [
            {"name": "Post ID", "value": threads_post_id, "inline": True},
        ],
        "timestamp": datetime.utcnow().isoformat(),
        "footer": {"text": "Threads Auto Poster"},
    }

    async with httpx.AsyncClient() as client:
        await client.post(
            settings.discord_webhook_url,
            json={"embeds": [embed]},
        )
