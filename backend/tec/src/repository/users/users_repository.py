from pickletools import stringnl_noescape

from sqlalchemy import select
from infra.database import User
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from loguru import logger


class UserRepository:


    async def update_questionario_finalizado(self, user: User, db: AsyncSession):
        stmt = select(User).where(User.email == user.email)
        result = await db.execute(stmt)
        u_user = result.scalars().first()
        if u_user is not None:
            u_user.questionario_finalizado = True
            await db.commit()
            await db.flush()
            return u_user
        else:
            return None


    async def update_questionario_by_id(
            self,
            questionario_user: str,
            update_field: dict,
            db: AsyncSession,
            aprovado: bool | None = False,
            user_activate: bool | None = True
    ):
        stmt = select(User).where(User.id == questionario_user)
        result = await db.execute(stmt)
        u_user = result.scalars().first()
        if u_user is not None:
            u_user.questionario_json = update_field
            if aprovado:
                u_user.is_incubado = True
            if user_activate is False:
                u_user.is_active = False
            await db.commit()
            await db.flush()
            return u_user
        else:
            return None

    async def list_users_incubados(self, db: AsyncSession):
        stmt = select(User.id, User.email, User.is_incubado, User.questionario_json).where(User.is_incubado == True)
        result = await db.execute(stmt)
        rows = result.all()
        response = [
            {
                "id": id,
                "email": email,
                "questionario": questionario_json,
                "is_incubado": is_incubado
            }
            for id, questionario_json, email, is_incubado in rows
        ]
        print(response)
        return response

    async def list_users_incubados_rejeitados(self, db: AsyncSession):
        stmt = select(User.id, User.email, User.is_incubado, User.questionario_json).where(User.is_active == False)
        result = await db.execute(stmt)
        rows = result.all()
        response = [
            {
                "id": id,
                "email": email,
                "questionario": questionario_json,
                "is_incubado": is_incubado
            }
            for id, email, is_incubado, questionario_json in rows
        ]
        print(response)
        return response