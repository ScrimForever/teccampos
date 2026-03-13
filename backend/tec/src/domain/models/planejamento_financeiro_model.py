import datetime

from sqlalchemy import Column, Integer, ARRAY, String, DateTime
from typing import List
from sqlalchemy.orm import Mapped, mapped_column


from infra.database import Base


class PlanejamentoFinanceiroModel(Base):
    __tablename__ = "planejamento_financeiro"

    id = Column(Integer, primary_key=True, index=True)
    multiple_files: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=datetime.datetime.now())
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=None, nullable=True)
