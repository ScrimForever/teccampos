import datetime

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from domain.models.agenda_model import Agenda
from domain.schemas.agenda_schema import AgendaInput, AgendaParticipacaoInput, AgendaOutput


def _parse_date(value: str) -> datetime.date:
    return datetime.date.fromisoformat(value)


def _parse_hour(value: str) -> int:
    """Accepts '09:00' or '9' and returns the integer hour."""
    return int(str(value).split(":")[0])


def _dates_overlap(start_a: datetime.date, end_a: datetime.date, start_b: datetime.date, end_b: datetime.date) -> bool:
    return start_a <= end_b and end_a >= start_b


def _times_overlap(h_start_a: int, h_end_a: int, h_start_b: int, h_end_b: int) -> bool:
    return h_start_a < h_end_b and h_end_a > h_start_b


def _has_conflict(new_c: dict, existing_c: dict) -> bool:
    """Return True if the two compromissos overlap in date AND time."""
    try:
        new_date_start = _parse_date(new_c["dataInicio"])
        new_date_end = _parse_date(new_c["dataFim"])
        ex_date_start = _parse_date(existing_c["dataInicio"])
        ex_date_end = _parse_date(existing_c["dataFim"])
    except (KeyError, ValueError):
        return False

    if not _dates_overlap(new_date_start, new_date_end, ex_date_start, ex_date_end):
        return False

    new_open = new_c.get("ehCompromisoAberto", False)
    ex_open = existing_c.get("ehCompromisoAberto", False)

    if new_open or ex_open:
        return True

    try:
        return _times_overlap(
            _parse_hour(new_c["horaInicio"]),
            _parse_hour(new_c["horaFim"]),
            _parse_hour(existing_c["horaInicio"]),
            _parse_hour(existing_c["horaFim"]),
        )
    except (KeyError, ValueError):
        return False


