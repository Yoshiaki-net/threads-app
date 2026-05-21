from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import UserSettings, User
from auth import get_current_user
import httpx

router = APIRouter(prefix="/api/settings", tags=["settings"])

class SettingsUpdate(BaseModel):
    discord_webhook_url: Optional[str] = None
    buzz_likes_threshold: Optional[int] = None
    buzz_multiplier: Optional[float] = None
    monitor_interval_minutes: Optional[int] = None
    notifications_enabled: Optional[bool] = None
    email_notifications_enabled: Optional[bool] = None
    notification_email: Optional[str] = None
    weekly_report_enabled: Optional[bool] = None

def get_or_create_settings(user_id: int, db: Session) -> UserSettings:
    s = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if not s:
        s = UserSettings(user_id=user_id)
        db.add(s)
        db.commit()
        db.refresh(s)
    return s

@router.get("/")
async def get_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_or_create_settings(current_user.id, db)

@router.put("/")
async def update_settings(data: SettingsUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = get_or_create_settings(current_user.id, db)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(s, field, value)
    db.commit()
    db.refresh(s)
    return s

@router.post("/test-discord")
async def test_discord(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = get_or_create_settings(current_user.id, db)
    if not s.discord_webhook_url:
        raise HTTPException(status_code=400, detail="Discord Webhook URLが設定されていません")
    embed = {
        "title": "✅ テスト通知",
        "description": "Threads自動化ツールからのテスト通知です。設定が正常に完了しています！",
        "color": 0x1E3464,
        "footer": {"text": "AIマスターラボ Threads Auto"},
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(s.discord_webhook_url, json={"embeds": [embed]})
        if resp.status_code not in (200, 204):
            raise HTTPException(status_code=400, detail="Discord通知の送信に失敗しました")
    return {"ok": True}

@router.post("/test-email")
async def test_email(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from services.email_service import send_email
    s = get_or_create_settings(current_user.id, db)
    email = s.notification_email or current_user.email
    ok = await send_email(email, "✅ テストメール", "<h2>テストメール</h2><p>メール通知の設定が完了しています！</p>")
    if not ok:
        raise HTTPException(status_code=400, detail="メール送信に失敗しました。SMTP設定を確認してください")
    return {"ok": True}
