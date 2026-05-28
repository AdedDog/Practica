"""
Этап 5: админ-панель организатора.

Вход как у команды (пароль + OTP + JWT).
Все маршруты ниже login/verify-otp требуют Depends(get_current_admin).
"""

import csv
import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.deps import get_current_admin
from app.models import AdminUser, CaseDirection, Event, InviteCode, OtpChannel, OtpSubject, Team
from app.schemas import (
    AdminLoginRequest,
    CaseAdminInput,
    CasePublic,
    EventAdminCreate,
    EventAdminDetail,
    EventAdminUpdate,
    InviteCodeCreate,
    InviteCodeItem,
    InviteCodesCreated,
    OtpVerifyRequest,
    PendingAuthResponse,
    TeamAdminItem,
    TokenResponse,
)
from app.security import (
    create_access_token,
    generate_invite_code,
    hash_code,
    verify_password,
)
from app.services import case_to_public, create_otp, verify_otp

router = APIRouter(prefix="/api/admin", tags=["Админ-панель"])


async def _event_detail(db: AsyncSession, event: Event) -> EventAdminDetail:
    """Собирает мероприятие со статистикой по каждому кейсу."""
    cases = [CasePublic(**await case_to_public(db, c)) for c in event.cases]
    return EventAdminDetail(
        id=event.id,
        title=event.title,
        slug=event.slug,
        description=event.description,
        status=event.status,
        registration_open=event.registration_open,
        cases=cases,
        created_at=event.created_at,
    )


# --- Авторизация ---


