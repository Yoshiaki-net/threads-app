from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    threads_app_id: str = ""
    threads_app_secret: str = ""
    threads_access_token: str = ""
    anthropic_api_key: str = ""
    discord_webhook_url: str = ""
    buzz_likes_threshold: int = 500
    buzz_multiplier: float = 3.0
    database_url: str = "sqlite:///./threads_app.db"
    frontend_url: str = "http://localhost:3000"
    backend_url: str = "http://localhost:8000"
    allowed_origins: str = "http://localhost:3000"
    admin_email: str = ""
    invite_only: bool = False
    smtp_host: str = ""
    smtp_port: str = "465"
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    class Config:
        env_file = ".env"

settings = Settings()
