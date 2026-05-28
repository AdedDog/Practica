"""
Начальные (демо) данные при старте сервера.

Нужны, чтобы сразу можно было тестировать API без ручного ввода в БД.
"""

from sqlalchemy import select

from app.database import SessionLocal
from app.config import settings
from app.models import AdminUser, CaseDirection, Event, EventStatus, InviteCode
from app.security import hash_code, hash_password

# Код для регистрации команды в тестах (см. README)
DEMO_INVITE_CODE = "DEMO-INVITE"


async def seed_demo_data() -> None:
    """
    Заполняет БД, если чего-то ещё нет:
    - админ admin@itkub.local / admin123
    - мероприятие hackathon-2026 с 3 кейсами
    - invite-код DEMO-INVITE
    """
    async with SessionLocal() as db:
        # --- Администратор ---
        admin_exists = await db.execute(select(AdminUser).limit(1))
        if not admin_exists.scalar_one_or_none():
            db.add(
                AdminUser(
                    email=settings.admin_email.lower(),
                    phone=settings.admin_phone,
                    password_hash=hash_password(settings.admin_password),
                )
            )

        # --- Мероприятие ---
        result = await db.execute(select(Event).where(Event.slug == "hackathon-2026"))
        event = result.scalar_one_or_none()

        if not event:
            event = Event(
                title="Хакатон IT-Куб 2026",
                slug="hackathon-2026",
                description="Демо-мероприятие для проверки регистрации команд.",
                status=EventStatus.active,
                registration_open=True,
            )
            db.add(event)
            await db.flush()  # flush — чтобы появился event.id для кейсов

            db.add_all(
                [
                    CaseDirection(
                        event_id=event.id,
                        name="Веб-разработка",
                        description="Frontend и backend",
                        team_limit=5,
                    ),
                    CaseDirection(
                        event_id=event.id,
                        name="Мобильная разработка",
                        description="iOS / Android",
                        team_limit=3,
                    ),
                    CaseDirection(
                        event_id=event.id,
                        name="ИИ и данные",
                        description="ML и аналитика",
                        team_limit=4,
                    ),
                ]
            )

        # --- Код приглашения (если у мероприятия ещё нет ни одного) ---
        invite_exists = await db.execute(
            select(InviteCode).where(InviteCode.event_id == event.id).limit(1)
        )
        if not invite_exists.scalar_one_or_none():
            db.add(
                InviteCode(
                    event_id=event.id,
                    code_hash=hash_code(DEMO_INVITE_CODE),
                    label="Демо-код для тестов",
                )
            )

        await db.commit()
