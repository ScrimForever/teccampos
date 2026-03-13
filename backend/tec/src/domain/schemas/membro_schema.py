from pydantic import BaseModel


class MembroSchema(BaseModel):
    ...


class MembroInput(MembroSchema):

    nome: str
    formacao_academica: str | None = None
    experiencia: str | None = None
    email: str | None = None
    telefone: str | None = None

    equipe_id: int