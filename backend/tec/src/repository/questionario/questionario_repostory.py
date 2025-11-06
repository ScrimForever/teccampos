from sqlalchemy import select
from infra.database import User
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logfire

class QuestionarioRepository:

    async def search_questionario_preenchido_by_user(self, user: User, db: AsyncSession):
        logfire.info(f"User: {user.email} está pesquisando pelo questionário preenchido")
        stmt = select(User.questionario_json).where(User.email == user.email)
        result = await db.execute(stmt)
        if result is not None:
            return result.scalars().first()
        logfire.info(f"Nenhum questionário preenchido.")
        return None

    async def save_questionario(self, finalizado: bool | None, questionario_json: dict, user: User, db: AsyncSession):
        logfire.info(f"User: {user.email} está fazendo update no questionário preenchido")
        stmt = select(User).where(User.email == user.email)
        result = await db.execute(stmt)
        questionario = result.scalars().first()
        if questionario:
            if finalizado:
                questionario.questionario_finalizado = True
                questionario.questionario_json = questionario_json
            else:
                questionario.questionario_json = questionario_json
            await db.commit()
            logfire.notice("Pesquisa realizada com sucesso.")
            return questionario
        logfire.info("Nenhum update foi realizado.")
        return None


    async def list_questionario_aprovacao(self, user: User, db: AsyncSession):
        logfire.info(f"User: {user.email} está listando os questionários que precisam de aprovação.")
        stmt = select(User.id, User.questionario_json, User.email).where(
            (User.questionario_finalizado == True) &
            (User.is_incubado == False) &
            (User.is_active == True) &
            (User.is_consultor == False)
        )

        result = await db.execute(stmt)
        rows = result.all()

        response = [
            {
                "questionario_id": id,
                "email": email,
                "questionario": questionario_json
            }
            for id, questionario_json, email in rows
        ]
        return response

