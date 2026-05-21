import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from core.config import settings


async def send_email(to: str, subject: str, html: str) -> bool:
    """メール送信。SMTP設定がない場合はスキップ。"""
    if not settings.smtp_host or not settings.smtp_user or not settings.smtp_password:
        print(f"[Email] SMTP未設定のためスキップ: {subject} → {to}")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.smtp_from or settings.smtp_user
        msg["To"] = to
        msg.attach(MIMEText(html, "html", "utf-8"))

        with smtplib.SMTP_SSL(settings.smtp_host, int(settings.smtp_port)) as server:
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(msg["From"], to, msg.as_string())
        print(f"[Email] 送信成功: {subject} → {to}")
        return True
    except Exception as e:
        print(f"[Email] 送信失敗: {e}")
        return False


async def send_buzz_email(to: str, competitor_username: str, post_text: str, likes: int) -> bool:
    subject = f"🔥 バズ投稿検出: @{competitor_username} ({likes}いいね)"
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2 style="color:#1E3464">🔥 バズ投稿を検出しました</h2>
      <p><strong>アカウント:</strong> @{competitor_username}</p>
      <p><strong>いいね数:</strong> {likes:,}</p>
      <div style="background:#FDF8EE;border-left:4px solid #C9A84C;padding:15px;margin:15px 0;border-radius:4px">
        <p style="margin:0;white-space:pre-wrap">{post_text}</p>
      </div>
      <p style="color:#888;font-size:12px">AIマスターラボ 競合モニタリング</p>
    </div>
    """
    return await send_email(to, subject, html)


async def send_weekly_report_email(to: str, report: str) -> bool:
    subject = "📊 週次競合レポート"
    report_html = report.replace("\n", "<br>").replace("## ", "<h2>").replace("### ", "<h3>")
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h1 style="color:#1E3464">📊 週次競合レポート</h1>
      <div style="line-height:1.8">{report_html}</div>
      <p style="color:#888;font-size:12px;margin-top:30px">AIマスターラボ 自動レポート</p>
    </div>
    """
    return await send_email(to, subject, html)
