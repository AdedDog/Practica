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
        # --- Администратор (создаём или обновляем пароль демо-учётки) ---
        admin_result = await db.execute(
            select(AdminUser).where(AdminUser.email == settings.admin_email.lower())
        )
        admin = admin_result.scalar_one_or_none()
        demo_hash = hash_password(settings.admin_password)
        if not admin:
            db.add(
                AdminUser(
                    email=settings.admin_email.lower(),
                    phone=settings.admin_phone,
                    password_hash=demo_hash,
                )
            )
        else:
            admin.password_hash = demo_hash
            admin.email = settings.admin_email.lower()
            admin.phone = settings.admin_phone

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

        # --- Демо: если все коды уже использованы, добавляем новый DEMO-INVITE ---
        unused_invite = await db.execute(
            select(InviteCode).where(
                InviteCode.event_id == event.id,
                InviteCode.used_at.is_(None),
            ).limit(1)
        )
        if not unused_invite.scalar_one_or_none():
            db.add(
                InviteCode(
                    event_id=event.id,
                    code_hash=hash_code(DEMO_INVITE_CODE),
                    label="Демо-код для тестов",
                )
            )

        await db.commit()
