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

def get_or_create_settings(user_id: int, db: Session) -> UserSettings:
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if not settings:
        settings = UserSettings(user_id=user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.get("/")
async def get_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_or_create_settings(current_user.id, db)

@router.put("/")
async def update_settings(data: SettingsUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    settings = get_or_create_settings(current_user.id, db)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(settings, field, value)
    db.commit()
    db.refresh(settings)
    return settings

@router.post("/test-discord")
async def test_discord(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    settings = get_or_create_settings(current_user.id, db)
    if not settings.discord_webhook_url:
        raise HTTPException(status_code=400, detail="Discord Webhook URLが設定されていません")

    embed = {
        "title": "✅ テスト通知",
        "description": "Threads自動化ツールからのテスト通知です。設定が正常に完了しています！",
        "color": 0x1E3464,
        "footer": {"text": "AIマスターラボ Threads Auto"},
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(settings.discord_webhook_url, json={"embeds": [embed]})
        if resp.status_code not in (200, 204):
            raise HTTPException(status_code=400, detail="Discord通知の送信に失敗しました")
    return {"ok": True}
