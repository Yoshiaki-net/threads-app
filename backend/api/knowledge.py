from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import os
import glob
from pathlib import Path
from database import get_db
from models import KnowledgeBase, User
from auth import get_current_user

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])

class KnowledgeCreate(BaseModel):
    title: str
    content: str
    tone: str = "professional"
    topics: str = ""

class KnowledgeUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tone: Optional[str] = None
    topics: Optional[str] = None

@router.get("/")
async def list_knowledge(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(KnowledgeBase).filter(KnowledgeBase.user_id == current_user.id).all()

@router.post("/")
async def create_knowledge(data: KnowledgeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    kb = KnowledgeBase(**data.model_dump(), user_id=current_user.id)
    db.add(kb)
    db.commit()
    db.refresh(kb)
    return kb

@router.put("/{knowledge_id}")
async def update_knowledge(knowledge_id: int, data: KnowledgeUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == knowledge_id, KnowledgeBase.user_id == current_user.id).first()
    if not kb:
        raise HTTPException(status_code=404, detail="Not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(kb, field, value)
    db.commit()
    db.refresh(kb)
    return kb

@router.delete("/{knowledge_id}")
async def delete_knowledge(knowledge_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == knowledge_id, KnowledgeBase.user_id == current_user.id).first()
    if not kb:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(kb)
    db.commit()
    return {"ok": True}

@router.post("/import-obsidian")
async def import_obsidian(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vault_path = Path.home() / "Documents" / "Obsidian Vault" / "よしノウハウナレッジ"
    if not vault_path.exists():
        raise HTTPException(status_code=404, detail=f"Obsidian vaultが見つかりません: {vault_path}")

    imported = []
    skipped = []

    md_files = list(vault_path.rglob("*.md"))

    for md_file in md_files:
        try:
            content = md_file.read_text(encoding="utf-8").strip()
            if not content:
                skipped.append(md_file.name)
                continue

            title = md_file.stem
            relative = md_file.relative_to(vault_path)
            parent = str(relative.parent) if str(relative.parent) != "." else ""
            display_title = f"{parent}/{title}" if parent else title

            existing = db.query(KnowledgeBase).filter(KnowledgeBase.title == display_title, KnowledgeBase.user_id == current_user.id).first()
            if existing:
                existing.content = content
                db.commit()
                imported.append(display_title)
                continue

            kb = KnowledgeBase(
                title=display_title,
                content=content,
                tone="professional",
                topics="",
                user_id=current_user.id,
            )
            db.add(kb)
            db.commit()
            imported.append(display_title)
        except Exception as e:
            skipped.append(f"{md_file.name} ({e})")

    return {"imported": len(imported), "skipped": len(skipped), "titles": imported}
