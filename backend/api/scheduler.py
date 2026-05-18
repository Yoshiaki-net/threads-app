from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from database import get_db
from models import Post, User
from services.scheduler_service import schedule_post
from auth import get_current_user

router = APIRouter(prefix="/api/scheduler", tags=["scheduler"])

class ScheduleRequest(BaseModel):
    post_id: int
    scheduled_at: datetime

class ScheduleWithGenerateRequest(BaseModel):
    knowledge_id: int
    scheduled_at: datetime
    custom_prompt: str = ""

@router.post("/schedule")
async def schedule(data: ScheduleRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = db.query(Post).filter(Post.id == data.post_id, Post.user_id == current_user.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.status not in ("draft",):
        raise HTTPException(status_code=400, detail="既にスケジュール済みまたは公開済みです")

    post.status = "scheduled"
    post.scheduled_at = data.scheduled_at
    db.commit()

    schedule_post(post.id, data.scheduled_at)
    return {"ok": True, "post_id": post.id, "scheduled_at": data.scheduled_at}

@router.get("/scheduled")
async def list_scheduled(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    posts = db.query(Post).filter(Post.status == "scheduled", Post.user_id == current_user.id).order_by(Post.scheduled_at).all()
    return posts

@router.delete("/schedule/{post_id}")
async def cancel_schedule(post_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = db.query(Post).filter(Post.id == post_id, Post.user_id == current_user.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Not found")
    post.status = "draft"
    post.scheduled_at = None
    db.commit()
    return {"ok": True}
