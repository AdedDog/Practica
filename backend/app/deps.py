"""
Зависимости (dependencies) для защищённых маршрутов.

FastAPI вызывает get_current_team / get_current_admin перед endpoint'ом.
Если токен невалидный — сразу 401 Unauthorized.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import AdminUser, Team
from app.security import decode_access_token

# Ожидаем заголовок: Authorization: Bearer <токен>
security = HTTPBearer()


async def get_current_team(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Team:
    """
    Проверяет JWT и возвращает объект команды из БД.

    Используется в личном кабинете: Depends(get_current_team)
    """
    payload = decode_access_token(credentials.credentials)
    # В токене при выдаче записали role="team"
    if not payload or payload.get("role") != "team":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Требуется авторизация")

    team_id = int(payload["sub"])  # sub — id команды в JWT
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Команда не найдена")
    return team


async def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> AdminUser:
    """То же для администратора — role должен быть admin."""
    payload = decode_access_token(credentials.credentials)
    if not payload or payload.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Требуется авторизация")

    admin_id = int(payload["sub"])
    result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
    admin = result.scalar_one_or_none()
    if not admin:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Администратор не найден")
    return admin
