from pydantic import BaseModel


class UserStatusOutput(BaseModel):
    user_email: str
    status_type: str