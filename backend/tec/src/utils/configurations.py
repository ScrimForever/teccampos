from pydantic_settings import SettingsConfigDict, BaseSettings
from pydantic import computed_field

class Configuration(BaseSettings):

    model_config = SettingsConfigDict(env_file="/var/www/app/backend/tec/.env")

    X_S: str = ""

    @computed_field
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://postgres:{self.X_S}@localhost/postgres"

config = Configuration()

