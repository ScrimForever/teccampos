from fastapi import APIRouter, Depends
from infra.database import User
from domain.security.users import current_active_user


verify_router_user_questionario = APIRouter(prefix='/verification')


@verify_router_user_questionario.get('/verify-login')
async def verify_user_questionario(user: User = Depends(current_active_user)):
    if not user.questionario_finalizado:
        return False
    else:
        return True
