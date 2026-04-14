from fastapi import APIRouter
from fastapi.params import Depends
from typing import Annotated
from sqlalchemy.ext.asyncio import AsyncSession

from domain.schemas.questionario_schema import QuestionarioInput
from infra.database import get_async_session, User
from domain.security.users import current_active_user
from repository.questionario.questionario_repository import QuestionarioRepository


questionario_router = APIRouter(prefix="/questionario", tags=["questionario"])


@questionario_router.post("")
async def create_or_update_questionario(
        questionario_object: QuestionarioInput,
        db: Annotated[AsyncSession, Depends(get_async_session)],
        user: User = Depends(current_active_user),
    ):
    return await QuestionarioRepository().create_or_update_questionario_object(
        db,
        user=user,
        questionario_object=questionario_object
    )

@questionario_router.get("")
async def get_questionario(
    db: Annotated[AsyncSession, Depends(get_async_session)],
    user: User = Depends(current_active_user)
):
    return await QuestionarioRepository().get_questionario(user=user, db=db)

@questionario_router.get("/consultant")
async def get_questionario_consultants(
    db: Annotated[AsyncSession, Depends(get_async_session)],
    user: User = Depends(current_active_user)
):
    return await QuestionarioRepository().list_questionarios(user=user, db=db)