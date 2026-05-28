"""
Модели таблиц базы данных (SQLAlchemy ORM).

Каждый класс = одна таблица. Поля — колонки.
relationship — связи «один ко многим» между таблицами.
"""

import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class EventStatus(str, enum.Enum):
    """Статус мероприятия на сайте."""
    draft = "draft"      # черновик — на главной не показываем
    active = "active"    # открыто для регистрации
    closed = "closed"    # завершено


class OtpSubject(str, enum.Enum):
    """Кому принадлежит OTP: команде или админу."""
    admin = "admin"
    team = "team"


class OtpChannel(str, enum.Enum):
    """Куда отправили OTP."""
    email = "email"
    sms = "sms"


class AdminUser(Base):
    """Организатор — входит в админ-панель."""

    __tablename__ = "admin_users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255))  # не пароль, а хеш!
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Event(Base):
    """Мероприятие: хакатон, конкурс и т.д."""

    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(128), unique=True)  # часть URL: /events/hackathon-2026
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[EventStatus] = mapped_column(Enum(EventStatus), default=EventStatus.draft)
    registration_open: Mapped[bool] = mapped_column(Boolean, default=True)  # можно закрыть отдельно от status
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # связанные кейсы и команды (подгружаются через selectinload в запросах)
    cases: Mapped[list["CaseDirection"]] = relationship(back_populates="event")
    teams: Mapped[list["Team"]] = relationship(back_populates="event")


class CaseDirection(Base):
    """Кейс / направление (например «Веб-разработка»)."""

    __tablename__ = "case_directions"

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    team_limit: Mapped[int] = mapped_column(Integer, default=10)  # макс. число команд

    event: Mapped["Event"] = relationship(back_populates="cases")
    teams: Mapped[list["Team"]] = relationship(back_populates="case")


class InviteCode(Base):
    """Одноразовый код приглашения для регистрации."""

    __tablename__ = "invite_codes"

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"))
    code_hash: Mapped[str] = mapped_column(String(255))  # в БД храним хеш, не сам код
    label: Mapped[str | None] = mapped_column(String(64), nullable=True)  # пометка для админа
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    event: Mapped["Event"] = relationship()


class Team(Base):
    """Зарегистрированная команда."""

    __tablename__ = "teams"
    # на одном мероприятии не может быть двух команд с одинаковым названием
    __table_args__ = (UniqueConstraint("event_id", "team_name", name="uq_event_team_name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"))
    case_id: Mapped[int] = mapped_column(ForeignKey("case_directions.id"))
    team_name: Mapped[str] = mapped_column(String(255))
    captain_name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str] = mapped_column(String(32))
    login: Mapped[str] = mapped_column(String(64), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    event: Mapped["Event"] = relationship(back_populates="teams")
    case: Mapped["CaseDirection"] = relationship(back_populates="teams")


class OtpToken(Base):
    """Запись одноразового кода для 2FA (вход в кабинет / админку)."""

    __tablename__ = "otp_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    subject_type: Mapped[OtpSubject] = mapped_column(Enum(OtpSubject))
    subject_id: Mapped[int] = mapped_column(Integer)  # id команды или админа
    channel: Mapped[OtpChannel] = mapped_column(Enum(OtpChannel), default=OtpChannel.email)
    code_hash: Mapped[str] = mapped_column(String(255))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    attempts: Mapped[int] = mapped_column(Integer, default=0)  # число неверных вводов
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
