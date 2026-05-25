from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import re
from database import get_db
from models import Competitor, CompetitorPost, CompetitorEngagementHistory, User
from services.threads_client import ThreadsClient
from auth import get_current_user

router = APIRouter(prefix="/api/competitors", tags=["competitors"])


class CompetitorCreate(BaseModel):
    username: str
    threads_user_id: str = ""
    genre: str = ""


class GenreUpdate(BaseModel):
    genre: str


class CompetitorResponse(BaseModel):
    id: int
    threads_user_id: str
    username: str
    display_name: Optional[str]
    followers_count: int
    avg_likes_7d: float
    is_active: bool
    profile_picture_url: Optional[str] = None
    bio: Optional[str] = None
    last_fetched_at: Optional[datetime] = None
    followers_count_updated_at: Optional[datetime] = None
    genre: Optional[str] = ""

    class Config:
        from_attributes = True


class EngagementHistoryResponse(BaseModel):
    avg_likes: float
    posts_count: int
    followers_count: int
    recorded_at: datetime

    class Config:
        from_attributes = True


class FollowersUpdate(BaseModel):
    followers_count: int


async def _fetch_and_update_profile(competitor: Competitor, token: str, db: Session) -> None:
    """Fetch profile info from Threads API and update competitor record."""
    client = ThreadsClient(access_token=token)
    try:
        profile = await client.get_user_profile(competitor.threads_user_id)
        competitor.profile_picture_url = profile.get("threads_profile_picture_url")
        competitor.bio = profile.get("threads_biography")
        if profile.get("name"):
            competitor.display_name = profile["name"]
        elif profile.get("username"):
            competitor.display_name = profile["username"]
    except Exception as e:
        print(f"[Profile fetch] {competitor.username}: {e}")
    finally:
        await client.close()


