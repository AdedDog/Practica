"""
Этап 2: публичное API (без авторизации).

Любой посетитель сайта может смотреть мероприятия и кейсы.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Event, EventStatus
from app.schemas import CasePublic, EventListItem, EventPublic
from app.services import case_to_public, event_free_spots

router = APIRouter(prefix="/api", tags=["Публичная часть"])


@router.get("/events", response_model=list[EventListItem], summary="Список активных мероприятий")
async def list_events(db: AsyncSession = Depends(get_db)):
    """
    Главная страница: только status=active.

    selectinload(Event.cases) — сразу подгружаем кейсы одним запросом (меньше обращений к БД).
    """
    result = await db.execute(
        select(Event)
        .where(Event.status == EventStatus.active)
        .options(selectinload(Event.cases))
        .order_by(Event.created_at.desc())
    )
    events = result.scalars().all()

    items = []
    for event in events:
        items.append(
            EventListItem(
                id=event.id,
                title=event.title,
                slug=event.slug,
                description=event.description,
                status=event.status,
                registration_open=event.registration_open,
                free_spots=await event_free_spots(db, event),
            )
        )
    return items


@router.get("/events/{slug}", response_model=EventPublic, summary="Страница мероприятия")
async def get_event(slug: str, db: AsyncSession = Depends(get_db)):
    """
    Одно мероприятие по slug из URL.

    slug — человекочитаемый идентификатор, например hackathon-2026.
    """
    result = await db.execute(
        select(Event).where(Event.slug == slug).options(selectinload(Event.cases))
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Мероприятие не найдено")

    cases = [CasePublic(**await case_to_public(db, c)) for c in event.cases]
    return EventPublic(
        id=event.id,
        title=event.title,
        slug=event.slug,
        description=event.description,
        status=event.status,
        registration_open=event.registration_open,
        cases=cases,
    )
