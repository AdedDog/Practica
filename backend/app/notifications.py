"""
Отправка email и SMS.

DEV_LOG_OTP=true — письма не уходят в SMTP, только в консоль uvicorn.
DEV_LOG_OTP=false + SMTP — реальная отправка; статус и текст дублируются в консоль.
"""

import logging
import smtplib
from email.message import EmailMessage

from app.config import settings

logger = logging.getLogger(__name__)

_LOG_PREFIX = "[IT-Kub Email]"


def _console(msg: str) -> None:
    """Явный вывод в консоль uvicorn (всегда виден, не зависит от уровня logging)."""
    print(f"{_LOG_PREFIX} {msg}", flush=True)


def _console_body(to: str, subject: str, body: str) -> None:
    _console(f"Кому: {to}")
    _console(f"Тема: {subject}")
    print(f"{_LOG_PREFIX} --- текст письма ---\n{body}\n{_LOG_PREFIX} --- конец ---\n", flush=True)


def otp_delivery_hint() -> str:
    if settings.sends_otp_email:
        return "Код отправлен на email (если не пришёл — проверьте «Спам» и консоль backend)."
    return "Код отправлен. При локальной разработке смотрите консоль backend (uvicorn)."


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
        _console(f"Подключение SMTP {settings.smtp_host}:{port} ({mode})…")
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
            _console(f"SMTP OK — письмо принято сервером ({settings.smtp_host}:{port})")
            logger.info("Письмо отправлено (%s:%s): %s", settings.smtp_host, port, msg["To"])
            return
        except (TimeoutError, OSError, smtplib.SMTPException) as exc:
            last_error = exc
            _console(f"SMTP ошибка {settings.smtp_host}:{port} ({mode}): {exc}")
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
    _console("——— отправка письма ———")
    _console(
        f"режим: DEV_LOG_OTP={settings.dev_log_otp}, "
        f"SMTP={'да' if settings.smtp_configured else 'нет'} "
        f"({settings.smtp_user or 'SMTP_USER не задан'})"
    )

    if settings.dev_log_otp:
        _console("Пропуск SMTP — только консоль (DEV_LOG_OTP=true)")
        _console_body(to, subject, body)
        return

    if not settings.smtp_configured:
        _console("SMTP не настроен — только консоль")
        _console_body(to, subject, body)
        return

    from_addr = settings.smtp_from or settings.smtp_user
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to
    msg.set_content(body)

    _console(f"От: {from_addr} → Кому: {to}, тема: «{subject}»")

    try:
        _deliver_smtp(msg)
        _console(f"Готово: письмо отправлено на {to}")
        _console_body(to, subject, body)
    except Exception as exc:
        _console(f"ОШИБКА отправки на {to}: {exc}")
        logger.exception("Ошибка SMTP при отправке на %s", to)
        if settings.smtp_fallback_console:
            _console("Дубликат в консоль (SMTP_FALLBACK_CONSOLE=true)")
            _console_body(to, subject, body)
            return
        raise RuntimeError(f"Не удалось отправить письмо на {to}: {exc}") from exc


def registration_delivery_hint() -> str:
    if settings.dev_log_otp or not settings.smtp_configured:
        return "Данные для входа продублированы в консоли backend (uvicorn)."
    return "Данные для входа также отправлены на email команды."


def send_team_registration_email(
    to: str,
    *,
    event_title: str,
    case_name: str,
    team_name: str,
    captain_name: str,
    invite_code: str,
    login: str,
    password: str,
) -> None:
    """Письмо после регистрации: код приглашения и учётные данные кабинета."""
    _console(f"Регистрация команды «{team_name}» → письмо на {to}")
    body = (
        f"Здравствуйте, {captain_name}!\n\n"
        f"Команда «{team_name}» зарегистрирована на мероприятие «{event_title}».\n"
        f"Кейс: {case_name}\n\n"
        f"Код приглашения: {invite_code}\n\n"
        f"Логин для личного кабинета: {login}\n"
        f"Пароль: {password}\n\n"
        "Сохраните эти данные — пароль больше не показывается на сайте.\n"
        "Для входа потребуется одноразовый код из письма (OTP).\n"
    )
    send_email(to, f"Регистрация на «{event_title}» — IT-Куб", body)


def send_sms(phone: str, body: str) -> None:
    """Отправка SMS (пока только вывод в консоль)."""
    _console(f"SMS → {phone}")
    print(f"{body}\n", flush=True)
