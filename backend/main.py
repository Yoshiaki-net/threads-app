from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import engine, Base
from services.scheduler_service import start_scheduler, stop_scheduler
from api import competitors, knowledge, posts, scheduler
from api.auth_router import router as auth_router
from api.threads_oauth import router as threads_oauth_router
from api.user_settings import router as settings_router
from api.admin import router as admin_router
from core.config import settings

Base.metadata.create_all(bind=engine)

def run_migrations():
    """Add new columns to existing tables without dropping data."""
    from sqlalchemy import text
    is_sqlite = settings.database_url.startswith("sqlite")
    if is_sqlite:
        engagement_history_ddl = (
            "CREATE TABLE IF NOT EXISTS competitor_engagement_history "
            "(id INTEGER PRIMARY KEY, competitor_id INTEGER REFERENCES competitors(id), "
            "avg_likes REAL DEFAULT 0, posts_count INTEGER DEFAULT 0, "
            "followers_count INTEGER DEFAULT 0, recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"
        )
    else:
        engagement_history_ddl = (
            "CREATE TABLE IF NOT EXISTS competitor_engagement_history "
            "(id SERIAL PRIMARY KEY, competitor_id INTEGER REFERENCES competitors(id), "
            "avg_likes FLOAT DEFAULT 0, posts_count INTEGER DEFAULT 0, "
            "followers_count INTEGER DEFAULT 0, recorded_at TIMESTAMP DEFAULT NOW())"
        )

    with engine.connect() as conn:
        stmts = [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP",
            "CREATE TABLE IF NOT EXISTS invite_codes (id SERIAL PRIMARY KEY, code VARCHAR UNIQUE NOT NULL, used BOOLEAN DEFAULT FALSE, used_by INTEGER REFERENCES users(id), created_by INTEGER NOT NULL REFERENCES users(id), created_at TIMESTAMP DEFAULT NOW())",
            "ALTER TABLE competitors ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR",
            "ALTER TABLE competitors ADD COLUMN IF NOT EXISTS bio TEXT",
            "ALTER TABLE competitors ADD COLUMN IF NOT EXISTS last_fetched_at TIMESTAMP",
            "ALTER TABLE competitors ADD COLUMN IF NOT EXISTS followers_count_updated_at TIMESTAMP",
            engagement_history_ddl,
            "ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT FALSE",
            "ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notification_email VARCHAR",
            "ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS weekly_report_enabled BOOLEAN DEFAULT FALSE",
        ]
        for stmt in stmts:
            try:
                conn.execute(text(stmt))
            except Exception as e:
                print(f"[Migration] {e}")
        conn.commit()

run_migrations()

def promote_admin():
    """Promote ADMIN_EMAIL to admin on startup if set."""
    if not settings.admin_email:
        return
    from database import SessionLocal
    from models import User
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == settings.admin_email).first()
        if user and not user.is_admin:
            user.is_admin = True
            db.commit()
            print(f"[Admin] Promoted {settings.admin_email} to admin.")
    finally:
        db.close()

promote_admin()

@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()

app = FastAPI(title="Threads Automation App", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(threads_oauth_router)
app.include_router(settings_router)
app.include_router(competitors.router)
app.include_router(knowledge.router)
app.include_router(posts.router)
app.include_router(scheduler.router)
app.include_router(admin_router)

@app.get("/health")
async def health():
    return {"status": "ok"}
