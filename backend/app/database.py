"""
Подключение к базе данных SQLite.

SQLAlchemy 2.x в асинхронном режиме (aiosqlite).
Каждый HTTP-запрос получает свою сессию через get_db().
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    """Базовый класс: от него наследуются все модели в models.py."""


# engine — «движок» подключения к файлу data/app.db
engine = create_async_engine(settings.database_url)

# фабрика сессий: каждый раз создаём новую сессию для работы с БД
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency для FastAPI.

    Открывает сессию в начале запроса и закрывает после ответа.
    Использование: db: AsyncSession = Depends(get_db)
    """
    async with SessionLocal() as session:
        yield session
