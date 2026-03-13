import uuid

from fastapi_users import schemas
from uuid import UUID

class UserRead(schemas.BaseUser[uuid.UUID]):
    id: UUID
    is_consultant: bool
    is_viewer: bool
    is_incubated: bool


class UserCreate(schemas.BaseUserCreate):
    is_consultant: bool = False
    is_viewer: bool = False
    is_incubated: bool = False



class UserUpdate(schemas.BaseUserUpdate):
    is_consultant: bool
    is_incubated: bool