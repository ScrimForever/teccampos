from fastapi import APIRouter, Depends
from infra.database import User
from domain.security.users import current_active_user
from repository.questionario.questionario_repostory import QuestionarioRepository
from sqlalchemy.ext.asyncio import AsyncSession
from infra.database import get_async_session

verificar_questionario_preenchido = APIRouter(prefix="/verification")


@verificar_questionario_preenchido.get("/questionario-preenchido")
async def questionario_preenchido(
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    if user.questionario_json is not None:
        rep_questionario = await QuestionarioRepository().search_questionario_preenchido_by_user(user=user, db=db)
        return rep_questionario
    else:
        return None
