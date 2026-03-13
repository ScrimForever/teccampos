import datetime

from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column


from infra.database import Base


class UserStatus(Base):

    __tablename__ = "user_status"

    id = Column(Integer, primary_key=True, index=True)
    user_email: Mapped[str] = mapped_column(ForeignKey("user.email"), index=True)
    status_type: Mapped[str] = mapped_column(default="in_progress")
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=datetime.datetime.now())
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=None, nullable=True)