@router.post("/login", response_model=PendingAuthResponse, summary="Шаг 1: вход администратора")
async def admin_login(body: AdminLoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AdminUser).where(AdminUser.email == body.email.strip().lower()))
    admin = result.scalar_one_or_none()
    if not admin or not verify_password(body.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")

    await create_otp(
        db,
        subject_type=OtpSubject.admin,
        subject_id=admin.id,
        channel=OtpChannel.email,
        destination=admin.email,
    )
    return PendingAuthResponse(
        subject_id=admin.id,
        message="Код отправлен на email администратора. Смотрите консоль backend.",
    )


@router.post("/verify-otp", response_model=TokenResponse, summary="Шаг 2: OTP-код")
async def admin_verify_otp(
    subject_id: int,
    body: OtpVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    ok, msg = await verify_otp(
        db, subject_type=OtpSubject.admin, subject_id=subject_id, code=body.code.strip()
    )
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return TokenResponse(access_token=create_access_token(subject_id, "admin"))


# --- Мероприятия ---


@router.get("/events", response_model=list[EventAdminDetail], summary="Все мероприятия")
async def admin_list_events(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """В админке видим и черновики, и завершённые — не только active."""
    result = await db.execute(
        select(Event).options(selectinload(Event.cases)).order_by(Event.created_at.desc())
    )
    events = result.scalars().all()
    return [await _event_detail(db, e) for e in events]


@router.post("/events", response_model=EventAdminDetail, summary="Создать мероприятие")
async def admin_create_event(
    body: EventAdminCreate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    dup = await db.execute(select(Event).where(Event.slug == body.slug))
    if dup.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Slug уже занят")

    event = Event(
        title=body.title,
        slug=body.slug,
        description=body.description,
        status=body.status,
        registration_open=body.registration_open,
    )
    db.add(event)
    await db.flush()

    for case in body.cases:
        db.add(
            CaseDirection(
                event_id=event.id,
                name=case.name,
                description=case.description,
                team_limit=case.team_limit,
            )
        )
    await db.commit()

    result = await db.execute(
        select(Event).where(Event.id == event.id).options(selectinload(Event.cases))
    )
    return await _event_detail(db, result.scalar_one())


@router.patch("/events/{event_id}", response_model=EventAdminDetail, summary="Изменить мероприятие")
async def admin_update_event(
    event_id: int,
    body: EventAdminUpdate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Event).where(Event.id == event_id).options(selectinload(Event.cases))
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Мероприятие не найдено")

    # exclude_unset — меняем только поля, которые прислали в JSON
    data = body.model_dump(exclude_unset=True)
    if "slug" in data:
        dup = await db.execute(select(Event).where(Event.slug == data["slug"], Event.id != event_id))
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Slug уже занят")
    for key, value in data.items():
        setattr(event, key, value)

    await db.commit()
    await db.refresh(event)
    return await _event_detail(db, event)


@router.post("/events/{event_id}/cases", response_model=CasePublic, summary="Добавить кейс")
async def admin_add_case(
    event_id: int,
    body: CaseAdminInput,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Мероприятие не найдено")

    case = CaseDirection(
        event_id=event_id,
        name=body.name,
        description=body.description,
        team_limit=body.team_limit,
    )
    db.add(case)
    await db.commit()
    await db.refresh(case)
    return CasePublic(**await case_to_public(db, case))


# --- Команды и коды ---


@router.get("/events/{event_id}/teams", response_model=list[TeamAdminItem], summary="Список команд")
async def admin_list_teams(
    event_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Team)
        .where(Team.event_id == event_id)
        .options(selectinload(Team.case))
        .order_by(Team.created_at.desc())
    )
    teams = result.scalars().all()
    return [
        TeamAdminItem(
            id=t.id,
            team_name=t.team_name,
            captain_name=t.captain_name,
            email=t.email,
            phone=t.phone,
            case_name=t.case.name,
            login=t.login,
            created_at=t.created_at,
        )
        for t in teams
    ]


@router.get("/events/{event_id}/invite-codes", response_model=list[InviteCodeItem], summary="Коды приглашения")
async def admin_list_invites(
    event_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(InviteCode)
        .where(InviteCode.event_id == event_id)
        .order_by(InviteCode.created_at.desc())
    )
    codes = result.scalars().all()
    return [
        InviteCodeItem(
            id=c.id,
            label=c.label,
            used=c.used_at is not None,
            used_at=c.used_at,
            created_at=c.created_at,
        )
        for c in codes
    ]


@router.post("/events/{event_id}/invite-codes", response_model=InviteCodesCreated, summary="Создать коды")
async def admin_create_invites(
    event_id: int,
    body: InviteCodeCreate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Мероприятие не найдено")

    count = max(1, min(body.count, 50))  # не больше 50 за раз
    created_codes: list[str] = []

    for i in range(count):
        code = (body.code or generate_invite_code()).strip().upper()
        if count > 1 and body.code:
            code = f"{code}-{i + 1}"  # MYCODE-1, MYCODE-2, ...
        db.add(
            InviteCode(
                event_id=event_id,
                code_hash=hash_code(code),
                label=body.label,
            )
        )
        created_codes.append(code)

    await db.commit()
    return InviteCodesCreated(
        codes=created_codes,
        message="Сохраните коды — повторно они не отображаются.",
    )


@router.get("/events/{event_id}/export", summary="Экспорт CSV")
async def admin_export_csv(
    event_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Формирует CSV в памяти и отдаёт файл на скачивание.

    StreamingResponse — браузер получит файл, а не JSON.
    """
    result = await db.execute(
        select(Event).where(Event.id == event_id).options(selectinload(Event.cases))
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Мероприятие не найдено")

    teams_result = await db.execute(
        select(Team)
        .where(Team.event_id == event_id)
        .options(selectinload(Team.case))
        .order_by(Team.created_at)
    )
    teams = teams_result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Команда", "Капитан", "Email", "Телефон", "Кейс", "Логин", "Дата"])
    for t in teams:
        writer.writerow(
            [t.team_name, t.captain_name, t.email, t.phone, t.case.name, t.login, t.created_at.isoformat()]
        )
    writer.writerow([])
    writer.writerow(["Кейс", "Лимит", "Занято", "Свободно"])
    for case in event.cases:
        stats = await case_to_public(db, case)
        writer.writerow([stats["name"], stats["team_limit"], stats["occupied"], stats["free"]])

    output.seek(0)
    filename = f"{event.slug}-{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
