from sqlalchemy import select
from domain.models.agenda import Agenda
from infra.database import User
from domain.schemas.agenda_schema import AgendaInput
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logfire


class AgendaRepository:

    async def persistir_agenda(self, agenda: AgendaInput, user: User, db: AsyncSession):
        logfire.info(f"User: {user.email} está agendando um compromisso.")
        stmt = Agenda(agenda_json=agenda.model_dump())
        logfire.notice(f"{stmt}")
        db.add(stmt)
        await db.commit()
        await db.flush()
        return agenda

    async def visualizar_agenda(self, user: User, db: AsyncSession):
        logfire.info(f"User: {user.email} está agendando um compromisso.")
        stmt = select(Agenda)
        result = await db.execute(stmt)
        result_agenda = result.scalars().all()
        print(result_agenda)
        return result_agenda

    async def update_agenda(self, id_agenda: int, agenda: dict, user: User, db: AsyncSession):
        logfire.info(f"User: {user.email} está participando de um compromisso.")
        stmt = select(Agenda).where(Agenda.id == id_agenda)
        result = await db.execute(stmt)
        result_agenda = result.scalars().first()
        if result_agenda:
            result_agenda.agenda_json = agenda
            await db.commit()
            await db.flush()
            return agenda
        return None