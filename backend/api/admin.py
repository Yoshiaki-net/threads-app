from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import User, Post, KnowledgeBase, Competitor, InviteCode
from auth import get_current_user, hash_password
from datetime import datetime
import secrets

router = APIRouter(prefix="/api/admin", tags=["admin"])

def require_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    return current_user

@router.get("/users")
async def list_users(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    result = []
    for u in users:
        post_count = db.query(func.count(Post.id)).filter(Post.user_id == u.id).scalar()
        knowledge_count = db.query(func.count(KnowledgeBase.id)).filter(KnowledgeBase.user_id == u.id).scalar()
        competitor_count = db.query(func.count(Competitor.id)).filter(Competitor.user_id == u.id).scalar()
        published_count = db.query(func.count(Post.id)).filter(Post.user_id == u.id, Post.status == 'published').scalar()
        result.append({
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "is_active": u.is_active,
            "is_admin": u.is_admin,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
            "threads_connected": bool(u.threads_access_token),
            "threads_username": u.threads_username or "",
            "post_count": post_count,
            "published_count": published_count,
            "knowledge_count": knowledge_count,
            "competitor_count": competitor_count,
        })
    return result

@router.get("/stats")
async def get_stats(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    total_users = db.query(func.count(User.id)).scalar()
    total_posts = db.query(func.count(Post.id)).scalar()
    published_posts = db.query(func.count(Post.id)).filter(Post.status == 'published').scalar()
    total_knowledge = db.query(func.count(KnowledgeBase.id)).scalar()
    return {
        "total_users": total_users,
        "total_posts": total_posts,
        "published_posts": published_posts,
        "total_knowledge": total_knowledge,
    }

@router.patch("/users/{user_id}/toggle-admin")
async def toggle_admin(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="自分のadmin権限は変更できません")
    user.is_admin = not user.is_admin
    db.commit()
    return {"id": user.id, "is_admin": user.is_admin}

@router.patch("/users/{user_id}/toggle-active")
async def toggle_active(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="自分のアカウントは変更できません")
    user.is_active = not user.is_active
    db.commit()
    return {"id": user.id, "is_active": user.is_active}

@router.patch("/users/{user_id}/reset-password")
async def reset_password(user_id: int, body: dict, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    new_password = body.get("password", "")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="パスワードは6文字以上にしてください")
    user.hashed_password = hash_password(new_password)
    db.commit()
    return {"message": "パスワードをリセットしました"}

@router.delete("/users/{user_id}")
async def delete_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="自分のアカウントは削除できません")
    db.delete(user)
    db.commit()
    return {"message": "削除しました"}

# Invite codes
@router.post("/invites")
async def create_invite(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    code = secrets.token_urlsafe(16)
    invite = InviteCode(code=code, created_by=admin.id)
    db.add(invite)
    db.commit()
    db.refresh(invite)
    return {"code": invite.code, "id": invite.id, "used": invite.used}

@router.get("/invites")
async def list_invites(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    invites = db.query(InviteCode).order_by(InviteCode.created_at.desc()).all()
    return [{"id": i.id, "code": i.code, "used": i.used,
             "used_by_email": db.query(User.email).filter(User.id == i.used_by).scalar() if i.used_by else None,
             "created_at": i.created_at.isoformat()} for i in invites]

@router.delete("/invites/{invite_id}")
async def delete_invite(invite_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    invite = db.query(InviteCode).filter(InviteCode.id == invite_id).first()
    if not invite:
        raise HTTPException(status_code=404, detail="招待コードが見つかりません")
    db.delete(invite)
    db.commit()
    return {"message": "削除しました"}
