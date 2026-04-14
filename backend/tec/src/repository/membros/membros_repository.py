from enum import member

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import JSONResponse
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_409_CONFLICT, HTTP_404_NOT_FOUND
from domain.models.equipe_model import MembroModel, EquipeModel
from domain.schemas.membro_schema import MembroInput
from loguru import logger
from infra.database import User


class MembrosRepository:


    async def create_membro_on_team(self, db: AsyncSession, user: User | None, equipe_id: int,  membro_object: MembroInput):
        stmt = select(EquipeModel).where(EquipeModel.id == equipe_id)
        try:
            execute_stmt = await db.execute(stmt)
            response_stmt = execute_stmt.scalar_one_or_none()
            if response_stmt is None:
                return JSONResponse(content={"message": "Nenhuma equipe encontrada."}, status_code=HTTP_400_BAD_REQUEST)
            else:
                stmt = select(MembroModel).where(MembroModel.email == membro_object.email)
                execute_stmt = await db.execute(stmt)
                response_stmt = execute_stmt.scalar_one_or_none()
                if response_stmt is not None:
                    return JSONResponse(content={"message": "Usuário já existe"}, status_code=HTTP_409_CONFLICT)
                membro = MembroModel(**membro_object.model_dump())
                db.add(membro)
                await db.commit()
                await db.refresh(membro)
                return membro
        except Exception as e:
            logger.error(e)
            return None

    async def list_membros(self, db: AsyncSession, user: User, equipe_id: int):
        stmt = select(MembroModel).where(MembroModel.equipe_id == equipe_id)
        try:
            execute_stmt = await db.execute(stmt)
            response_stmt = execute_stmt.scalars().all()
            if response_stmt is None:
                return JSONResponse(
                    content={"message": "Não há membros para essa equipe."},
                    status_code=HTTP_404_NOT_FOUND
                )
            else:
                return response_stmt
        except Exception as e:
            logger.error(e)
            return None

