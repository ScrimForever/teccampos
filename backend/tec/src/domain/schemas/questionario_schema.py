from uuid import UUID

from pydantic import BaseModel


class QuestionarioSchema(BaseModel):
    ...


class QuestionarioInput(QuestionarioSchema):

    nome_proponente: str | None = None
    usuario_associado: str = None
    nome_negocio: str | None = None
    setor_atuacao: str | None = None
    cnpj: str | None = None
    business_canvas: str | None = None
    sumario_executivo: str | None = None
    equipe: int | None = None
    planejamento_produto: str | None = None
    planejamento_mercado: int | None = None
    planejamento_marketing: str | None = None
    planejamento_estrutura: str | None = None
    planejamento_financeiro: int | None = None