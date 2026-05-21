from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    name = Column(String, default="")
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)
    threads_access_token = Column(String, nullable=True)
    threads_user_id = Column(String, nullable=True)
    threads_username = Column(String, nullable=True)

class InviteCode(Base):
    __tablename__ = "invite_codes"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True)
    used = Column(Boolean, default=False)
    used_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Competitor(Base):
    __tablename__ = "competitors"
    id = Column(Integer, primary_key=True, index=True)
    threads_user_id = Column(String, unique=True, index=True)
    username = Column(String, unique=True)
    display_name = Column(String)
    followers_count = Column(Integer, default=0)
    avg_likes_7d = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    posts = relationship("CompetitorPost", back_populates="competitor")

class CompetitorPost(Base):
    __tablename__ = "competitor_posts"
    id = Column(Integer, primary_key=True, index=True)
    competitor_id = Column(Integer, ForeignKey("competitors.id"))
    threads_post_id = Column(String, unique=True, index=True)
    text = Column(Text)
    likes_count = Column(Integer, default=0)
    replies_count = Column(Integer, default=0)
    reposts_count = Column(Integer, default=0)
    is_buzz = Column(Boolean, default=False)
    notified = Column(Boolean, default=False)
    posted_at = Column(DateTime)
    fetched_at = Column(DateTime, default=datetime.utcnow)
    competitor = relationship("Competitor", back_populates="posts")

class KnowledgeBase(Base):
    __tablename__ = "knowledge_base"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    content = Column(Text)
    tone = Column(String, default="professional")
    topics = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text)
    status = Column(String, default="draft")
    threads_post_id = Column(String, nullable=True)
    knowledge_base_id = Column(Integer, ForeignKey("knowledge_base.id"), nullable=True)
    source_post_id = Column(Integer, ForeignKey("posts.id"), nullable=True)
    likes_count = Column(Integer, default=0)
    replies_count = Column(Integer, default=0)
    scheduled_at = Column(DateTime, nullable=True)
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    tags = Column(Text, default="")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

class UserSettings(Base):
    __tablename__ = "user_settings"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    discord_webhook_url = Column(String, nullable=True)
    buzz_likes_threshold = Column(Integer, default=500)
    buzz_multiplier = Column(Float, default=3.0)
    monitor_interval_minutes = Column(Integer, default=30)
    notifications_enabled = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
