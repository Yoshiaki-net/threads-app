from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger
from datetime import datetime
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Post, User
from services.threads_client import ThreadsClient
from services.discord_service import send_post_published_notification
from services.monitor import check_competitor_posts

scheduler = AsyncIOScheduler(timezone="Asia/Tokyo")

async def publish_scheduled_post(post_id: int):
    db: Session = SessionLocal()
    try:
        post = db.query(Post).filter(Post.id == post_id).first()
        if not post or post.status != "scheduled":
            return

        user = db.query(User).filter(User.id == post.user_id).first()
        token = user.threads_access_token if user and user.threads_access_token else None
        client = ThreadsClient(access_token=token)
        try:
            result = await client.publish_post(post.content)
            post.status = "published"
            post.threads_post_id = result.get("id", "")
            post.published_at = datetime.utcnow()
            db.commit()
            await send_post_published_notification(post.content, post.threads_post_id)
        except Exception as e:
            post.status = "failed"
            db.commit()
            print(f"Failed to publish post {post_id}: {e}")
        finally:
            await client.close()
    finally:
        db.close()

def schedule_post(post_id: int, scheduled_at: datetime):
    scheduler.add_job(
        publish_scheduled_post,
        trigger=DateTrigger(run_date=scheduled_at, timezone="Asia/Tokyo"),
        args=[post_id],
        id=f"post_{post_id}",
        replace_existing=True,
    )

def start_scheduler():
    # Monitor competitors every 30 minutes
    scheduler.add_job(
        check_competitor_posts,
        trigger=CronTrigger(minute="*/30"),
        id="competitor_monitor",
        replace_existing=True,
    )
    scheduler.start()

def stop_scheduler():
    scheduler.shutdown()
