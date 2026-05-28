"""
Этап 4: личный кабинет команды.

Вход: логин+пароль → OTP → JWT.
Дальше все запросы с заголовком Authorization: Bearer <token>.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.deps import get_current_team
from app.models import CaseDirection, OtpChannel, OtpSubject, Team
from app.schemas import (
    CaseChangeRequest,
    OtpResendRequest,
    OtpVerifyRequest,
    PendingAuthResponse,
    TeamLoginRequest,
    TeamProfile,
    TeamUpdateRequest,
    TokenResponse,
)
from app.security import create_access_token, validate_email, validate_phone, verify_password
from app.services import count_teams_in_case, create_otp, verify_otp

router = APIRouter(prefix="/api/team", tags=["Личный кабинет команды"])


def _team_to_profile(team: Team) -> TeamProfile:
    """Превращает ORM-объект Team в JSON для ответа API."""
    return TeamProfile(
        id=team.id,
        team_name=team.team_name,
        captain_name=team.captain_name,
        email=team.email,
        phone=team.phone,
        event_title=team.event.title,
        event_slug=team.event.slug,
        case_id=team.case_id,
        case_name=team.case.name,
    )


async def _load_team(db: AsyncSession, team_id: int) -> Team:
    """Загружает команду вместе с мероприятием и кейсом (для профиля)."""
    result = await db.execute(
        select(Team)
        .where(Team.id == team_id)
        .options(selectinload(Team.event), selectinload(Team.case))
    )
    return result.scalar_one()


@router.post("/login", response_model=PendingAuthResponse, summary="Шаг 1: логин и пароль")
async def team_login(body: TeamLoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Team).where(Team.login == body.login.strip()))
    team = result.scalar_one_or_none()
    if not team or not verify_password(body.password, team.password_hash):
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")

    # Отправляем OTP на email — без него токен не выдаём (2FA)
    await create_otp(
        db,
        subject_type=OtpSubject.team,
        subject_id=team.id,
        channel=OtpChannel.email,
        destination=team.email,
    )
    return PendingAuthResponse(
        subject_id=team.id,
        message="Код отправлен на email, указанный при регистрации. Смотрите консоль backend.",
    )


@router.post("/verify-otp", response_model=TokenResponse, summary="Шаг 2: ввод OTP-кода")
async def team_verify_otp(
    subject_id: int,
    body: OtpVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    ok, msg = await verify_otp(
        db, subject_type=OtpSubject.team, subject_id=subject_id, code=body.code.strip()
    )
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return TokenResponse(access_token=create_access_token(subject_id, "team"))


@router.post("/resend-otp", summary="Отправить код повторно")
async def team_resend_otp(
    subject_id: int,
    body: OtpResendRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Team).where(Team.id == subject_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Команда не найдена")

    channel = OtpChannel.sms if body.channel == "sms" else OtpChannel.email
    destination = team.phone if channel == OtpChannel.sms else team.email
    await create_otp(
        db,
        subject_type=OtpSubject.team,
        subject_id=team.id,
        channel=channel,
        destination=destination,
    )
    return {"message": "Код отправлен повторно"}


@router.get("/me", response_model=TeamProfile, summary="Профиль команды")
async def team_me(team: Team = Depends(get_current_team), db: AsyncSession = Depends(get_db)):
    # get_current_team уже проверил JWT; здесь подгружаем связи для ответа
    full = await _load_team(db, team.id)
    return _team_to_profile(full)


@router.patch("/me", response_model=TeamProfile, summary="Изменить данные команды")
async def team_update(
    body: TeamUpdateRequest,
    team: Team = Depends(get_current_team),
    db: AsyncSession = Depends(get_db),
):
    if body.email is not None:
        if not validate_email(body.email):
            raise HTTPException(status_code=400, detail="Некорректный email")
        team.email = body.email.strip().lower()
    if body.phone is not None:
        if not validate_phone(body.phone):
            raise HTTPException(status_code=400, detail="Некорректный телефон")
        team.phone = body.phone.strip()
    if body.team_name is not None:
        team.team_name = body.team_name.strip()
    if body.captain_name is not None:
        team.captain_name = body.captain_name.strip()

    await db.commit()
    full = await _load_team(db, team.id)
    return _team_to_profile(full)


@router.patch("/me/case", response_model=TeamProfile, summary="Сменить кейс")
async def team_change_case(
    body: CaseChangeRequest,
    team: Team = Depends(get_current_team),
    db: AsyncSession = Depends(get_db),
):
    if body.case_id == team.case_id:
        raise HTTPException(status_code=400, detail="Вы уже в этом кейсе")

    case_result = await db.execute(
        select(CaseDirection).where(
            CaseDirection.id == body.case_id,
            CaseDirection.event_id == team.event_id,
        )
    )
    case = case_result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=400, detail="Кейс не найден")

    occupied = await count_teams_in_case(db, case.id)
    if occupied >= case.team_limit:
        raise HTTPException(status_code=400, detail="В выбранном кейсе нет свободных мест")

    team.case_id = case.id
    await db.commit()
    full = await _load_team(db, team.id)
    return _team_to_profile(full)
