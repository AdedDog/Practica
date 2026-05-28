"""
Бизнес-логика, которую используют несколько роутеров.

Здесь нет HTTP — только работа с БД и вспомогательные расчёты.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import CaseDirection, Event, InviteCode, OtpChannel, OtpSubject, OtpToken, Team
from app.notifications import send_email, send_sms
from app.security import generate_otp, hash_code, hash_otp, verify_otp_code


async def count_teams_in_case(db: AsyncSession, case_id: int) -> int:
    """Сколько команд уже записано в этот кейс."""
    result = await db.execute(select(func.count()).select_from(Team).where(Team.case_id == case_id))
    return result.scalar() or 0


async def case_to_public(db: AsyncSession, case: CaseDirection) -> dict:
    """
    Собирает данные кейса для API: лимит, занято, свободно, is_full.

    Возвращает dict — его удобно передать в Pydantic-схему CasePublic.
    """
    occupied = await count_teams_in_case(db, case.id)
    free = max(case.team_limit - occupied, 0)
    return {
        "id": case.id,
        "name": case.name,
        "description": case.description,
        "team_limit": case.team_limit,
        "occupied": occupied,
        "free": free,
        "is_full": free == 0,
    }


async def find_valid_invite(db: AsyncSession, event_id: int, code: str) -> InviteCode | None:
    """
    Ищет код приглашения: правильный хеш + ещё не использован (used_at пустой).
    """
    code_hash = hash_code(code)
    result = await db.execute(
        select(InviteCode).where(
            InviteCode.event_id == event_id,
            InviteCode.code_hash == code_hash,
            InviteCode.used_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


async def create_otp(
    db: AsyncSession,
    *,
    subject_type: OtpSubject,
    subject_id: int,
    channel: OtpChannel,
    destination: str,
) -> None:
    """
    Создаёт запись OTP в БД и «отправляет» код на email или SMS.

    subject_type — команда (team) или админ (admin)
    subject_id — id этой записи в БД
    """
    code = generate_otp()
    token = OtpToken(
        subject_type=subject_type,
        subject_id=subject_id,
        channel=channel,
        code_hash=hash_otp(code),  # в БД только хеш
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.otp_expire_minutes),
    )
    db.add(token)
    await db.commit()

    text = f"Код подтверждения IT-Куб: {code}\nДействует {settings.otp_expire_minutes} мин."
    if channel == OtpChannel.sms:
        send_sms(destination, text)
    else:
        send_email(destination, "Код подтверждения", text)


async def verify_otp(
    db: AsyncSession,
    *,
    subject_type: OtpSubject,
    subject_id: int,
    code: str,
) -> tuple[bool, str]:
    """
    Проверяет OTP-код.

    Возвращает (True, "") при успехе или (False, "текст ошибки").
    Берём последний неиспользованный код для этого пользователя.
    """
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(OtpToken)
        .where(
            OtpToken.subject_type == subject_type,
            OtpToken.subject_id == subject_id,
            OtpToken.used_at.is_(None),
        )
        .order_by(OtpToken.created_at.desc())
        .limit(1)
    )
    token = result.scalar_one_or_none()
    if not token:
        return False, "Код не найден. Запросите новый."

    expires = token.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < now:
        return False, "Код просрочен. Запросите новый."
    if token.attempts >= settings.otp_max_attempts:
        return False, "Превышено число попыток. Запросите новый код."

    if not verify_otp_code(code, token.code_hash):
        token.attempts += 1  # считаем неудачные попытки
        await db.commit()
        return False, "Неверный код."

    token.used_at = now  # код одноразовый
    await db.commit()
    return True, ""


async def event_free_spots(db: AsyncSession, event: Event) -> int:
    """Сумма свободных мест по всем кейсам мероприятия (для карточки на главной)."""
    total = 0
    for case in event.cases:
        occupied = await count_teams_in_case(db, case.id)
        total += max(case.team_limit - occupied, 0)
    return total
