from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import Post, KnowledgeBase, User, Competitor
from services.ai_service import generate_post, generate_similar_post, analyze_competitor_post
from auth import get_current_user

router = APIRouter(prefix="/api/posts", tags=["posts"])

class PostCreate(BaseModel):
    content: str
    tags: str = ""

class GenerateRequest(BaseModel):
    knowledge_id: int
    custom_prompt: str = ""

class SimilarRequest(BaseModel):
    post_id: int
    knowledge_id: int

@router.get("/")
async def list_posts(status: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Post).filter(Post.user_id == current_user.id)
    if status:
        query = query.filter(Post.status == status)
    return query.order_by(Post.created_at.desc()).limit(100).all()

@router.post("/")
async def create_post(data: PostCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = Post(content=data.content, tags=data.tags, user_id=current_user.id)
    db.add(post)
    db.commit()
    db.refresh(post)
    return post

@router.delete("/{post_id}")
async def delete_post(post_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = db.query(Post).filter(Post.id == post_id, Post.user_id == current_user.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(post)
    db.commit()
    return {"ok": True}

@router.post("/generate")
async def generate(data: GenerateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == data.knowledge_id, KnowledgeBase.user_id == current_user.id).first()
    if not kb:
        raise HTTPException(status_code=404, detail="KnowledgeBase not found")

    content = generate_post(
        knowledge_content=kb.content,
        tone=kb.tone,
        topics=kb.topics,
        prompt=data.custom_prompt,
    )
    post = Post(content=content, knowledge_base_id=kb.id, user_id=current_user.id)
    db.add(post)
    db.commit()
    db.refresh(post)
    return post

@router.post("/{post_id}/similar")
async def generate_similar(post_id: int, data: SimilarRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    original = db.query(Post).filter(Post.id == post_id, Post.user_id == current_user.id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Post not found")

    kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == data.knowledge_id, KnowledgeBase.user_id == current_user.id).first()
    if not kb:
        raise HTTPException(status_code=404, detail="KnowledgeBase not found")

    content = generate_similar_post(
        original_post=original.content,
        knowledge_content=kb.content,
        tone=kb.tone,
    )
    new_post = Post(content=content, knowledge_base_id=kb.id, source_post_id=post_id, user_id=current_user.id)
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return new_post

@router.post("/analyze-competitor")
async def analyze_competitor(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post_text = payload.get("text", "")
    if not post_text:
        raise HTTPException(status_code=400, detail="text is required")
    analysis = analyze_competitor_post(post_text)
    return {"analysis": analysis}

@router.get("/analytics")
async def get_analytics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from sqlalchemy import func
    from datetime import datetime, timedelta

    # Top posts by likes
    top_posts = (
        db.query(Post)
        .filter(Post.user_id == current_user.id, Post.status == "published", Post.likes_count > 0)
        .order_by(Post.likes_count.desc())
        .limit(10)
        .all()
    )

    # Status breakdown
    status_counts = (
        db.query(Post.status, func.count(Post.id))
        .filter(Post.user_id == current_user.id)
        .group_by(Post.status)
        .all()
    )

    # Posts per week (last 8 weeks)
    weeks = []
    for i in range(7, -1, -1):
        week_start = datetime.utcnow() - timedelta(weeks=i+1)
        week_end = datetime.utcnow() - timedelta(weeks=i)
        count = db.query(func.count(Post.id)).filter(
            Post.user_id == current_user.id,
            Post.created_at >= week_start,
            Post.created_at < week_end,
        ).scalar()
        label = f"{week_start.month}/{week_start.day}"
        weeks.append({"week": label, "count": count or 0})

    # Total stats
    total_posts = db.query(func.count(Post.id)).filter(Post.user_id == current_user.id).scalar()
    total_published = db.query(func.count(Post.id)).filter(Post.user_id == current_user.id, Post.status == "published").scalar()
    total_likes = db.query(func.sum(Post.likes_count)).filter(Post.user_id == current_user.id).scalar() or 0
    total_competitors = db.query(func.count(Competitor.id)).filter(Competitor.user_id == current_user.id, Competitor.is_active == True).scalar()

    return {
        "top_posts": [{"content": p.content[:50] + "..." if len(p.content) > 50 else p.content, "likes": p.likes_count} for p in top_posts],
        "status_counts": [{"status": s, "count": c} for s, c in status_counts],
        "weekly_posts": weeks,
        "summary": {
            "total_posts": total_posts,
            "total_published": total_published,
            "total_likes": total_likes,
            "total_competitors": total_competitors,
        }
    }
