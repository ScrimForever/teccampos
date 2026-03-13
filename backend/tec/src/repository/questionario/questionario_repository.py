from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from domain.schemas.questionario_schema import QuestionarioInput
from domain.models.questionario_model import QuestionarioModel
from domain.models.equipe_model import EquipeModel
from domain.models.planejamento_mercado_model import PlanejamentoMercadoModel
from loguru import logger
from infra.database import User
import datetime


class QuestionarioRepository:


    @staticmethod
    async def create_or_update_questionario_object(db: AsyncSession, questionario_object: QuestionarioInput, user: User):

        stmt = select(QuestionarioModel).where(QuestionarioModel.nome_proponente == questionario_object.nome_proponente)
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
                stmt = PlanejamentoMercadoModel(created_at=datetime.datetime.now())
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
                stmt = update(QuestionarioModel).where(QuestionarioModel.user_associated == user.id).values(**_update_data)
                await db.execute(stmt)
                await db.commit()
            except Exception as e:
                logger.error(e)
                return {"message": "Erro interno"}
            return None


    async def get_questionario(self, user: User, db: AsyncSession):
        stmt = (
            select(QuestionarioModel)
            .where(QuestionarioModel.user_associated == user.id)
            .options(joinedload(QuestionarioModel.planejamento_mercado_rel))
        )
        execute_stmt = await db.execute(stmt)
        returned_stmt = execute_stmt.unique().scalar_one_or_none()

        if returned_stmt is None:
            return None
        else:
            return returned_stmt