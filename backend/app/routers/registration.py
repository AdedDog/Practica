"""
Этап 3: регистрация команды на мероприятие.

Проверяем лимиты, invite-код, создаём запись Team и выдаём логин/пароль.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import CaseDirection, Event, EventStatus, Team
from app.schemas import TeamRegisterRequest, TeamRegisterResponse
from app.security import (
    generate_team_login,
    generate_team_password,
    hash_password,
    validate_email,
    validate_phone,
)
from app.services import count_teams_in_case, find_valid_invite

router = APIRouter(prefix="/api/events", tags=["Регистрация команды"])


@router.post(
    "/{slug}/register",
    response_model=TeamRegisterResponse,
    summary="Зарегистрировать команду",
)
async def register_team(slug: str, body: TeamRegisterRequest, db: AsyncSession = Depends(get_db)):
    # --- Валидация формата ---
    if not validate_email(body.email):
        raise HTTPException(status_code=400, detail="Некорректный email")
    if not validate_phone(body.phone):
        raise HTTPException(status_code=400, detail="Некорректный телефон")

    # --- Мероприятие ---
    result = await db.execute(
        select(Event).where(Event.slug == slug).options(selectinload(Event.cases))
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Мероприятие не найдено")
    if event.status != EventStatus.active:
        raise HTTPException(status_code=400, detail="Регистрация на это мероприятие закрыта")
    if not event.registration_open:
        raise HTTPException(status_code=400, detail="Регистрация временно приостановлена")

    # --- Кейс и лимит мест ---
    case_result = await db.execute(
        select(CaseDirection).where(
            CaseDirection.id == body.case_id,
            CaseDirection.event_id == event.id,
        )
    )
    case = case_result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=400, detail="Кейс не найден")

    occupied = await count_teams_in_case(db, case.id)
    if occupied >= case.team_limit:
        raise HTTPException(status_code=400, detail="В выбранном кейсе нет свободных мест")

    # --- Код приглашения (одноразовый) ---
    invite = await find_valid_invite(db, event.id, body.invite_code)
    if not invite:
        raise HTTPException(status_code=400, detail="Неверный или уже использованный код приглашения")

    # --- Уникальное имя команды на этом мероприятии ---
    dup = await db.execute(
        select(Team).where(
            Team.event_id == event.id,
            Team.team_name == body.team_name.strip(),
        )
    )
    if dup.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Команда с таким названием уже зарегистрирована")

    # --- Создание команды ---
    login = generate_team_login()
    password = generate_team_password()

    team = Team(
        event_id=event.id,
        case_id=case.id,
        team_name=body.team_name.strip(),
        captain_name=body.captain_name.strip(),
        email=body.email.strip().lower(),
        phone=body.phone.strip(),
        login=login,
        password_hash=hash_password(password),
    )
    db.add(team)
    await db.flush()  # получаем team.id до commit

    # Помечаем invite-код использованным
    invite.used_at = datetime.now(timezone.utc)
    invite.team_id = team.id
    await db.commit()

    return TeamRegisterResponse(
        login=login,
        password=password,
        message="Сохраните логин и пароль — они понадобятся для входа в личный кабинет.",
    )
