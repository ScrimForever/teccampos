from fastapi import APIRouter, Depends, HTTPException
from typing import Annotated
from sqlalchemy.ext.asyncio import AsyncSession

from infra.database import get_async_session, User
from domain.security.users import current_active_user
from domain.schemas.agenda_schema import AgendaInput, AgendaLoteInput, AgendaParticipacaoInput, AgendaOutput
from repository.agenda.agenda_repository import AgendaRepository

agenda_router = APIRouter(prefix="/agenda", tags=["agenda"])


@agenda_router.get("/visualizacao", response_model=list[AgendaOutput])
async def get_agenda(
    db: Annotated[AsyncSession, Depends(get_async_session)],
    user: User = Depends(current_active_user)
):
    return await AgendaRepository.get_all(db)


@agenda_router.post("/agendamento/lote", response_model=list[AgendaOutput])
async def create_agendamento_lote(
    lote: AgendaLoteInput,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    user: User = Depends(current_active_user)
):
    if not user.is_consultant:
        raise HTTPException(status_code=403, detail="Apenas consultores podem criar agendamentos")
    return await AgendaRepository.create_lote(lote, user.email, db)


@agenda_router.post("/agendamento", response_model=AgendaOutput)
async def create_agendamento(
    agenda: AgendaInput,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    user: User = Depends(current_active_user)
):
    if not user.is_consultant:
        raise HTTPException(status_code=403, detail="Apenas consultores podem criar agendamentos")
    return await AgendaRepository.create(agenda, user.email, db)


@agenda_router.put("/agendamento/{agenda_id}", response_model=AgendaOutput)
async def update_agendamento(
    agenda_id: int,
    agenda: AgendaInput,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    user: User = Depends(current_active_user)
):
    if not user.is_consultant:
        raise HTTPException(status_code=403, detail="Apenas consultores podem editar agendamentos")
    result = await AgendaRepository.update_agenda(agenda_id, agenda, user.email, db)
    if not result:
        raise HTTPException(status_code=404, detail="Agenda não encontrada")
    return result


@agenda_router.put("/participar/{agenda_id}", response_model=AgendaOutput)
async def participar_agendamento(
    agenda_id: int,
    participacao: AgendaParticipacaoInput,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    user: User = Depends(current_active_user)
):
    if not user.is_incubated:
        raise HTTPException(status_code=403, detail="Apenas usuários incubados podem participar de agendamentos")
    result = await AgendaRepository.update_participacao(agenda_id, participacao, user.email, db)
    if not result:
        raise HTTPException(status_code=404, detail="Agenda não encontrada")
    return result
