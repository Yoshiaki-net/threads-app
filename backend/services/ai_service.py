import anthropic
from core.config import settings
from typing import Optional, List

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

STYLE_OPTIONS = {
    "story": "ストーリー型（体験談・エピソードを語る）",
    "list": "リスト型（箇条書きで情報を整理）",
    "question": "問いかけ型（読者に問いかけて共感を誘う）",
    "tips": "ノウハウ型（すぐ使えるTipsを提供）",
    "opinion": "意見型（自分の意見・考えを主張する）",
}

def generate_post(knowledge_content: str, tone: str, topics: str, prompt: str = "") -> str:
    system_prompt = f"""あなたはThreadsの投稿を生成するアシスタントです。
以下のナレッジベースとトーンに従って投稿を生成してください。

【ナレッジベース】
{knowledge_content}

【トーン】
{tone}

【トピック】
{topics}

【ルール】
- 500文字以内で投稿を作成する
- ハッシュタグは3つ以内
- 改行を適切に使用する
- エンゲージメントを高める文章にする
- 投稿文のみ返答する（説明文不要）"""

    user_message = prompt if prompt else "上記のナレッジベースをもとに、魅力的なThreads投稿を1つ生成してください。"
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    return message.content[0].text


def generate_posts_multi(
    knowledge_content: str,
    tone: str,
    topics: str,
    prompt: str = "",
    style: str = "",
    buzz_posts: List[dict] = None,
    count: int = 3,
) -> List[str]:
    """複数パターンの投稿を一度に生成する。"""
    buzz_section = ""
    if buzz_posts:
        buzz_section = "\n\n【バズ投稿の参考例（エンゲージメントが高かった投稿）】\n"
        for i, post in enumerate(buzz_posts[:5], 1):
            text = post.get("text", "")[:200]
            likes = post.get("likes_count", 0)
            buzz_section += f"{i}. ({likes}いいね) {text}\n"

    style_section = ""
    if style and style in STYLE_OPTIONS:
        style_section = f"\n\n【スタイル指定】\n{STYLE_OPTIONS[style]}"

    system_prompt = f"""あなたはThreadsの投稿を生成するアシスタントです。
以下のナレッジベースとトーンに従って、異なるアプローチで{count}つの投稿を生成してください。

【ナレッジベース】
{knowledge_content}

【トーン】
{tone}

【トピック】
{topics}{buzz_section}{style_section}

【ルール】
- 各投稿は500文字以内
- ハッシュタグは3つ以内
- 改行を適切に使用する
- エンゲージメントを高める文章にする
- {count}つの投稿はそれぞれ異なるアプローチで書く（ストーリー型・リスト型・問いかけ型など）
- 各投稿を「===」で区切る
- 投稿文のみ返答する（番号・タイトル・説明文は不要）"""

    user_message = prompt if prompt else f"上記のナレッジベースをもとに、魅力的なThreads投稿を{count}パターン生成してください。各パターンは異なるスタイルで書いてください。"

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=3000,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    text = message.content[0].text
    posts = [p.strip() for p in text.split("===") if p.strip()]
    return posts[:count]


def generate_similar_post(original_post: str, knowledge_content: str, tone: str) -> str:
    system_prompt = f"""あなたはThreadsの投稿を生成するアシスタントです。
以下のナレッジベースとトーンに従って、参考投稿に似た新しい投稿を生成してください。

【ナレッジベース】
{knowledge_content}

【トーン】
{tone}

【ルール】
- 500文字以内
- ハッシュタグは3つ以内
- 参考投稿と同じテーマ・スタイルだが文章は完全に新しくする
- 投稿文のみ返答する（説明文不要）"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=system_prompt,
        messages=[{"role": "user", "content": f"以下の投稿に似た新しい投稿を生成してください:\n\n{original_post}"}],
    )
    return message.content[0].text


def analyze_competitor_post(post_text: str) -> str:
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        messages=[{"role": "user", "content": f"以下のThreads投稿がバズった理由を3点で簡潔に分析してください:\n\n{post_text}"}],
    )
    return message.content[0].text


def generate_weekly_report(competitor_data: List[dict]) -> str:
    """週次競合レポートをAIで生成する。"""
    if not competitor_data:
        return "今週の競合データはありません。"

    competitors_text = ""
    for c in competitor_data:
        competitors_text += f"\n■ @{c['username']}\n"
        competitors_text += f"  平均いいね: {c['avg_likes']:.0f} / 取得投稿数: {c['posts_count']}\n"
        if c.get("buzz_posts"):
            competitors_text += "  バズ投稿:\n"
            for p in c["buzz_posts"][:3]:
                text = p.get("text", "")[:120]
                likes = p.get("likes_count", 0)
                competitors_text += f"  - ({likes}いいね) {text}\n"

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": f"""以下の競合アカウントの過去7日間のデータを分析して、週次レポートを日本語で作成してください。

{competitors_text}

以下の形式でレポートを作成してください:

## 📊 今週の競合トレンドまとめ

### 全体傾向
（全体的な傾向を2〜3文で）

### 🔥 バズった投稿のパターン
（共通点・傾向を箇条書きで）

### 💡 来週の投稿に活かせる示唆
（具体的なアクション提案を3点）

### 注目アカウント
（特に動きが活発だったアカウントとその理由）"""
        }]
    )
    return message.content[0].text
