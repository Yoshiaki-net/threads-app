import anthropic
from core.config import settings
from typing import Optional

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

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
        messages=[
            {
                "role": "user",
                "content": f"以下の投稿に似た新しい投稿を生成してください:\n\n{original_post}",
            }
        ],
    )
    return message.content[0].text

def analyze_competitor_post(post_text: str) -> str:
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        messages=[
            {
                "role": "user",
                "content": f"以下のThreads投稿がバズった理由を3点で簡潔に分析してください:\n\n{post_text}",
            }
        ],
    )
    return message.content[0].text
