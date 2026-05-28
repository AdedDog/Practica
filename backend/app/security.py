"""
Безопасность: хеши, пароли, JWT, генерация кодов.

Главное правило: пароли и одноразовые коды в БД НЕ храним открытым текстом.
"""

import hashlib
import re
import secrets
import string
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.config import settings

# Регулярные выражения для простой валидации email и телефона
PHONE_RE = re.compile(r"^\+?[0-9]{10,15}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def hash_password(password: str) -> str:
    """bcrypt — медленный алгоритм, устойчивый к подбору пароля."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def hash_code(code: str) -> str:
    """Хеш кода приглашения (в БД только hash, не DEMO-INVITE)."""
    return hashlib.sha256(code.strip().upper().encode()).hexdigest()


def hash_otp(code: str) -> str:
    """Хеш 6-значного OTP для двухфакторного входа."""
    return hashlib.sha256(code.strip().encode()).hexdigest()


def verify_password(plain: str, hashed: str) -> bool:
    """Сравнивает введённый пароль с хешем из БД."""
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def verify_otp_code(plain: str, hashed: str) -> bool:
    """Проверка OTP: хешируем ввод и сравниваем с записью в otp_tokens."""
    return hash_otp(plain) == hashed


def generate_otp(length: int = 6) -> str:
    """Случайный цифровой код для 2FA."""
    return "".join(secrets.choice(string.digits) for _ in range(length))


def create_access_token(subject_id: int, role: str) -> str:
    """
    JWT-токен после успешного OTP.

    subject_id — id команды или админа
    role — "team" или "admin" (чтобы нельзя было подменить роль)
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": str(subject_id), "role": role, "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def decode_access_token(token: str) -> dict | None:
    """Расшифровка JWT; при ошибке или истечении срока — None."""
    try:
        return jwt.decode(token, settings.secret_key, algorithms=["HS256"])
    except JWTError:
        return None


def generate_team_login() -> str:
    """Уникальный логин при регистрации, например team-a1b2c3d4."""
    return f"team-{secrets.token_hex(4)}"


def generate_invite_code(length: int = 10) -> str:
    """Случайный код приглашения для админки (буквы + цифры)."""
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def generate_team_password(length: int = 10) -> str:
    """Временный пароль — показываем пользователю один раз после регистрации."""
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def validate_email(email: str) -> bool:
    return bool(EMAIL_RE.match(email.strip()))


def validate_phone(phone: str) -> bool:
    clean = phone.strip().replace(" ", "").replace("-", "")
    return bool(PHONE_RE.match(clean))
