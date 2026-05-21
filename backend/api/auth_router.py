from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import User, InviteCode
from auth import hash_password, verify_password, create_access_token, get_current_user
from core.config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str = ""
    invite_code: str = ""

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/register")
async def register(data: RegisterRequest, db: Session = Depends(get_db)):
    # Invite-only check
    if settings.invite_only:
        if not data.invite_code:
            raise HTTPException(status_code=400, detail="招待コードが必要です")
        invite = db.query(InviteCode).filter(
            InviteCode.code == data.invite_code,
            InviteCode.used == False
        ).first()
        if not invite:
            raise HTTPException(status_code=400, detail="招待コードが無効または使用済みです")

    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="このメールアドレスは既に登録されています")

    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        name=data.name or data.email.split("@")[0],
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Mark invite as used
    if settings.invite_only and data.invite_code:
        invite.used = True
        invite.used_by = user.id
        db.commit()

    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "user": {"id": user.id, "email": user.email, "name": user.name, "is_admin": user.is_admin}}

@router.post("/login")
async def login(data: LoginRequest, db: Session = Depends(get_db)):
    from datetime import datetime
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="メールアドレスまたはパスワードが正しくありません")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="このアカウントは無効化されています")
    user.last_login_at = datetime.utcnow()
    db.commit()
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "user": {"id": user.id, "email": user.email, "name": user.name, "is_admin": user.is_admin}}

@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email, "name": current_user.name, "is_admin": current_user.is_admin}

@router.get("/invite-only")
async def invite_only_status():
    return {"invite_only": settings.invite_only}

@router.get("/me/threads-status")
async def threads_status(current_user: User = Depends(get_current_user)):
    return {
        "connected": bool(current_user.threads_access_token),
        "username": current_user.threads_username or "",
        "user_id": current_user.threads_user_id or "",
    }

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

class ProfileUpdateRequest(BaseModel):
    name: str

@router.patch("/password")
async def change_password(data: PasswordChangeRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="現在のパスワードが正しくありません")
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="パスワードは8文字以上にしてください")
    current_user.hashed_password = hash_password(data.new_password)
    db.commit()
    return {"ok": True}

@router.patch("/profile")
async def update_profile(data: ProfileUpdateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="名前を入力してください")
    current_user.name = data.name.strip()
    db.commit()
    return {"id": current_user.id, "email": current_user.email, "name": current_user.name, "is_admin": current_user.is_admin}
