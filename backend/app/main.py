"""
Точка входа backend.

Здесь создаётся приложение FastAPI, подключаются роутеры (маршруты API)
и настраивается CORS — чтобы frontend на localhost:5173 мог ходить к API.
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import admin, public, registration, team
from app.seed import seed_demo_data
import app.models  # noqa: F401 — важно: без этого import таблицы не создадутся в БД


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Жизненный цикл приложения.

    Выполняется ОДИН раз при старте uvicorn:
    1) создаём папку data/ для файла SQLite;
    2) создаём таблицы, если их ещё нет;
    3) заполняем демо-данными (админ, мероприятие, код DEMO-INVITE).
    """
    Path("data").mkdir(exist_ok=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_demo_data()
    yield  # здесь сервер работает и принимает запросы


app = FastAPI(
    title="IT-Куб Registration",
    description="Backend для регистрации на мероприятия",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS: разрешаем браузеру на frontend обращаться к API с другого порта
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключаем группы endpoint'ов из отдельных файлов routers/
app.include_router(public.router)       # этап 2: главная, список мероприятий
app.include_router(registration.router)  # этап 3: регистрация команды
app.include_router(team.router)         # этап 4: личный кабинет
app.include_router(admin.router)        # этап 5: админ-панель


@app.get("/api/health", tags=["Служебное"])
async def health():
    """Простая проверка: backend запущен и отвечает."""
    return {"status": "ok", "message": "Backend работает"}
