import datetime

from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship


from infra.database import Base


class MembroModel(Base):

    __tablename__ = "membro"

    id = Column(Integer, primary_key=True, index=True)
    nome: Mapped[str] = mapped_column(nullable=True)
    formacao_academica: Mapped[str] = mapped_column(nullable=True)
    experiencia: Mapped[str] = mapped_column(nullable=True)
    email: Mapped[str] = mapped_column(nullable=True, unique=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=datetime.datetime.now())
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=None, nullable=True)

    equipe_id: Mapped[int] = mapped_column(ForeignKey("equipe.id"), nullable=False)
    equipe: Mapped["EquipeModel"] = relationship(back_populates="membros_equipe")


class EquipeModel(Base):
    __tablename__ = "equipe"

    id = Column(Integer, primary_key=True, index=True)
    membros_equipe: Mapped[list["MembroModel"]] = relationship(back_populates="equipe")
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=datetime.datetime.now())
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=None, nullable=True)