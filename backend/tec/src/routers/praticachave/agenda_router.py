from fastapi import APIRouter, Depends
from starlette.responses import JSONResponse

from infra.database import User
from domain.schemas.pratica_chave_schema import PraticaChaveSchemaInput
from domain.security.users import current_active_user
from sqlalchemy.ext.asyncio import AsyncSession
from infra.database import get_async_session
from repository.praticachave.pratica_chave_repository import PraticaChaveRepository


pratica_chave_r = APIRouter(prefix="/pratica-chave")


@pratica_chave_r.post("")
async def registrar_pratica(
    pratica_chave: PraticaChaveSchemaInput,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    p_chave = await PraticaChaveRepository().persistir_pratica_chave(
        pratica_chave=pratica_chave,
        user=user,
        db=db)
    return p_chave

@pratica_chave_r.get("")
async def visualizar_praticas(
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    p_chave_visual = await PraticaChaveRepository().visualizar_praticas_chaves(user=user, db=db)
    return p_chave_visual
