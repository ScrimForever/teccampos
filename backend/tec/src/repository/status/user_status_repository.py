from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from domain.schemas.user_status import UserStatusOutput
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



