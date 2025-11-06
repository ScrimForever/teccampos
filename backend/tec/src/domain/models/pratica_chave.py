from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import JSON, DateTime, String
from infra.database import Base
import datetime


class PraticaChave(Base):

    __tablename__ = "praticachave"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    pratica_chave: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=datetime.datetime.now())
    created_by: Mapped[str] = mapped_column(String(255))

