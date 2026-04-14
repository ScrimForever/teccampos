import datetime

from sqlalchemy import Column, Integer, DateTime, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from infra.database import Base


class Agenda(Base):

    __tablename__ = "agenda"

    id = Column(Integer, primary_key=True, index=True)
    agenda_json = Column(JSONB, nullable=False)
    consultor_email: Mapped[str] = mapped_column(String, nullable=True, index=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=datetime.datetime.now())
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=None, nullable=True)