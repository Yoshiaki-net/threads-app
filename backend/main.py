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
