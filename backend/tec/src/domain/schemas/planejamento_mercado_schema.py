from pydantic import BaseModel


class PlanejamentoMercadoSchema(BaseModel):
    ...

class PlanejamentoMercadoInput(PlanejamentoMercadoSchema):

    fornecedores: str | None = None
    concorrentes: str | None = None
    analise_acao: str | None = None
    upload_file_path: str | None = None
