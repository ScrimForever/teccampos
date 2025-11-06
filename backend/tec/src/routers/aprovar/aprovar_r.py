from fastapi import APIRouter, Depends
from starlette.responses import JSONResponse

from infra.database import User
from domain.security.users import current_active_user
from sqlalchemy.ext.asyncio import AsyncSession
from infra.database import get_async_session
from repository.questionario.questionario_repostory import QuestionarioRepository
from repository.users.users_repository import UserRepository

plano_router = APIRouter(prefix='/plano')


@plano_router.get('/aprovar')
async def planos_a_aprovar(
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    if user.is_consultor:
        lista_para_aprovar = await QuestionarioRepository().list_questionario_aprovacao(user=user, db=db)
        return lista_para_aprovar
    else:
        return JSONResponse(content={"message": "Sem permissão"}, status_code=403)

@plano_router.get('/aprovados')
async def planos_aprovados(
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    if user.is_consultor:
        lista_aprovados = await UserRepository().list_users_incubados(db=db)
        print(lista_aprovados)
        return lista_aprovados
    else:
        return JSONResponse(content={"message": "Sem permissão"}, status_code=403)

@plano_router.get('/rejeitados')
async def planos_aprovados(
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    if user.is_consultor:
        lista_aprovados = await UserRepository().list_users_incubados_rejeitados(db=db)
        print(lista_aprovados)
        return lista_aprovados
    else:
        return JSONResponse(content={"message": "Sem permissão"}, status_code=403)