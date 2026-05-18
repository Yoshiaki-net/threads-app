from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import httpx
from database import get_db
from models import User
from auth import get_current_user, create_access_token
from core.config import settings

router = APIRouter(prefix="/api/auth/threads", tags=["threads-oauth"])

THREADS_AUTH_URL = "https://threads.net/oauth/authorize"
THREADS_TOKEN_URL = "https://graph.threads.net/oauth/access_token"
THREADS_LONG_TOKEN_URL = "https://graph.threads.net/access_token"
REDIRECT_URI = "http://localhost:8000/api/auth/threads/callback"
SCOPES = "threads_basic,threads_content_publish,threads_manage_insights,threads_read_replies,threads_manage_replies"

@router.get("/authorize")
async def authorize(current_user: User = Depends(get_current_user)):
    url = (
        f"{THREADS_AUTH_URL}"
        f"?client_id={settings.threads_app_id}"
        f"&redirect_uri={REDIRECT_URI}"
        f"&scope={SCOPES}"
        f"&response_type=code"
        f"&state={current_user.id}"
    )
    return {"url": url}

@router.get("/callback")
async def callback(code: str, state: str, db: Session = Depends(get_db)):
    user_id = int(state)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return RedirectResponse(f"{settings.frontend_url}/settings?error=user_not_found")

    async with httpx.AsyncClient() as client:
        # Exchange code for short-lived token
        resp = await client.post(
            THREADS_TOKEN_URL,
            data={
                "client_id": settings.threads_app_id,
                "client_secret": settings.threads_app_secret,
                "grant_type": "authorization_code",
                "redirect_uri": REDIRECT_URI,
                "code": code,
            },
        )
        if resp.status_code != 200:
            return RedirectResponse(f"{settings.frontend_url}/settings?error=token_exchange_failed")

        token_data = resp.json()
        short_token = token_data.get("access_token")
        threads_user_id = str(token_data.get("user_id", ""))

        # Exchange for long-lived token (60 days)
        resp2 = await client.get(
            THREADS_LONG_TOKEN_URL,
            params={
                "grant_type": "th_exchange_token",
                "client_secret": settings.threads_app_secret,
                "access_token": short_token,
            },
        )
        long_token = short_token
        if resp2.status_code == 200:
            long_token = resp2.json().get("access_token", short_token)

        # Get Threads username
        profile_resp = await client.get(
            "https://graph.threads.net/v1.0/me",
            params={
                "fields": "id,username,name",
                "access_token": long_token,
            },
        )
        username = ""
        if profile_resp.status_code == 200:
            profile = profile_resp.json()
            threads_user_id = profile.get("id", threads_user_id)
            username = profile.get("username", "")

    user.threads_access_token = long_token
    user.threads_user_id = threads_user_id
    user.threads_username = username
    db.commit()

    return RedirectResponse(f"{settings.frontend_url}/settings?connected=true")

@router.delete("/disconnect")
async def disconnect(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    current_user.threads_access_token = None
    current_user.threads_user_id = None
    current_user.threads_username = None
    db.commit()
    return {"ok": True}
