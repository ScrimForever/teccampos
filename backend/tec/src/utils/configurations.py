from pydantic_settings import SettingsConfigDict, BaseSettings


class Configuration(BaseSettings):

    model_config = SettingsConfigDict()

    X_S: str = ""
    DATABASE_URL: str = f"postgresql+asyncpg://postgres:{X_S}@localhost/postgres"


config = Configuration()

