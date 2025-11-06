from domain.models.pratica_chave import PraticaChave
from infra.database import User
from domain.schemas.pratica_chave_schema import PraticaChaveSchemaInput
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logfire


class PraticaChaveRepository:

    async def persistir_pratica_chave(self, pratica_chave: PraticaChaveSchemaInput, user: User, db: AsyncSession):
        logfire.info(f"User: {user.email} está criando uma Pratica Chave.")
        stmt = PraticaChave(pratica_chave=pratica_chave.model_dump(), created_by=f"{user.email}")
        logfire.notice(f"{stmt}")
        db.add(stmt)
        await db.commit()
        await db.flush()
        return pratica_chave

    async def visualizar_praticas_chaves(self, user: User, db: AsyncSession):
        logfire.info(f"User: {user.email} está visualizando as praticas.")
        stmt = select(PraticaChave)
        result = await db.execute(stmt)
        result_praticas = result.scalars().all()
        return result_praticas
