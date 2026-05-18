import asyncio
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Competitor, CompetitorPost, UserSettings
from services.threads_client import ThreadsClient
from services.discord_service import send_buzz_notification
from core.config import settings

async def check_competitor_posts():
    db: Session = SessionLocal()
    try:
        competitors = db.query(Competitor).filter(Competitor.is_active == True).all()
        client = ThreadsClient()

        for competitor in competitors:
            try:
                user_settings = db.query(UserSettings).filter(UserSettings.user_id == competitor.user_id).first()
                buzz_likes_threshold = user_settings.buzz_likes_threshold if user_settings else settings.buzz_likes_threshold
                buzz_multiplier = user_settings.buzz_multiplier if user_settings else settings.buzz_multiplier
                discord_webhook_url = (user_settings.discord_webhook_url if user_settings and user_settings.discord_webhook_url else "") or ""
                notifications_enabled = user_settings.notifications_enabled if user_settings else True

                data = await client.get_user_threads(competitor.threads_user_id, limit=10)
                posts = data.get("data", [])

                likes_list = [p.get("like_count", 0) for p in posts if p.get("like_count")]
                avg_likes = sum(likes_list) / len(likes_list) if likes_list else competitor.avg_likes_7d

                competitor.avg_likes_7d = avg_likes
                db.commit()

                for post_data in posts:
                    post_id = post_data["id"]
                    existing = db.query(CompetitorPost).filter(
                        CompetitorPost.threads_post_id == post_id
                    ).first()

                    likes = post_data.get("like_count", 0)

                    if existing:
                        existing.likes_count = likes
                        db.commit()
                        if not existing.notified:
                            is_buzz = (
                                likes >= buzz_likes_threshold or
                                (avg_likes > 0 and likes >= avg_likes * buzz_multiplier)
                            )
                            if is_buzz:
                                existing.is_buzz = True
                                existing.notified = True
                                db.commit()
                                if notifications_enabled:
                                    await send_buzz_notification(
                                        competitor_username=competitor.username,
                                        post_text=existing.text or "",
                                        likes=likes,
                                        avg_likes=avg_likes,
                                        webhook_url=discord_webhook_url,
                                    )
                        continue

                    posted_at = None
                    if ts := post_data.get("timestamp"):
                        posted_at = datetime.fromisoformat(ts.replace("Z", "+00:00"))

                    is_buzz = (
                        likes >= buzz_likes_threshold or
                        (avg_likes > 0 and likes >= avg_likes * buzz_multiplier)
                    )

                    new_post = CompetitorPost(
                        competitor_id=competitor.id,
                        threads_post_id=post_id,
                        text=post_data.get("text", ""),
                        likes_count=likes,
                        replies_count=post_data.get("replies_count", 0),
                        reposts_count=post_data.get("repost_count", 0),
                        is_buzz=is_buzz,
                        notified=is_buzz,
                        posted_at=posted_at,
                    )
                    db.add(new_post)
                    db.commit()

                    if is_buzz and notifications_enabled:
                        await send_buzz_notification(
                            competitor_username=competitor.username,
                            post_text=post_data.get("text", ""),
                            likes=likes,
                            avg_likes=avg_likes,
                            webhook_url=discord_webhook_url,
                        )
            except Exception as e:
                print(f"Error monitoring {competitor.username}: {e}")

        await client.close()
    finally:
        db.close()
