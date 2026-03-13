from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from domain.models.planejamento_mercado_model import PlanejamentoMercadoModel
from domain.schemas.planejamento_mercado_schema import PlanejamentoMercadoInput
from loguru import logger
from infra.database import get_async_session, User
from routers.planejamento_mercado import planejamento_mercado


class PlanejamentoMercadoRepository:


    async def create_planejamento_mercado(self, db: AsyncSession, user: User, planejamento: PlanejamentoMercadoInput):
        data_object = planejamento.model_dump()
        try:
            persist_data = PlanejamentoMercadoModel(**data_object)
            db.add(persist_data)
            await db.commit()
            await db.refresh(persist_data)
            return persist_data
        except Exception as e:
            logger.error(e)
            return None

    async def update_planejamento_mercado(self, planejamento_id: int, db: AsyncSession, user: User, planejamento: PlanejamentoMercadoInput):
        stmt = select(PlanejamentoMercadoModel).where(PlanejamentoMercadoModel.id == planejamento_id)
        execute_stmt = await db.execute(stmt)
        response_stmt = execute_stmt.scalar_one_or_none()
        if response_stmt is None:
            return None
        else:
            x = planejamento.model_dump()
            z = planejamento_id
            stmt = update(PlanejamentoMercadoModel).where(PlanejamentoMercadoModel.id == planejamento_id).values(x)
            await db.execute(stmt)
            await db.commit()
            return {"menssage": "Updated Planejamento Mercado"}

