from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import JSONResponse

from domain.schemas.user_status import UserStatusInput, UserStatusOutput
from domain.models.user_status_model import UserStatus
from loguru import logger
from infra.database import get_async_session, User


class UserStatusRepository:


    @staticmethod
    async def get_user_status_by_email(user: User, db_session: AsyncSession):

        logger.info(f"Getting user status by email: {user.email}")
        try:
            stmt = select(UserStatus).where(UserStatus.user_email == user.email)
            db_execute = await db_session.execute(stmt)
            response_db = db_execute.scalar_one_or_none()
            logger.success(f"Returned user status: {response_db.status_type}")
            return UserStatusOutput(user_email=response_db.user_email, status_type=response_db.status_type)
        except TypeError as e:
            logger.error(e)
            return {
                "message": "Use string type"
            }
        except AttributeError as e:
            logger.error(e)
            return {
                "message": "User not found"
            }
        except Exception as e:
            print(type(e))
            logger.error(e)
            return {
                "message": "Internal server error"
            }

    @staticmethod
    async def create_user_status_initial(user: User) -> None:

        logger.info("Creating session to database")
        _session = get_async_session()
        db = await anext(_session)

        logger.info(f"Creating new status to user: {user.email}")

        try:
            user_status = UserStatus(
                user_email=user.email,
            )
            db.add(user_status)
            await db.commit()
            await db.refresh(user_status)
            logger.success(f"Created new status to user: {user.email}")
        except Exception as e:
            logger.error(e)
            logger.error(f"Making rollback status of user: {user.email}")
            await db.rollback()
            logger.success("Rollack confirmed")

    async def set_new_status(self, user_status: UserStatusInput, db_session: AsyncSession):
        logger.info(f"Setting new status to user: {user_status.user_email}")
        try:
            stmt = (
                update(UserStatus).
                where(UserStatus.user_email == user_status.user_email).
                values(status_type=user_status.status_type)
            )
            await db_session.execute(stmt)
            await db_session.commit()
            return JSONResponse(content={"status": "success"}, status_code=200)
        except Exception as e:
            return JSONResponse(content={"status": "error"}, status_code=500)


    async def get_all_status(self, user: User, db_session: AsyncSession):
        if user.is_consultant:
            logger.info(f"Getting all status for users: {user.email}")
            try:
                stmt = select(UserStatus)
                response_db = await db_session.execute(stmt)
                return response_db.scalars().all()
            except Exception as e:
                return JSONResponse(content={"status": "error"}, status_code=500)
        else:
            return JSONResponse(content={"message": "Not consultant"}, status_code=403)

