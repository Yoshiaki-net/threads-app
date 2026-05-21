# インスタ分析アプリ 開発議事録・設計書
> Threads自動化ツールの開発記録をもとに、Instagram版として再現するための完全ガイド

---

## 📋 目次
1. [アプリ概要](#アプリ概要)
2. [技術スタック](#技術スタック)
3. [システム構成](#システム構成)
4. [ディレクトリ構造](#ディレクトリ構造)
5. [バックエンド実装](#バックエンド実装)
6. [フロントエンド実装](#フロントエンド実装)
7. [デプロイ設定](#デプロイ設定)
8. [環境変数一覧](#環境変数一覧)
9. [実装した機能一覧](#実装した機能一覧)
10. [Instagram版への変更点](#instagram版への変更点)

---

## アプリ概要

**Threads自動化ツール（AIマスターラボ）**として構築。
Instagram版では同じ構成で「競合Instagramアカウントの分析・AI投稿生成」ツールとして再現する。

### 主要機能
- 競合アカウントのフォロワー推移・エンゲージメント追跡
- AIによる投稿文の自動生成（3パターン比較）
- 投稿スケジューラ（指定日時に自動投稿）
- ナレッジベース管理（自分のノウハウをAIに学習）
- 管理者ダッシュボード（ユーザー管理・招待制）
- Discord通知・週次レポート自動生成
- カレンダービューでのスケジュール確認
- パフォーマンス追跡（公開後のいいね数自動取得）

---

## 技術スタック

| 領域 | 技術 |
|------|------|
| **バックエンド** | Python 3.11 / FastAPI |
| **フロントエンド** | Next.js 14 (App Router) / TypeScript |
| **スタイリング** | Tailwind CSS |
| **データベース** | PostgreSQL（本番）/ SQLite（開発） |
| **ORM** | SQLAlchemy |
| **認証** | JWT（python-jose / bcrypt） |
| **AI** | Anthropic Claude API（claude-sonnet-4-6） |
| **スケジューラ** | APScheduler |
| **HTTPクライアント** | httpx（バックエンド）/ axios（フロントエンド） |
| **デプロイ** | Render.com（Blueprint） |
| **DNS** | お名前.com + カスタムドメイン |
| **監視** | UptimeRobot（スリープ防止） |

---

## システム構成

```
[ユーザー]
    ↓ HTTPS
[Render: Frontend (Next.js)]
    ↓ /api/* リバースプロキシ
[Render: Backend (FastAPI)]
    ↓
[Render: PostgreSQL DB]
    ↓
[Anthropic API] [Instagram Graph API] [Discord Webhook]
```

### Renderサービス構成
- **threads-frontend**（Web Service: Node.js）
- **threads-backend**（Web Service: Python）
- **threads-db**（PostgreSQL）

---

## ディレクトリ構造

```
project-root/
├── render.yaml                    # Render Blueprint設定
├── backend/
│   ├── .python-version            # 3.11.9（Renderでのバージョン固定）
│   ├── main.py                    # FastAPIエントリーポイント + マイグレーション
│   ├── database.py                # DB接続（SQLite/PostgreSQL切り替え）
│   ├── models.py                  # SQLAlchemyモデル定義
│   ├── auth.py                    # JWT認証ユーティリティ
│   ├── requirements.txt
│   ├── core/
│   │   └── config.py              # 環境変数設定（pydantic-settings）
│   ├── api/
│   │   ├── auth_router.py         # 認証API（登録・ログイン・パスワード変更）
│   │   ├── competitors.py         # 競合アカウントAPI
│   │   ├── posts.py               # 投稿API（AI生成含む）
│   │   ├── knowledge.py           # ナレッジベースAPI
│   │   ├── scheduler.py           # スケジューラAPI
│   │   ├── user_settings.py       # 通知設定API
│   │   ├── admin.py               # 管理者API
│   │   └── threads_oauth.py       # OAuth認証
│   └── services/
│       ├── ai_service.py          # Claude AI投稿生成
│       ├── threads_client.py      # Threads APIクライアント
│       ├── monitor.py             # 競合監視バッチ
│       ├── scheduler_service.py   # APSchedulerジョブ定義
│       ├── discord_service.py     # Discord通知
│       └── email_service.py       # メール通知（SMTP）
└── frontend/
    ├── .node-version              # 20.18.0（Renderでのバージョン固定）
    ├── next.config.js             # APIリバースプロキシ設定
    ├── tsconfig.json              # パスエイリアス設定
    ├── package.json
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx           # ダッシュボード
        │   ├── login/page.tsx     # ログイン・登録
        │   ├── competitors/page.tsx
        │   ├── posts/page.tsx
        │   ├── knowledge/page.tsx
        │   ├── scheduler/page.tsx
        │   ├── analytics/page.tsx
        │   ├── settings/page.tsx
        │   ├── profile/page.tsx   # プロフィール・パスワード変更
        │   ├── admin/page.tsx     # 管理者ページ
        │   ├── terms/page.tsx
        │   └── privacy/page.tsx
        ├── components/
        │   ├── AppShell.tsx       # 全体レイアウト
        │   ├── Sidebar.tsx        # サイドバーナビ
        │   ├── AuthGuard.tsx      # 認証ガード
        │   ├── Toast.tsx          # トースト通知
        │   └── posts/
        │       └── ThreadsPreview.tsx
        └── lib/
            ├── api.ts             # APIクライアント（axios）
            └── auth.ts            # トークン管理（localStorage）
```

---

## バックエンド実装

### models.py（主要モデル）

```python
# User
class User(Base):
    id, email, hashed_password, name
    is_active, is_admin
    threads_access_token, threads_user_id, threads_username
    created_at, last_login_at

# InviteCode（招待制登録）
class InviteCode(Base):
    id, code, used, used_by, created_by, created_at

# Competitor（競合アカウント）
class Competitor(Base):
    id, threads_user_id, username, display_name
    followers_count, avg_likes_7d
    profile_picture_url, bio
    last_fetched_at, followers_count_updated_at
    is_active, user_id

# CompetitorEngagementHistory（毎日のエンゲージメント記録）
class CompetitorEngagementHistory(Base):
    id, competitor_id, avg_likes, posts_count, followers_count, recorded_at

# CompetitorPost（競合の投稿）
class CompetitorPost(Base):
    id, competitor_id, threads_post_id
    text, likes_count, replies_count, reposts_count
    is_buzz, notified, posted_at, fetched_at

# KnowledgeBase（ナレッジ）
class KnowledgeBase(Base):
    id, title, content, tone, topics, user_id, created_at, updated_at

# Post（自分の投稿）
class Post(Base):
    id, content, status  # draft/scheduled/published/failed
    threads_post_id, knowledge_base_id
    likes_count, replies_count
    scheduled_at, published_at, created_at, user_id

# UserSettings（通知設定）
class UserSettings(Base):
    discord_webhook_url, buzz_likes_threshold, buzz_multiplier
    notifications_enabled, email_notifications_enabled
    notification_email, weekly_report_enabled
```

### マイグレーション戦略
Alembicを使わず、起動時に `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` で差分追加：

```python
# main.py
def run_migrations():
    from sqlalchemy import text
    with engine.connect() as conn:
        stmts = [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE",
            # ... 新しいカラムを追加するたびにここに追記
        ]
        for stmt in stmts:
            try:
                conn.execute(text(stmt))
            except Exception as e:
                print(f"[Migration] {e}")
        conn.commit()
```

### 認証フロー（JWT）

```python
# auth.py
SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"

def create_access_token(data: dict) -> str: ...
def get_current_user(token: str) -> User: ...
def hash_password(password: str) -> str: ...
def verify_password(plain: str, hashed: str) -> bool: ...
```

### AI投稿生成（ai_service.py）

```python
# 単発生成
def generate_post(knowledge_content, tone, topics, prompt="") -> str

# 複数パターン生成（===で区切って返す）
def generate_posts_multi(
    knowledge_content, tone, topics,
    prompt="", style="", buzz_posts=[], count=3
) -> List[str]

# 週次競合レポート
def generate_weekly_report(competitor_data: List[dict]) -> str
```

### スケジューラジョブ

| ジョブ | 実行タイミング |
|--------|-------------|
| 競合投稿チェック | 30分ごと |
| エンゲージメント記録 | 毎日0時 |
| 投稿パフォーマンス更新 | 毎時0分 |
| 週次レポート送信 | 毎週月曜9時 |

---

## フロントエンド実装

### next.config.js（重要：APIプロキシ設定）

```js
const path = require('path')
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias['@'] = path.join(__dirname, 'src')
    return config
  },
  async rewrites() {
    const rawUrl = process.env.BACKEND_URL || 'http://localhost:8000'
    const backendUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`
    return [{ source: '/api/:path*', destination: `${backendUrl}/:path*` }]
  },
}
module.exports = nextConfig
```

> ⚠️ Renderの `fromService.host` はプロトコルなしのホスト名を返すため、`https://` を手動で付与する必要がある

### auth.ts（認証状態管理）

```typescript
// localStorage でトークン・ユーザー情報を管理
export const getToken = () => localStorage.getItem('token')
export const getUser = () => JSON.parse(localStorage.getItem('user') || 'null')
export const saveUser = (user: any) => localStorage.setItem('user', JSON.stringify(user))
export const logout = () => { localStorage.clear(); location.href = '/login' }
```

### ブランドカラー

```
ネイビー: #1E3464
ゴールド: #C9A84C
背景:     #F5F6FA
薄青:     #EEF1F8
薄ゴールド: #FDF8EE
```

---

## デプロイ設定

### render.yaml（Blueprint）

```yaml
databases:
  - name: threads-db
    databaseName: threads_db
    plan: free

services:
  - type: web
    name: threads-backend
    runtime: python
    rootDir: backend
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: threads-db
          property: connectionString
      - key: BACKEND_URL
        fromService:
          name: threads-backend
          type: web
          property: host

  - type: web
    name: threads-frontend
    runtime: node
    rootDir: frontend
    buildCommand: npm install --include=dev && npm run build
    startCommand: npm start
    envVars:
      - key: BACKEND_URL
        fromService:
          name: threads-backend
          type: web
          property: host
```

### バージョン固定（重要）

```
backend/.python-version  → 3.11.9
frontend/.node-version   → 20.18.0
```

---

## 環境変数一覧

### バックエンド

| 変数名 | 説明 | 必須 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL接続文字列 | ✅ |
| `ANTHROPIC_API_KEY` | Claude APIキー | ✅ |
| `BACKEND_URL` | バックエンド自身のURL | ✅ |
| `FRONTEND_URL` | フロントエンドURL | ✅ |
| `ALLOWED_ORIGINS` | CORSオリジン（カンマ区切り） | ✅ |
| `ADMIN_EMAIL` | 起動時に管理者昇格するEmail | 推奨 |
| `INVITE_ONLY` | 招待制フラグ（true/false） | 任意 |
| `THREADS_APP_ID` | Threads APIアプリID | OAuth時 |
| `THREADS_APP_SECRET` | Threads APIシークレット | OAuth時 |
| `SMTP_HOST` | SMTPサーバー（メール通知） | 任意 |
| `SMTP_USER` | SMTPユーザー | 任意 |
| `SMTP_PASSWORD` | SMTPパスワード | 任意 |

### フロントエンド

| 変数名 | 説明 |
|--------|------|
| `BACKEND_URL` | バックエンドURL（RenderのhostまたはフルURL） |

---

## 実装した機能一覧

### 認証・ユーザー管理
- [x] メール/パスワード登録・ログイン
- [x] JWT認証（Bearer token）
- [x] 招待制登録（INVITE_ONLY=true）
- [x] 招待コード生成・管理
- [x] パスワード変更（自分で）
- [x] 管理者によるパスワードリセット
- [x] プロフィール（表示名）編集
- [x] is_admin フラグ
- [x] ADMIN_EMAIL 環境変数で自動昇格

### 競合分析
- [x] 競合アカウント登録（最大10件）
- [x] Threads APIでプロフィール画像・bio自動取得
- [x] 投稿取得・いいね数追跡
- [x] バズ判定（閾値 or 平均の倍率）
- [x] エンゲージメント履歴（毎日スナップショット）
- [x] フォロワー数手動入力
- [x] 前日比トレンド表示
- [x] ミニバーチャート

### AI投稿生成
- [x] ナレッジベース登録（タイトル・内容・トーン・トピック）
- [x] AI投稿生成（1件または3パターン比較）
- [x] スタイル指定（ストーリー/リスト/問いかけ/ノウハウ/意見）
- [x] トーン上書き指定
- [x] 競合バズ投稿を参考データとして活用
- [x] 類似投稿生成
- [x] 競合投稿のAI分析

### 投稿管理
- [x] 下書き保存
- [x] スケジュール投稿（APScheduler）
- [x] カレンダービュー（月表示）
- [x] 公開済み投稿のいいね数自動取得（毎時）
- [x] Threadsプレビュー

### 通知
- [x] Discord Webhook通知（バズ検出時）
- [x] Discord週次競合レポート（毎週月曜9時）
- [x] メール通知（SMTP設定時）

### 管理者機能
- [x] ユーザー一覧・有効化/無効化
- [x] 管理者権限の付与/剥奪
- [x] パスワードリセット
- [x] ユーザー削除
- [x] 招待コード発行・一覧・削除
- [x] 統計ダッシュボード（ユーザー数・投稿数等）

### インフラ
- [x] Render.comデプロイ（Blueprint）
- [x] PostgreSQL自動マイグレーション
- [x] カスタムドメイン（CNAME + SSL自動発行）
- [x] UptimeRobotでスリープ防止
- [x] 利用規約・プライバシーポリシーページ

---

## Instagram版への変更点

### 1. API置き換え

| Threads | Instagram |
|---------|-----------|
| `graph.threads.net` | `graph.instagram.com` または `graph.facebook.com` |
| Threads Graph API | Instagram Graph API / Instagram Basic Display API |
| `threads_access_token` | `instagram_access_token` |
| `threads_user_id` | `instagram_user_id` |
| `threads_biography` | `biography` |
| `threads_profile_picture_url` | `profile_picture_url` |

### 2. Instagram APIエンドポイント

```python
# プロフィール取得
GET https://graph.instagram.com/{user-id}
?fields=id,username,name,profile_picture_url,biography,followers_count,media_count
&access_token={token}

# 投稿取得
GET https://graph.instagram.com/{user-id}/media
?fields=id,caption,like_count,comments_count,timestamp,media_type,thumbnail_url
&limit=20
&access_token={token}

# 投稿作成（Basic Display APIでは不可、Graph APIのみ）
POST https://graph.instagram.com/v18.0/{ig-user-id}/media
POST https://graph.instagram.com/v18.0/{ig-user-id}/media_publish
```

### 3. Instagram OAuth設定

```python
INSTAGRAM_AUTH_URL = "https://api.instagram.com/oauth/authorize"
INSTAGRAM_TOKEN_URL = "https://api.instagram.com/oauth/access_token"
SCOPES = "instagram_basic,instagram_content_publish,instagram_manage_insights"
```

### 4. バズ判定の変更
InstagramはThreadsより「いいね数」が多い傾向があるため閾値を調整：
```python
buzz_likes_threshold: int = 1000  # Threadsは500
```

### 5. メディアタイプ対応
Instagramは画像・動画・カルーセルがあるため投稿モデルに追加：
```python
media_type = Column(String, default="TEXT")  # IMAGE/VIDEO/CAROUSEL_ALBUM
media_url = Column(String, nullable=True)
thumbnail_url = Column(String, nullable=True)
```

### 6. フロントエンドの変更
- 「Threads投稿プレビュー」→「Instagramプレビュー」コンポーネント
- 画像アップロードUI追加
- `threads_` プレフィックスを `instagram_` に変更

### 7. ファイル名変更
```
threads_client.py    → instagram_client.py
threads_oauth.py     → instagram_oauth.py
ThreadsPreview.tsx   → InstagramPreview.tsx
```

---

## 開発の流れ（時系列）

1. **基盤構築**: FastAPI + Next.js + SQLAlchemy + JWT認証
2. **競合分析機能**: Threads APIでの投稿取得・バズ判定
3. **AI投稿生成**: Claude APIとナレッジベースの連携
4. **スケジューラ**: APSchedulerでの自動投稿
5. **Render デプロイ**: Blueprint設定、PostgreSQL移行
6. **管理者機能**: ユーザー管理・招待制
7. **OAuth**: Threads認証フロー
8. **カスタムドメイン**: CNAME設定 + SSL
9. **競合機能強化**: プロフィール画像・エンゲージメント履歴・ミニチャート
10. **AI強化**: 3パターン生成・スタイル指定・バズ参照
11. **投稿管理強化**: カレンダービュー・パフォーマンス追跡
12. **ユーザー機能**: プロフィール編集・パスワード変更
13. **通知強化**: 週次レポート自動生成・メール通知基盤
14. **監視**: UptimeRobotでスリープ防止

---

## ハマりやすいポイント（教訓）

| 問題 | 原因 | 解決策 |
|------|------|--------|
| ビルドエラー（Python） | Render デフォルトが3.14 | `backend/.python-version` = `3.11.9` |
| ビルドエラー（Node） | Render デフォルトが24 | `frontend/.node-version` = `20.18.0` |
| `@/lib/api` が見つからない | Linux でパスエイリアスが効かない | webpack alias + tsconfig baseUrl |
| tailwindcss not found | devDependencies がインストールされない | `npm install --include=dev` |
| BACKEND_URL にプロトコルがない | `fromService.host` はホスト名のみ | `https://` を手動付与 |
| CORSエラー | ALLOWED_ORIGINS が間違っている | フロントエンドURLを正確に設定 |
| is_admin が undefined | 古いJWTトークンが残っている | ログアウト→ログインし直す |
| Render Shell が使えない | 無料プラン制限 | ADMIN_EMAIL 環境変数で代替 |
| Meta保存エラー | data_deletion URLが未設定 | `/api/auth/threads/data-deletion` エンドポイントを追加 |
| Renderがスリープする | 無料プランの仕様 | UptimeRobotで5分ごとにping |
