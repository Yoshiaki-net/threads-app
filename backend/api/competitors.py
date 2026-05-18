from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import Competitor, CompetitorPost, User
from services.threads_client import ThreadsClient
from auth import get_current_user

router = APIRouter(prefix="/api/competitors", tags=["competitors"])

class CompetitorCreate(BaseModel):
    username: str
    threads_user_id: str = ""

class CompetitorResponse(BaseModel):
    id: int
    threads_user_id: str
    username: str
    display_name: Optional[str]
    followers_count: int
    avg_likes_7d: float
    is_active: bool

    class Config:
        from_attributes = True

@router.get("/", response_model=list[CompetitorResponse])
async def list_competitors(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Competitor).filter(Competitor.user_id == current_user.id).all()

@router.post("/", response_model=CompetitorResponse)
async def add_competitor(data: CompetitorCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    count = db.query(Competitor).filter(Competitor.is_active == True, Competitor.user_id == current_user.id).count()
    if count >= 10:
        raise HTTPException(status_code=400, detail="競合アカウントは最大10件まで登録できます")

    existing = db.query(Competitor).filter(Competitor.username == data.username, Competitor.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="このアカウントは既に登録されています")

    # Threads APIはユーザー名での他ユーザー検索不可のため手動登録
    threads_uid = data.threads_user_id if data.threads_user_id else data.username
    competitor = Competitor(
        threads_user_id=threads_uid,
        username=data.username,
        display_name=data.username,
        followers_count=0,
        user_id=current_user.id,
    )
    db.add(competitor)
    db.commit()
    db.refresh(competitor)
    return competitor

@router.delete("/{competitor_id}")
async def remove_competitor(competitor_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    competitor = db.query(Competitor).filter(Competitor.id == competitor_id, Competitor.user_id == current_user.id).first()
    if not competitor:
        raise HTTPException(status_code=404, detail="Not found")
    competitor.is_active = False
    db.commit()
    return {"ok": True}

@router.get("/{competitor_id}/posts")
async def get_competitor_posts(competitor_id: int, buzz_only: bool = False, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify competitor belongs to current user
    competitor = db.query(Competitor).filter(Competitor.id == competitor_id, Competitor.user_id == current_user.id).first()
    if not competitor:
        raise HTTPException(status_code=404, detail="Not found")
    query = db.query(CompetitorPost).filter(CompetitorPost.competitor_id == competitor_id)
    if buzz_only:
        query = query.filter(CompetitorPost.is_buzz == True)
    posts = query.order_by(CompetitorPost.likes_count.desc()).limit(50).all()
    return posts

@router.get("/buzz/all")
async def get_all_buzz_posts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    posts = (
        db.query(CompetitorPost, Competitor.username)
        .join(Competitor)
        .filter(CompetitorPost.is_buzz == True, Competitor.user_id == current_user.id)
        .order_by(CompetitorPost.likes_count.desc())
        .limit(100)
        .all()
    )
    return [
        {**post.__dict__, "username": username}
        for post, username in posts
    ]
