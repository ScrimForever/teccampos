import uuid

from fastapi_users import schemas
from uuid import UUID

class UserRead(schemas.BaseUser[uuid.UUID]):
    id: UUID
    is_consultor: bool
    is_visualizador: bool
    is_incubado: bool
    questionario_finalizado: bool | None


class UserCreate(schemas.BaseUserCreate):
    is_consultor: bool = False
    is_visualizador: bool = False




class UserUpdate(schemas.BaseUserUpdate):
    is_consultor: bool
    is_visualizador: bool