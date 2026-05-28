"""
Отправка email и SMS.

В учебном проекте (DEV_LOG_OTP=true) ничего не уходит наружу —
коды печатаются в консоль, где запущен uvicorn.
На реальном сервере сюда можно подключить SMTP или SMS-провайдера.
"""

from app.config import settings


def send_email(to: str, subject: str, body: str) -> None:
    """Отправка письма с OTP или уведомлением."""
    if settings.dev_log_otp:
        print(f"\n>>> EMAIL → {to}\nТема: {subject}\n{body}\n")


def send_sms(phone: str, body: str) -> None:
    """Отправка SMS (в dev-режиме — тоже в консоль)."""
    if settings.dev_log_otp:
        print(f"\n>>> SMS → {phone}\n{body}\n")
