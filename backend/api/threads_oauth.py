from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse
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
SCOPES = "threads_basic,threads_content_publish,threads_manage_insights,threads_read_replies,threads_manage_replies"


def get_redirect_uri() -> str:
    """Always compute REDIRECT_URI from current settings (not cached at import time)."""
    base = settings.backend_url.rstrip("/")  # strip trailing slash to avoid double-slash
    return f"{base}/api/auth/threads/callback"


@router.get("/config-check")
async def config_check(current_user: User = Depends(get_current_user)):
    """Debug: Check OAuth configuration without exposing secrets."""
    return {
        "app_id_set": bool(settings.threads_app_id),
        "app_secret_set": bool(settings.threads_app_secret),
        "backend_url": settings.backend_url,
        "frontend_url": settings.frontend_url,
        "redirect_uri": get_redirect_uri(),
    }


@router.get("/authorize")
async def authorize(current_user: User = Depends(get_current_user)):
    if not settings.threads_app_id:
        raise HTTPException(
            status_code=500,
            detail="THREADS_APP_ID が設定されていません。Renderの環境変数を確認してください。"
        )

    redirect_uri = get_redirect_uri()
    url = (
        f"{THREADS_AUTH_URL}"
        f"?client_id={settings.threads_app_id}"
        f"&redirect_uri={redirect_uri}"
        f"&scope={SCOPES}"
        f"&response_type=code"
        f"&state={current_user.id}"
    )
    return {"url": url, "redirect_uri": redirect_uri}


@router.get("/callback")
async def callback(request: Request, db: Session = Depends(get_db), code: str = None, state: str = None, error: str = None, error_description: str = None):
    frontend = settings.frontend_url

    # Threads returned an error
    if error:
        print(f"[Threads OAuth] Error from Threads: {error} - {error_description}")
        return RedirectResponse(f"{frontend}/settings?error={error}&error_desc={error_description or ''}")

    if not code or not state:
        return RedirectResponse(f"{frontend}/settings?error=missing_code_or_state")

    try:
        user_id = int(state)
    except ValueError:
        return RedirectResponse(f"{frontend}/settings?error=invalid_state")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return RedirectResponse(f"{frontend}/settings?error=user_not_found")

    redirect_uri = get_redirect_uri()

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Step 1: Exchange code for short-lived token
        resp = await client.post(
            THREADS_TOKEN_URL,
            data={
                "client_id": settings.threads_app_id,
                "client_secret": settings.threads_app_secret,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
                "code": code,
            },
        )

        if resp.status_code != 200:
            err_body = resp.text[:200]
            print(f"[Threads OAuth] Token exchange failed {resp.status_code}: {err_body}")
            return RedirectResponse(
                f"{frontend}/settings?error=token_exchange_failed&detail={resp.status_code}"
            )

        token_data = resp.json()
        short_token = token_data.get("access_token")
        threads_user_id = str(token_data.get("user_id", ""))

        if not short_token:
            print(f"[Threads OAuth] No access_token in response: {token_data}")
            return RedirectResponse(f"{frontend}/settings?error=no_access_token")

        # Step 2: Exchange for long-lived token (60 days)
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
        else:
            print(f"[Threads OAuth] Long token exchange failed {resp2.status_code}: {resp2.text[:200]}")

        # Step 3: Get Threads username
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
        else:
            print(f"[Threads OAuth] Profile fetch failed {profile_resp.status_code}: {profile_resp.text[:200]}")

    user.threads_access_token = long_token
    user.threads_user_id = threads_user_id
    user.threads_username = username
    db.commit()

    print(f"[Threads OAuth] Connected: user_id={user.id}, threads_username={username}")
    return RedirectResponse(f"{frontend}/settings?connected=true&username={username}")


@router.delete("/disconnect")
async def disconnect(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    current_user.threads_access_token = None
    current_user.threads_user_id = None
    current_user.threads_username = None
    db.commit()
    return {"ok": True}


@router.post("/data-deletion")
async def data_deletion(request: Request, db: Session = Depends(get_db)):
    """Meta required data deletion callback."""
    try:
        body = await request.json()
        threads_user_id = body.get("user_id", "")
        if threads_user_id:
            user = db.query(User).filter(User.threads_user_id == threads_user_id).first()
            if user:
                user.threads_access_token = None
                user.threads_user_id = None
                user.threads_username = None
                db.commit()
    except Exception:
        pass
    return {"status": "ok"}
