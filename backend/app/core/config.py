from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # The default DATABASE_URL is for a local PostgreSQL instance
    # using the default user "postgres" and password "postgres",
    # connecting to a database named "leaningphysics".
    # Format: postgresql+asyncpg://USER:PASSWORD@HOST:PORT/DATABASE
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/leaningphysics"
    
    # OpenAI API Key for AI analysis features.
    OPENAI_API_KEY: str = "YOUR_OPENAI_API_KEY"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding='utf-8')

settings = Settings()
