from idlelib.pyshell import use_subprocess

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from starlette.responses import JSONResponse
from starlette.status import HTTP_403_FORBIDDEN

from domain.schemas.questionario_schema import QuestionarioInput
from domain.models.questionario_model import QuestionarioModel
from domain.models.equipe_model import EquipeModel
from domain.models.planejamento_mercado_model import PlanejamentoMercadoModel
from domain.models.user_status_model import UserStatus
from loguru import logger
from infra.database import User
import datetime


class QuestionarioRepository:


    @staticmethod
    async def create_or_update_questionario_object(db: AsyncSession, questionario_object: QuestionarioInput, user: User):

        stmt = select(QuestionarioModel).where(QuestionarioModel.usuario_associado == questionario_object.usuario_associado)
        execute_stmt = await db.execute(stmt)
        returned_stmt = execute_stmt.scalar_one_or_none()
        if returned_stmt is None:
            try:
                logger.info(f"User: {user.email} está criando um novo questionário")
                questionario = questionario_object.model_dump()
                """
                    Criando EQUIPE
                """
                stmt = EquipeModel(created_at=datetime.datetime.now())
                db.add(stmt)
                await db.commit()
                await db.refresh(stmt)
                questionario.update(equipe=stmt.id)
                # Equipe criada

                """
                    Criando MERCADO
                """
                stmt = PlanejamentoMercadoModel(
                    created_at=datetime.datetime.now(),
                    usuario_associado=user.email
                )
                db.add(stmt)
                await db.commit()
                await db.refresh(stmt)
                questionario.update(planejamento_mercado=stmt.id)
                # Mercado criado

                persist_object = QuestionarioModel(**questionario)
                db.add(persist_object)
                await db.commit()
                await db.refresh(persist_object)
                logger.success("Questionario criado com sucesso")
                return persist_object
            except TypeError as e:
                logger.error(e)
                return {"message": "Erro de tipagem"}
            except Exception as e:
                logger.error(e)
        else:
            _update_data = questionario_object.model_dump()
            _update_data.pop("equipe")
            try:
                stmt_update_user_status = select(UserStatus).where(UserStatus.user_email == user.email)
                result = await db.execute(stmt_update_user_status)
                executed_stmt_user_status = result.scalar_one_or_none()
                if executed_stmt_user_status.status_type is None:
                    executed_stmt_user_status.update({"status_type": "in_progress"})
                stmt = update(QuestionarioModel).where(QuestionarioModel.usuario_associado == user.email).values(**_update_data)
                await db.execute(stmt)
                await db.commit()
            except Exception as e:
                logger.error(e)
                return {"message": "Erro interno"}
            return None


    async def get_questionario(self, user: User, db: AsyncSession):
        stmt = (
            select(QuestionarioModel)
            .where(QuestionarioModel.usuario_associado == user.email)
            .options(joinedload(QuestionarioModel.planejamento_mercado_rel))
        )
        execute_stmt = await db.execute(stmt)
        returned_stmt = execute_stmt.unique().scalar_one_or_none()

        if returned_stmt is None:
            logger.debug("Não há questionário")
            return JSONResponse(content={"message": "Não há questionário"}, status_code=200)
        else:
            logger.debug("Há questionário")
            return returned_stmt

    async def list_questionarios(self, user: User, db: AsyncSession):
        if not user.is_consultant:
            return JSONResponse(content={"message": "Usuário não possui permissão"}, status_code=HTTP_403_FORBIDDEN)
        else:
            stmt = select(QuestionarioModel)
            execute_stmt = await db.execute(stmt)
            returned_stmt = execute_stmt.scalars().all()
            return returned_stmt

