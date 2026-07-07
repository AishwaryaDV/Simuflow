from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str
    supabase_service_key: str
    supabase_jwt_secret: str
    frontend_url: str = "http://localhost:5173"
    cors_extra_origins: str = ""
    env: str = "development"
    log_level: str = "INFO"


settings = Settings()
