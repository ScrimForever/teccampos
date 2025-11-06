import sys

from fastapi import FastAPI, Depends
from contextlib import asynccontextmanager

from starlette.middleware.cors import CORSMiddleware
from infra.database import create_db_and_tables, User
from domain.schemas.user_schema import UserRead, UserCreate, UserUpdate
from domain.security.users import auth_backend, current_active_user, fastapi_users
import logfire

from routers.verifications.verification_users import verify_router_user_questionario
from routers.verifications.verification_questionario import verificar_questionario_preenchido
from routers.questionario.questionario import questionario_router
from routers.aprovar.aprovar_r import plano_router
from routers.agenda.agenda_router import agenda_r
from routers.praticachave.agenda_router import pratica_chave_r

logfire.configure()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await create_db_and_tables()
    except ConnectionRefusedError:
        logfire.error("Banco de dados não está conectando.")
        sys.exit(0)
    yield

origins = ["*"]

app = FastAPI(
    description="Tec Campos API",
    version="2.0",
    lifespan=lifespan
)

logfire.instrument_fastapi(app, capture_headers=True)
logfire.instrument_httpx()
logfire.instrument_pydantic()
logfire.instrument_sqlalchemy()
logfire.instrument_system_metrics()

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    fastapi_users.get_auth_router(auth_backend), prefix="/auth/jwt", tags=["auth"]
)
app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_reset_password_router(),
    prefix="/auth",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_verify_router(UserRead),
    prefix="/auth",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"],
)

app.include_router(
    verify_router_user_questionario,
    tags=["verifications"]
)

app.include_router(
    verificar_questionario_preenchido,
    tags=["verifications"]
)

app.include_router(
    questionario_router,
    tags=["questionarios"]
)

app.include_router(
    plano_router,
    tags=["aprovacao"]
)

app.include_router(
    agenda_r,
    tags=["agenda"]
)

app.include_router(
    pratica_chave_r,
    tags=["pratica-chave"]
)


@app.get("/authenticated-route")
async def authenticated_route(user: User = Depends(current_active_user)):
    return {"message": f"Hello {user.email}!"}


