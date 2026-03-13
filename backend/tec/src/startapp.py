import sys

from fastapi import FastAPI, Depends
from fastapi import Request, Response

from contextlib import asynccontextmanager
from starlette.middleware.base import BaseHTTPMiddleware
from opentelemetry import trace
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import StreamingResponse
import json
from infra.database import create_db_and_tables, User
from domain.schemas.user_schema import UserRead, UserCreate, UserUpdate
from domain.security.users import auth_backend, current_active_user, fastapi_users

from routers.user_status.user_status import user_status_router
from routers.questionario.questionario import questionario_router
from routers.planejamento_mercado.planejamento_mercado import planejamento_mercado_router

import logfire


logfire.configure()

class TraceIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        try:
            span = trace.get_current_span()
            if span.is_recording():
                span_context = span.get_span_context()
                if span_context.is_valid:
                    trace_id = format(span_context.trace_id, "032x")
                    response.headers["X-Trace-ID"] = trace_id
        except Exception as e:
            logfire.warn(f"Failed to add trace ID to response: {e}")
        return response


class LogResponseBodyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Só captura responses JSON e de sucesso
        if (
                response.status_code < 400
                and response.headers.get("content-type", "").startswith("application/json")
        ):
            response_body = b""
            async for chunk in response.body_iterator:
                response_body += chunk

            try:
                body_json = json.loads(response_body.decode())

                # Loga o response body no Logfire
                logfire.info(
                    f"{request.method} {request.url.path} - Response",
                    response_body=body_json,
                    status_code=response.status_code,
                    path=request.url.path,
                    method=request.method
                )
            except (json.JSONDecodeError, UnicodeDecodeError) as e:
                logfire.warn(f"Failed to parse response body: {e}")

            # Recria o response com o body
            return Response(
                content=response_body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type
            )

        return response

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

app.add_middleware(LogResponseBodyMiddleware)
app.add_middleware(TraceIDMiddleware)


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
    user_status_router
)

app.include_router(
    questionario_router
)

app.include_router(
    planejamento_mercado_router
)
@app.get("/teste")
async def rota_teste(response: Response):
    return {"trace": "ok"}
@app.get("/authenticated-route")
async def authenticated_route(user: User = Depends(current_active_user)):
    return {"message": f"Hello {user.email}!"}

