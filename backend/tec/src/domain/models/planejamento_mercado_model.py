import datetime

from sqlalchemy import Column, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column



from infra.database import Base


class PlanejamentoMercadoModel(Base):
    __tablename__ = "planejamento_mercado"

    id = Column(Integer, primary_key=True, index=True)
    fornecedores: Mapped[str] = mapped_column(nullable=True)
    concorrentes: Mapped[str] = mapped_column(nullable=True)
    analise_acao: Mapped[str] = mapped_column(nullable=True)
    usuario_associado: Mapped[str] = mapped_column(ForeignKey("user.email", onupdate="CASCADE", ondelete="CASCADE"), unique=True)
    upload_file_path: Mapped[str] = mapped_column(nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=datetime.datetime.now())
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=None, nullable=True)