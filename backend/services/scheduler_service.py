from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger
from datetime import datetime
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Post, User
from services.threads_client import ThreadsClient
from services.discord_service import send_post_published_notification
from services.monitor import check_competitor_posts, record_daily_engagement

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

async def update_published_post_performance():
    """公開済み投稿のいいね数・リプライ数を更新する。"""
    db: Session = SessionLocal()
    try:
        from models import UserSettings
        users = db.query(User).filter(User.threads_access_token != None).all()
        for user in users:
            try:
                posts = db.query(Post).filter(
                    Post.user_id == user.id,
                    Post.status == "published",
                    Post.threads_post_id != None,
                ).limit(20).all()
                if not posts:
                    continue
                client = ThreadsClient(access_token=user.threads_access_token)
                for post in posts:
                    try:
                        insights = await client.get_insights(post.threads_post_id)
                        data = insights.get("data", [])
                        for metric in data:
                            name = metric.get("name")
                            values = metric.get("values", [{}])
                            val = values[0].get("value", 0) if values else 0
                            if name == "likes":
                                post.likes_count = val
                            elif name == "replies":
                                post.replies_count = val
                        db.commit()
                    except Exception as e:
                        print(f"[Performance] {post.id}: {e}")
                await client.close()
            except Exception as e:
                print(f"[Performance] User {user.id}: {e}")
    finally:
        db.close()

async def send_weekly_competitor_report():
    """週次競合レポートを生成してDiscord/メールで送信する。"""
    from datetime import timedelta
    from models import Competitor, CompetitorPost, UserSettings
    from services.ai_service import generate_weekly_report
    from services.discord_service import send_discord_message
    from services.email_service import send_weekly_report_email

    db: Session = SessionLocal()
    try:
        users = db.query(User).filter(User.is_active == True).all()
        for user in users:
            try:
                user_settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
                if not user_settings or not user_settings.weekly_report_enabled:
                    continue

                competitors = db.query(Competitor).filter(
                    Competitor.user_id == user.id, Competitor.is_active == True
                ).all()
                if not competitors:
                    continue

                week_ago = datetime.utcnow() - timedelta(days=7)
                competitor_data = []
                for c in competitors:
                    buzz_posts = db.query(CompetitorPost).filter(
                        CompetitorPost.competitor_id == c.id,
                        CompetitorPost.is_buzz == True,
                        CompetitorPost.fetched_at >= week_ago,
                    ).order_by(CompetitorPost.likes_count.desc()).limit(3).all()

                    posts_count = db.query(CompetitorPost).filter(
                        CompetitorPost.competitor_id == c.id
                    ).count()

                    competitor_data.append({
                        "username": c.username,
                        "avg_likes": c.avg_likes_7d,
                        "posts_count": posts_count,
                        "buzz_posts": [{"text": p.text, "likes_count": p.likes_count} for p in buzz_posts],
                    })

                report = generate_weekly_report(competitor_data)

                # Discord送信
                if user_settings.notifications_enabled and user_settings.discord_webhook_url:
                    await send_discord_message(
                        user_settings.discord_webhook_url,
                        f"📊 **週次競合レポート**\n\n{report[:1900]}"
                    )

                # メール送信
                if user_settings.email_notifications_enabled:
                    email = user_settings.notification_email or user.email
                    await send_weekly_report_email(email, report)

            except Exception as e:
                print(f"[WeeklyReport] User {user.id}: {e}")
    finally:
        db.close()

def start_scheduler():
    # Monitor competitors every 30 minutes
    scheduler.add_job(
        check_competitor_posts,
        trigger=CronTrigger(minute="*/30"),
        id="competitor_monitor",
        replace_existing=True,
    )
    # Record daily engagement snapshots at midnight
    scheduler.add_job(
        record_daily_engagement,
        trigger=CronTrigger(hour=0, minute=0),
        id="daily_engagement_record",
        replace_existing=True,
    )
    # Update published post performance every hour
    scheduler.add_job(
        update_published_post_performance,
        trigger=CronTrigger(minute=0),
        id="post_performance_update",
        replace_existing=True,
    )
    # Weekly competitor report every Monday 9am
    scheduler.add_job(
        send_weekly_competitor_report,
        trigger=CronTrigger(day_of_week="mon", hour=9, minute=0),
        id="weekly_report",
        replace_existing=True,
    )
    scheduler.start()

def stop_scheduler():
    scheduler.shutdown()
