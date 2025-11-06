from fastapi import APIRouter, Depends
from starlette.responses import JSONResponse

from infra.database import User
from domain.schemas.agenda_schema import AgendaInput
from domain.security.users import current_active_user
from sqlalchemy.ext.asyncio import AsyncSession
from infra.database import get_async_session
from repository.agenda.agenda_repository import AgendaRepository


agenda_r = APIRouter(prefix="/agenda")


@agenda_r.post("/agendamento")
async def marcar_agenda(
    agenda: AgendaInput,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    agenda_marcacao = await AgendaRepository().persistir_agenda(agenda=agenda, user=user, db=db)
    return agenda_marcacao

@agenda_r.get("/visualizacao")
async def visualizar_agenda(
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    agenda_visual = await AgendaRepository().visualizar_agenda(user=user, db=db)
    return agenda_visual

@agenda_r.put("/participar/{idagenda}")
async def participar_agenda(
    idagenda: int,
    agenda: dict,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    update_agenda = await AgendaRepository().update_agenda(id_agenda=idagenda, agenda=agenda, user=user, db=db)
    return update_agenda