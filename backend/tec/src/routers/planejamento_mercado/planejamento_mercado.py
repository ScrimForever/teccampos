from fastapi import APIRouter
from fastapi.params import Depends
from typing import Annotated
from sqlalchemy.ext.asyncio import AsyncSession

from domain.schemas.planejamento_mercado_schema import PlanejamentoMercadoInput
from infra.database import get_async_session, User
from domain.security.users import current_active_user
from repository.planejamento_mercado.planejamento_mercado_repository import PlanejamentoMercadoRepository


planejamento_mercado_router = APIRouter(prefix="/planejamento", tags=["mercado"])


@planejamento_mercado_router.post("")
async def create_planejamento_mercado(
    planejamento_object: PlanejamentoMercadoInput,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    user: User = Depends(current_active_user)
):
    return await PlanejamentoMercadoRepository().create_planejamento_mercado(db=db, user=user, planejamento=planejamento_object)

@planejamento_mercado_router.put("/{planejamento_id}")
async def update_planejamento_mercado_full(
    planejamento_id: int,
    planejamento_object: PlanejamentoMercadoInput,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    user: User = Depends(current_active_user)
):
    return await PlanejamentoMercadoRepository().update_planejamento_mercado(db=db, user=user, planejamento=planejamento_object, planejamento_id=planejamento_id)