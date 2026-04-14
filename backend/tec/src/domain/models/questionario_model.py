import datetime
from uuid import UUID
from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from infra.database import Base
from domain.models.equipe_model import EquipeModel
from domain.models.planejamento_mercado_model import PlanejamentoMercadoModel
from domain.models.planejamento_financeiro_model import PlanejamentoFinanceiroModel


class QuestionarioModel(Base):

    __tablename__ = "questionario"

    id = Column(Integer, primary_key=True, index=True)
    usuario_associado: Mapped[str] = mapped_column(unique=True)
    nome_proponente: Mapped[str] = mapped_column(nullable=True, unique=True)
    nome_negocio: Mapped[str] = mapped_column(nullable=True, unique=True)
    setor_atuacao: Mapped[str] = mapped_column(nullable=True)
    cnpj: Mapped[str] = mapped_column(nullable=True)
    business_canvas: Mapped[str] = mapped_column(nullable=True)
    sumario_executivo: Mapped[str] = mapped_column(nullable=True)
    planejamento_produto: Mapped[str] = mapped_column(nullable=True)
    planejamento_marketing: Mapped[str] = mapped_column(nullable=True)
    planejamento_estrutura: Mapped[str] = mapped_column(nullable=True)
    equipe: Mapped[int | None] = mapped_column(ForeignKey("equipe.id", ondelete="CASCADE"), nullable=True, default=None)
    planejamento_mercado: Mapped[int | None] = mapped_column(ForeignKey("planejamento_mercado.id", ondelete="CASCADE"), nullable=True, default=None)
    planejamento_financeiro: Mapped[int | None] = mapped_column(ForeignKey("planejamento_financeiro.id", ondelete="CASCADE"), nullable=True, default=None)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=datetime.datetime.now())
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=None, nullable=True)

    planejamento_mercado_rel: Mapped[PlanejamentoMercadoModel | None] = relationship(
        "PlanejamentoMercadoModel",
        foreign_keys=[planejamento_mercado],
        lazy="select"
    )