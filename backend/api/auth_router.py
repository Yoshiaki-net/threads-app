from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import User
from auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str = ""

class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    class Config:
        from_attributes = True

@router.post("/register")
async def register(data: RegisterRequest, db: Session = Depends(get_db)):
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
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "user": {"id": user.id, "email": user.email, "name": user.name}}

@router.post("/login")
async def login(data: LoginRequest, db: Session = Depends(get_db)):
    from datetime import datetime
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="メールアドレスまたはパスワードが正しくありません")
    user.last_login_at = datetime.utcnow()
    db.commit()
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "user": {"id": user.id, "email": user.email, "name": user.name, "is_admin": user.is_admin}}

@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email, "name": current_user.name, "is_admin": current_user.is_admin}

@router.get("/me/threads-status")
async def threads_status(current_user: User = Depends(get_current_user)):
    return {
        "connected": bool(current_user.threads_access_token),
        "username": current_user.threads_username or "",
        "user_id": current_user.threads_user_id or "",
    }
