"""
Настройки приложения.

Читаются из файла .env (см. .env.example).
Pydantic автоматически подставляет типы и значения по умолчанию.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Путь к SQLite; файл появится в backend/data/app.db
    database_url: str = "sqlite+aiosqlite:///./data/app.db"

    # Секрет для подписи JWT-токенов (на проде — длинная случайная строка!)
    secret_key: str = "dev-secret-for-local-only"

    # Сколько минут живёт токен после входа (логин + OTP)
    access_token_expire_minutes: int = 480

    # OTP: срок жизни, макс. число неверных попыток
    otp_expire_minutes: int = 10
    otp_max_attempts: int = 5

    # True = коды печатаются в консоль вместо реальной почты/SMS
    dev_log_otp: bool = True

    # Демо-админ создаётся в seed.py при первом запуске
    admin_email: str = "admin@itkub.local"
    admin_password: str = "admin123"
    admin_phone: str = "+79001234567"


# Один объект на всё приложение — импортируем как: from app.config import settings
settings = Settings()
