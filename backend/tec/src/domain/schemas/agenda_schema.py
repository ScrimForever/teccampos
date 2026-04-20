from pydantic import BaseModel
from pydantic import ConfigDict


class AgendaInput(BaseModel):
    agenda_json: dict


class AgendaLoteInput(BaseModel):
    agendamentos: list[AgendaInput]


class AgendaParticipacaoInput(BaseModel):
    compromisso_id: int
    hora_inicio: str   # "09:00"
    hora_fim: str      # "11:00"
    data: str          # "YYYY-MM-DD"
    empresa: str = ''


class AgendaOutput(BaseModel):
    id: int
    agenda_json: dict
    consultor_email: str | None = None

    model_config = ConfigDict(from_attributes=True)