"""
Отправка email и SMS.

DEV_LOG_OTP=true — коды только в консоль uvicorn.
DEV_LOG_OTP=false + SMTP_USER/SMTP_PASSWORD — реальная почта через Gmail SMTP.
"""

import logging
import smtplib
from email.message import EmailMessage

from app.config import settings

logger = logging.getLogger(__name__)


def otp_delivery_hint() -> str:
    if settings.sends_otp_email:
        return "Код отправлен на email (если не пришёл — проверьте «Спам» и консоль backend)."
    return "Код отправлен. При локальной разработке смотрите консоль backend (uvicorn)."


def _log_otp_to_console(channel: str, destination: str, body: str, *, subject: str | None = None) -> None:
    header = f"\n>>> {channel} → {destination}\n"
    if subject:
        header += f"Тема: {subject}\n"
    print(f"{header}{body}\n")


def _smtp_attempts() -> list[tuple[str, int]]:
    """Порядок попыток: сначала порт из .env, затем запасной 465 SSL для Gmail."""
    port = settings.smtp_port
    if port == 465:
        return [("ssl", 465)]
    if port == 587:
        return [("starttls", 587), ("ssl", 465)]
    return [("starttls", port)]


def _deliver_smtp(msg: EmailMessage) -> None:
    login_user = settings.smtp_user
    password = settings.smtp_password
    last_error: Exception | None = None

    for mode, port in _smtp_attempts():
        try:
            if mode == "ssl":
                with smtplib.SMTP_SSL(settings.smtp_host, port, timeout=30) as server:
                    server.login(login_user, password)
                    server.send_message(msg)
            else:
                with smtplib.SMTP(settings.smtp_host, port, timeout=30) as server:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(login_user, password)
                    server.send_message(msg)
            logger.info("Письмо отправлено (%s:%s): %s", settings.smtp_host, port, msg["To"])
            return
        except (TimeoutError, OSError, smtplib.SMTPException) as exc:
            last_error = exc
            logger.warning(
                "SMTP %s:%s (%s) не удалось: %s",
                settings.smtp_host,
                port,
                mode,
                exc,
            )

    assert last_error is not None
    raise last_error


def send_email(to: str, subject: str, body: str) -> None:
    """Отправка письма с OTP или уведомлением."""
    if settings.dev_log_otp:
        _log_otp_to_console("EMAIL", to, body, subject=subject)
        return

    if not settings.smtp_configured:
        logger.warning("SMTP не настроен (SMTP_USER/SMTP_PASSWORD), OTP выводится в консоль")
        _log_otp_to_console("EMAIL", to, body, subject=subject)
        return

    from_addr = settings.smtp_from or settings.smtp_user
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to
    msg.set_content(body)

    try:
        _deliver_smtp(msg)
    except Exception as exc:
        logger.exception("Ошибка SMTP при отправке на %s", to)
        if settings.smtp_fallback_console:
            logger.warning("OTP продублирован в консоль (SMTP_FALLBACK_CONSOLE=true)")
            _log_otp_to_console("EMAIL", to, body, subject=subject)
            return
        raise RuntimeError(f"Не удалось отправить письмо на {to}: {exc}") from exc


def send_sms(phone: str, body: str) -> None:
    """Отправка SMS (пока только вывод в консоль)."""
    _log_otp_to_console("SMS", phone, body)
