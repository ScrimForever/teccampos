import datetime
from pydantic import BaseModel


class AgendaSchema(BaseModel):
    pass


class AgendaInput(AgendaSchema):
    agenda_json: dict


class AgendaOutput(AgendaSchema):
    id: int
    agenda_json: dict
    created_at: datetime.datetime