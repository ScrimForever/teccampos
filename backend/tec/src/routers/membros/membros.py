from fastapi import APIRouter
from fastapi.params import Depends
from typing import Annotated
from sqlalchemy.ext.asyncio import AsyncSession

from domain.schemas.membro_schema import MembroInput
from repository.membros.membros_repository import MembrosRepository

from infra.database import get_async_session, User
from domain.security.users import current_active_user


membros_router = APIRouter(prefix="/membros", tags=["membros"])


@membros_router.post("/{equipeid}")
async def create_membro(
        membro: MembroInput,
        db: Annotated[AsyncSession, Depends(get_async_session)],
        equipeid: int,
        user: User = Depends(current_active_user),
    ):
        return await MembrosRepository().create_membro_on_team(
            db=db,
            user=None,
            membro_object=membro,
            equipe_id=equipeid
        )

@membros_router.get("/{equipeid}")
async def list_membros(
        db: Annotated[AsyncSession, Depends(get_async_session)],
        equipeid: int,
        user: User = Depends(current_active_user),
    ):
        return await MembrosRepository().list_membros(
            db=db,
            user=user,
            equipe_id=equipeid
        )
