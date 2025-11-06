import datetime
from pydantic import BaseModel


class PraticaChaveSchema(BaseModel):
    pass


class PraticaChaveSchemaInput(PraticaChaveSchema):
    pratica_chave: dict


class PraticaChaveSchemaOutput(PraticaChaveSchema):
    id: int
    pratica_chave: dict
    created_at: datetime.datetime
    created_by: str