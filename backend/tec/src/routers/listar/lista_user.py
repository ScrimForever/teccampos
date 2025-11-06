from fastapi import APIRouter, Depends

from infra.database import User
from domain.security.users import current_active_user
from sqlalchemy.ext.asyncio import AsyncSession
from infra.database import get_async_session


listar_user_router = APIRouter(prefix="/listar")


@listar_user_router.get("/incubados")
async def listar_incubados(
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    ...