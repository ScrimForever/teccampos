from pydantic_settings import SettingsConfigDict, BaseSettings


class Configuration(BaseSettings):

    model_config = SettingsConfigDict()

    DATABASE_URL: str = "postgresql+asyncpg://postgres:@localhost/postgres"


config = Configuration()

