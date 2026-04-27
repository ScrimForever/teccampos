from fastapi import APIRouter
from fastapi.params import Depends
from typing import Annotated
from sqlalchemy.ext.asyncio import AsyncSession
from infra.database import get_async_session, User
from domain.security.users import current_active_user
from repository.status.user_status_repository import UserStatusRepository
from domain.schemas.user_status import UserStatusInput


user_status_router = APIRouter(prefix="/status", tags=["status"])


@user_status_router.get("")
async def check_user_status(db: Annotated[AsyncSession, Depends(get_async_session)], user: User = Depends(current_active_user)):
    return await UserStatusRepository().get_user_status_by_email(user, db_session=db)

@user_status_router.put("")
async def change_user_status(user_status: UserStatusInput, db: Annotated[AsyncSession, Depends(get_async_session)], user: User = Depends(current_active_user)):
    return await UserStatusRepository().set_new_status(user_status, db_session=db)

@user_status_router.get("/all")
async def check_user_status(db: Annotated[AsyncSession, Depends(get_async_session)], user: User = Depends(current_active_user)):
    return await UserStatusRepository().get_all_status(user, db_session=db)

