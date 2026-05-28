"""
Pydantic-схемы: формат JSON на вход и выход API.

Отдельно от models.py: здесь только то, что видит клиент (frontend).
Можно не отдавать лишние поля (например password_hash).
"""

from datetime import datetime

from pydantic import BaseModel, Field

from app.models import EventStatus


# --- Публичная часть (этап 2) ---


class CasePublic(BaseModel):
    """Кейс на странице мероприятия + статистика мест."""

    id: int
    name: str
    description: str
    team_limit: int
    occupied: int
    free: int
    is_full: bool


class EventListItem(BaseModel):
    """Краткая карточка на главной."""

    id: int
    title: str
    slug: str
    description: str
    status: EventStatus
    registration_open: bool
    free_spots: int


class EventPublic(BaseModel):
    """Полная страница одного мероприятия."""

    id: int
    title: str
    slug: str
    description: str
    status: EventStatus
    registration_open: bool
    cases: list[CasePublic]


# --- Регистрация (этап 3) ---


class TeamRegisterRequest(BaseModel):
    """Тело POST /api/events/{slug}/register."""

    case_id: int
    team_name: str = Field(min_length=2, max_length=255)
    captain_name: str = Field(min_length=2, max_length=255)
    email: str
    phone: str
    invite_code: str


class TeamRegisterResponse(BaseModel):
    """Логин и пароль показываем один раз после регистрации."""

    login: str
    password: str
    message: str


# --- Авторизация и 2FA (этапы 4–5) ---


class TeamLoginRequest(BaseModel):
    login: str
    password: str


class OtpVerifyRequest(BaseModel):
    code: str = Field(min_length=4, max_length=8)


class OtpResendRequest(BaseModel):
    channel: str = "email"  # "email" или "sms"


class PendingAuthResponse(BaseModel):
    """После логина/пароля — ждём OTP; subject_id нужен для verify-otp."""

    pending: bool = True
    subject_id: int
    message: str


class TokenResponse(BaseModel):
    """JWT после успешного OTP."""

    access_token: str
    token_type: str = "bearer"


# --- Личный кабинет (этап 4) ---


class TeamProfile(BaseModel):
    """Профиль команды для GET/PATCH /api/team/me."""

    id: int
    team_name: str
    captain_name: str
    email: str
    phone: str
    event_title: str
    event_slug: str
    case_id: int
    case_name: str


class TeamUpdateRequest(BaseModel):
    """Все поля опциональны — меняем только переданные."""

    team_name: str | None = None
    captain_name: str | None = None
    email: str | None = None
    phone: str | None = None


class CaseChangeRequest(BaseModel):
    case_id: int


# --- Админ-панель (этап 5) ---


class AdminLoginRequest(BaseModel):
    email: str
    password: str


class CaseAdminInput(BaseModel):
    """Создание кейса из админки."""

    name: str
    description: str = ""
    team_limit: int = 10


class EventAdminCreate(BaseModel):
    title: str
    slug: str
    description: str = ""
    status: EventStatus = EventStatus.draft
    registration_open: bool = True
    cases: list[CaseAdminInput] = []


class EventAdminUpdate(BaseModel):
    """PATCH — только переданные поля (model_dump exclude_unset)."""

    title: str | None = None
    slug: str | None = None
    description: str | None = None
    status: EventStatus | None = None
    registration_open: bool | None = None


class EventAdminDetail(BaseModel):
    id: int
    title: str
    slug: str
    description: str
    status: EventStatus
    registration_open: bool
    cases: list[CasePublic]
    created_at: datetime


class InviteCodeItem(BaseModel):
    """Список кодов в админке — без самого кода (только факт использования)."""

    id: int
    label: str | None
    used: bool
    used_at: datetime | None
    created_at: datetime


class InviteCodeCreate(BaseModel):
    code: str | None = None  # если пусто — сгенерируем случайный
    label: str | None = None
    count: int = 1


class InviteCodesCreated(BaseModel):
    """Текст кодов отдаём только в момент создания."""

    codes: list[str]
    message: str


class TeamAdminItem(BaseModel):
    id: int
    team_name: str
    captain_name: str
    email: str
    phone: str
    case_name: str
    login: str
    created_at: datetime
