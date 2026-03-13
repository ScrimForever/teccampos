from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from domain.models.equipe_model import MembroModel, EquipeModel
from domain.schemas.membro_schema import MembroInput
from loguru import logger
from infra.database import User


class MembrosRepository:


    async def create_membro_on_team(self, db: AsyncSession, user: User, questionario_equipe_id: int,  membro_object: MembroInput):
        stmt = select(EquipeModel).where(EquipeModel.id == questionario_equipe_id)
        try:
            execute_stmt = await db.execute(stmt)
            response_stmt = execute_stmt.scalar_one_or_none()
            breakpoint()
            if response_stmt is None:
                membro = MembroModel(membro_object.model_dump())
                db.add(membro)
                await db.commit()
                await db.refresh(membro_object)
                return membro_object
            else:
                return {"message": "Esse email já foi utilizado"}
        except Exception as e:
            logger.error(e)
            return None