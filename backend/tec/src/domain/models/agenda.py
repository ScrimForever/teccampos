from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import JSON, DateTime, String
from infra.database import Base
import datetime


class Agenda(Base):

    __tablename__ = "agenda"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    agenda_json: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=datetime.datetime.now())