class AgendaRepository:

    @staticmethod
    async def _get_existing_compromissos(consultor_email: str, db_session: AsyncSession) -> list[dict]:
        """Return all compromissos already saved for a given consultant."""
        stmt = select(Agenda).where(Agenda.consultor_email == consultor_email)
        result = await db_session.execute(stmt)
        agendas = result.scalars().all()

        compromissos: list[dict] = []
        for a in agendas:
            inner = a.agenda_json.get("agenda_json", {})
            compromissos.extend(inner.get("compromissos", []))
        return compromissos

    @staticmethod
    async def get_all(db_session: AsyncSession) -> list[AgendaOutput]:
        logger.info("Fetching all agenda records")
        stmt = select(Agenda)
        result = await db_session.execute(stmt)
        agendas = result.scalars().all()
        return [AgendaOutput.model_validate(a) for a in agendas]

    @staticmethod
    async def create(agenda_input: AgendaInput, consultor_email: str, db_session: AsyncSession) -> AgendaOutput:
        logger.info(f"Creating agenda for consultor: {consultor_email}")

        new_compromissos: list[dict] = agenda_input.agenda_json.get("compromissos", [])
        existing = await AgendaRepository._get_existing_compromissos(consultor_email, db_session)

        for new_c in new_compromissos:
            for ex_c in existing:
                if _has_conflict(new_c, ex_c):
                    msg = (
                        f"Conflito de horário: já existe um agendamento para o período "
                        f"{ex_c.get('dataInicio')} a {ex_c.get('dataFim')} "
                        f"das {ex_c.get('horaInicio')} às {ex_c.get('horaFim')}."
                    )
                    logger.warning(msg)
                    raise HTTPException(status_code=409, detail=msg)

        agenda = Agenda(
            agenda_json=agenda_input.model_dump(),
            consultor_email=consultor_email
        )
        db_session.add(agenda)
        await db_session.commit()
        await db_session.refresh(agenda)
        logger.success(f"Created agenda with id: {agenda.id}")
        return AgendaOutput.model_validate(agenda)

    @staticmethod
    async def update_agenda(
        agenda_id: int,
        agenda_input: AgendaInput,
        consultor_email: str,
        db_session: AsyncSession,
    ) -> AgendaOutput | None:
        logger.info(f"Updating agenda {agenda_id} for consultor: {consultor_email}")

        stmt = select(Agenda).where(Agenda.id == agenda_id)
        result = await db_session.execute(stmt)
        agenda = result.scalar_one_or_none()

        if not agenda:
            logger.warning(f"Agenda {agenda_id} not found")
            return None

        new_compromissos: list[dict] = agenda_input.agenda_json.get("compromissos", [])

        # Busca compromissos existentes excluindo o próprio registro sendo editado
        stmt_others = select(Agenda).where(
            Agenda.consultor_email == consultor_email,
            Agenda.id != agenda_id,
        )
        result_others = await db_session.execute(stmt_others)
        other_agendas = result_others.scalars().all()

        existing: list[dict] = []
        for a in other_agendas:
            inner = a.agenda_json.get("agenda_json", {})
            existing.extend(inner.get("compromissos", []))

        for new_c in new_compromissos:
            for ex_c in existing:
                if _has_conflict(new_c, ex_c):
                    msg = (
                        f"Conflito de horário: já existe um agendamento para o período "
                        f"{ex_c.get('dataInicio')} a {ex_c.get('dataFim')} "
                        f"das {ex_c.get('horaInicio')} às {ex_c.get('horaFim')}."
                    )
                    logger.warning(msg)
                    raise HTTPException(status_code=409, detail=msg)

        stmt_upd = (
            update(Agenda)
            .where(Agenda.id == agenda_id)
            .values(
                agenda_json=agenda_input.model_dump(),
                updated_at=datetime.datetime.now(datetime.timezone.utc),
            )
        )
        await db_session.execute(stmt_upd)
        await db_session.commit()

        refreshed = await db_session.execute(select(Agenda).where(Agenda.id == agenda_id))
        agenda = refreshed.scalar_one()
        logger.success(f"Updated agenda {agenda_id}")
        return AgendaOutput.model_validate(agenda)

    @staticmethod
    async def update_participacao(
        agenda_id: int,
        participacao: AgendaParticipacaoInput,
        incubado_email: str,
        db_session: AsyncSession,
    ) -> AgendaOutput | None:
        logger.info(f"Incubado {incubado_email} reserving slot in agenda {agenda_id}")

        stmt = select(Agenda).where(Agenda.id == agenda_id)
        result = await db_session.execute(stmt)
        agenda = result.scalar_one_or_none()

        if not agenda:
            logger.warning(f"Agenda {agenda_id} not found")
            return None

        inner = agenda.agenda_json.get("agenda_json", {})
        compromissos: list[dict] = inner.get("compromissos", [])

        # Find target compromisso
        compromisso = next((c for c in compromissos if c.get("id") == participacao.compromisso_id), None)
        if not compromisso:
            raise HTTPException(status_code=404, detail="Compromisso não encontrado")

        # Validate data is within slot date range
        data = _parse_date(participacao.data)
        slot_date_start = _parse_date(compromisso["dataInicio"])
        slot_date_end = _parse_date(compromisso["dataFim"])
        if not (slot_date_start <= data <= slot_date_end):
            raise HTTPException(status_code=400, detail="Data fora do range do agendamento")

        # Validate hours are within slot hour range
        h_inicio = _parse_hour(participacao.hora_inicio)
        h_fim = _parse_hour(participacao.hora_fim)
        slot_h_inicio = _parse_hour(compromisso["horaInicio"])
        slot_h_fim = _parse_hour(compromisso["horaFim"])

        if h_inicio < slot_h_inicio or h_fim > slot_h_fim:
            raise HTTPException(
                status_code=400,
                detail=f"Horário fora do range do agendamento ({compromisso['horaInicio']} às {compromisso['horaFim']})"
            )
        if h_inicio >= h_fim or (h_fim - h_inicio) < 1:
            raise HTTPException(status_code=400, detail="Duração mínima é de 1 hora inteira")

        reservas: list[dict] = compromisso.get("reservas", [])

        # Check current user does not already have a reserva in this slot
        for r in reservas:
            if r.get("incubado") == incubado_email:
                raise HTTPException(
                    status_code=409,
                    detail=f"Você já possui uma reserva neste agendamento: {r['horaInicio']}–{r['horaFim']} em {r['data']}"
                )

        # Check no overlap with existing reservas on the same day
        for r in reservas:
            if r.get("data") != participacao.data:
                continue
            if _times_overlap(h_inicio, h_fim, _parse_hour(r["horaInicio"]), _parse_hour(r["horaFim"])):
                raise HTTPException(
                    status_code=409,
                    detail=f"Horário conflita com reserva existente: {r['horaInicio']}–{r['horaFim']} ({r['incubado']})"
                )

        # Append new reservation
        nova_reserva = {
            "incubado": incubado_email,
            "empresa": participacao.empresa,
            "horaInicio": f"{str(h_inicio).zfill(2)}:00",
            "horaFim": f"{str(h_fim).zfill(2)}:00",
            "data": participacao.data,
            "dataParticipacao": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
        compromisso["reservas"] = reservas + [nova_reserva]

        updated_agenda_json = {"agenda_json": {**inner, "compromissos": compromissos}}
        stmt = (
            update(Agenda)
            .where(Agenda.id == agenda_id)
            .values(agenda_json=updated_agenda_json, updated_at=datetime.datetime.now(datetime.timezone.utc))
        )
        await db_session.execute(stmt)
        await db_session.commit()

        refreshed = await db_session.execute(select(Agenda).where(Agenda.id == agenda_id))
        agenda = refreshed.scalar_one()
        logger.success(f"Reserva adicionada na agenda {agenda_id} para {incubado_email}")
        return AgendaOutput.model_validate(agenda)