@router.get("/lookup")
async def lookup_competitor(
    threads_user_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Look up a Threads user profile by user ID."""
    token = current_user.threads_access_token
    if not token:
        return {"error": "Threads未連携"}

    client = ThreadsClient(access_token=token)
    try:
        profile = await client.get_user_profile(threads_user_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"プロフィール取得失敗: {e}")
    finally:
        await client.close()

    return {
        "threads_user_id": profile.get("id", threads_user_id),
        "username": profile.get("username", ""),
        "display_name": profile.get("name", profile.get("username", "")),
        "profile_picture_url": profile.get("threads_profile_picture_url"),
        "bio": profile.get("threads_biography"),
    }


@router.get("/search")
async def search_competitor(
    q: str = Query(..., description="Username (with or without @) or numeric Threads user ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Search a Threads user by username or user ID."""
    token = current_user.threads_access_token
    if not token:
        return {"error": "Threads未連携", "results": [], "hint": "設定ページでThreadsを連携してください"}

    q = q.strip()
    client = ThreadsClient(access_token=token)
    profile = None
    try:
        # If numeric ID → look up directly
        if re.match(r"^\d+$", q):
            try:
                profile = await client.get_user_profile(q)
            except Exception as e:
                print(f"[search] Direct ID lookup failed: {e}")
        else:
            # Username search via web scrape
            profile = await client.search_by_username(q)
    except Exception as e:
        print(f"[search] Error: {e}")
    finally:
        await client.close()

    if not profile or not profile.get("id"):
        return {
            "results": [],
            "message": f"@{q.lstrip('@')} が見つかりませんでした",
            "hint": "ユーザー名が正確か確認するか、ThreadsプロフィールURLの数字（ユーザーID）を入力してください"
        }

    return {
        "results": [{
            "threads_user_id": profile.get("id", ""),
            "username": profile.get("username", q.lstrip("@")),
            "display_name": profile.get("name", profile.get("username", q.lstrip("@"))),
            "profile_picture_url": profile.get("threads_profile_picture_url"),
            "bio": profile.get("threads_biography"),
        }]
    }


@router.get("/", response_model=list[CompetitorResponse])
async def list_competitors(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Competitor).filter(Competitor.user_id == current_user.id).all()


@router.post("/", response_model=CompetitorResponse)
async def add_competitor(
    data: CompetitorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = db.query(Competitor).filter(Competitor.is_active == True, Competitor.user_id == current_user.id).count()
    if count >= 10:
        raise HTTPException(status_code=400, detail="競合アカウントは最大10件まで登録できます")

    existing = db.query(Competitor).filter(
        Competitor.username == data.username, Competitor.user_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="このアカウントは既に登録されています")

    threads_uid = data.threads_user_id if data.threads_user_id else data.username
    competitor = Competitor(
        threads_user_id=threads_uid,
        username=data.username,
        display_name=data.username,
        followers_count=0,
        user_id=current_user.id,
        genre=data.genre or "",
    )
    db.add(competitor)
    db.commit()
    db.refresh(competitor)

    # Auto-fetch profile if user has a Threads token
    token = current_user.threads_access_token
    if token:
        await _fetch_and_update_profile(competitor, token, db)
        competitor.last_fetched_at = datetime.utcnow()
        db.commit()
        db.refresh(competitor)

    return competitor


@router.post("/{competitor_id}/refresh", response_model=CompetitorResponse)
async def refresh_competitor(
    competitor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Re-fetch profile and posts for a competitor using the owner's Threads token."""
    competitor = db.query(Competitor).filter(
        Competitor.id == competitor_id, Competitor.user_id == current_user.id
    ).first()
    if not competitor:
        raise HTTPException(status_code=404, detail="Not found")

    owner = db.query(User).filter(User.id == competitor.user_id).first()
    token = (owner.threads_access_token if owner and owner.threads_access_token else None) or current_user.threads_access_token
    if not token:
        raise HTTPException(status_code=400, detail="Threads未連携")

    # Update profile
    await _fetch_and_update_profile(competitor, token, db)

    # Fetch latest posts
    client = ThreadsClient(access_token=token)
    try:
        data = await client.get_user_threads(competitor.threads_user_id, limit=10)
        posts = data.get("data", [])

        likes_list = [p.get("like_count", 0) for p in posts if p.get("like_count")]
        avg_likes = sum(likes_list) / len(likes_list) if likes_list else competitor.avg_likes_7d
        competitor.avg_likes_7d = avg_likes

        for post_data in posts:
            post_id = post_data["id"]
            existing = db.query(CompetitorPost).filter(CompetitorPost.threads_post_id == post_id).first()
            likes = post_data.get("like_count", 0)
            if existing:
                existing.likes_count = likes
            else:
                posted_at = None
                if ts := post_data.get("timestamp"):
                    posted_at = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                new_post = CompetitorPost(
                    competitor_id=competitor.id,
                    threads_post_id=post_id,
                    text=post_data.get("text", ""),
                    likes_count=likes,
                    replies_count=post_data.get("replies_count", 0),
                    reposts_count=post_data.get("repost_count", 0),
                    is_buzz=False,
                    notified=False,
                    posted_at=posted_at,
                )
                db.add(new_post)
    except Exception as e:
        print(f"[Refresh posts] {competitor.username}: {e}")
    finally:
        await client.close()

    competitor.last_fetched_at = datetime.utcnow()
    db.commit()

    # Record engagement history snapshot
    history = CompetitorEngagementHistory(
        competitor_id=competitor.id,
        avg_likes=competitor.avg_likes_7d,
        posts_count=db.query(CompetitorPost).filter(CompetitorPost.competitor_id == competitor.id).count(),
        followers_count=competitor.followers_count,
        recorded_at=datetime.utcnow(),
    )
    db.add(history)
    db.commit()
    db.refresh(competitor)
    return competitor


@router.get("/{competitor_id}/history", response_model=List[EngagementHistoryResponse])
async def get_engagement_history(
    competitor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    competitor = db.query(Competitor).filter(
        Competitor.id == competitor_id, Competitor.user_id == current_user.id
    ).first()
    if not competitor:
        raise HTTPException(status_code=404, detail="Not found")

    history = (
        db.query(CompetitorEngagementHistory)
        .filter(CompetitorEngagementHistory.competitor_id == competitor_id)
        .order_by(CompetitorEngagementHistory.recorded_at.desc())
        .limit(30)
        .all()
    )
    return history


@router.patch("/{competitor_id}/followers", response_model=CompetitorResponse)
async def update_followers(
    competitor_id: int,
    data: FollowersUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    competitor = db.query(Competitor).filter(
        Competitor.id == competitor_id, Competitor.user_id == current_user.id
    ).first()
    if not competitor:
        raise HTTPException(status_code=404, detail="Not found")

    competitor.followers_count = data.followers_count
    competitor.followers_count_updated_at = datetime.utcnow()
    db.commit()
    db.refresh(competitor)
    return competitor


@router.patch("/{competitor_id}/genre", response_model=CompetitorResponse)
async def update_genre(
    competitor_id: int,
    data: GenreUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    competitor = db.query(Competitor).filter(
        Competitor.id == competitor_id, Competitor.user_id == current_user.id
    ).first()
    if not competitor:
        raise HTTPException(status_code=404, detail="Not found")
    competitor.genre = data.genre
    db.commit()
    db.refresh(competitor)
    return competitor


@router.get("/trending")
async def get_trending(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Return accounts with the highest engagement lift yesterday vs the day before, grouped by genre."""
    competitors = db.query(Competitor).filter(
        Competitor.user_id == current_user.id, Competitor.is_active == True
    ).all()

    now = datetime.utcnow()
    yesterday_start = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_end = now.replace(hour=0, minute=0, second=0, microsecond=0)
    day_before_start = (now - timedelta(days=2)).replace(hour=0, minute=0, second=0, microsecond=0)

    results = []
    for c in competitors:
        # Get yesterday's snapshot (most recent in yesterday window)
        yesterday_snap = (
            db.query(CompetitorEngagementHistory)
            .filter(
                CompetitorEngagementHistory.competitor_id == c.id,
                CompetitorEngagementHistory.recorded_at >= yesterday_start,
                CompetitorEngagementHistory.recorded_at < yesterday_end,
            )
            .order_by(CompetitorEngagementHistory.recorded_at.desc())
            .first()
        )
        # Get day-before snapshot
        day_before_snap = (
            db.query(CompetitorEngagementHistory)
            .filter(
                CompetitorEngagementHistory.competitor_id == c.id,
                CompetitorEngagementHistory.recorded_at >= day_before_start,
                CompetitorEngagementHistory.recorded_at < yesterday_start,
            )
            .order_by(CompetitorEngagementHistory.recorded_at.desc())
            .first()
        )

        current_avg = yesterday_snap.avg_likes if yesterday_snap else c.avg_likes_7d
        prev_avg = day_before_snap.avg_likes if day_before_snap else None

        if prev_avg and prev_avg > 0:
            lift_pct = ((current_avg - prev_avg) / prev_avg) * 100
        else:
            lift_pct = 0.0

        results.append({
            "id": c.id,
            "username": c.username,
            "display_name": c.display_name,
            "profile_picture_url": c.profile_picture_url,
            "followers_count": c.followers_count,
            "avg_likes_7d": c.avg_likes_7d,
            "current_avg": current_avg,
            "prev_avg": prev_avg,
            "lift_pct": round(lift_pct, 1),
            "genre": c.genre or "その他",
        })

    # Sort by lift descending
    results.sort(key=lambda x: x["lift_pct"], reverse=True)

    # Group by genre, keep top 5 per genre
    grouped: dict = {}
    for r in results:
        genre = r["genre"] or "その他"
        if genre not in grouped:
            grouped[genre] = []
        if len(grouped[genre]) < 5:
            grouped[genre].append(r)

    return {"trending": results[:10], "by_genre": grouped}


@router.delete("/{competitor_id}")
async def remove_competitor(
    competitor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    competitor = db.query(Competitor).filter(
        Competitor.id == competitor_id, Competitor.user_id == current_user.id
    ).first()
    if not competitor:
        raise HTTPException(status_code=404, detail="Not found")
    competitor.is_active = False
    db.commit()
    return {"ok": True}


@router.get("/{competitor_id}/posts")
async def get_competitor_posts(
    competitor_id: int,
    buzz_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    competitor = db.query(Competitor).filter(
        Competitor.id == competitor_id, Competitor.user_id == current_user.id
    ).first()
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
