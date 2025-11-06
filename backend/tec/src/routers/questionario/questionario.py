from fastapi import APIRouter, Depends
from starlette.responses import JSONResponse

from infra.database import User
from domain.security.users import current_active_user
from sqlalchemy.ext.asyncio import AsyncSession
from infra.database import get_async_session
from repository.questionario.questionario_repostory import QuestionarioRepository
from repository.users.users_repository import UserRepository

questionario_router = APIRouter(prefix="/questionario")


@questionario_router.post("")
async def create_or_update_questionario(
    finalizado: bool | None,
    questionario: dict,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    if user.is_active:
        if finalizado is None:
            update_questionario = await QuestionarioRepository().save_questionario(
                finalizado=False,
                questionario_json=questionario,
                user=user,
                db=db
            )
            if update_questionario is not None:
                await UserRepository().update_questionario_finalizado(user=user, db=db)
        else:
            update_questionario = await QuestionarioRepository().save_questionario(
                finalizado=True,
                questionario_json=questionario,
                user=user,
                db=db
            )
            if update_questionario is not None:
                await UserRepository().update_questionario_finalizado(user=user, db=db)
    return None


@questionario_router.put("/questionario/{questionario_user}")
async def consultor_update_questioanrio(
    questionario_user: str,
    update_field: dict,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    if user.is_consultor:
        aprovado = False
        activate = True
        if update_field.get("aprovado_por"):
            aprovado = True
        elif update_field.get("reprovado_por"):
            activate = False
        updated_json = await UserRepository().update_questionario_by_id(
            questionario_user=questionario_user,
            update_field=update_field,
            db=db,
            aprovado=aprovado,
            user_activate=activate
        )
        return updated_json
    else:
        return JSONResponse(content={"message": "Sem permissão"}, status_code=403)
