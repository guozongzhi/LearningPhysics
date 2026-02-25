from pydantic_settings import BaseSettings, SettingsConfigDict
import secrets

class Settings(BaseSettings):
    # The default DATABASE_URL is for a local PostgreSQL instance
    # using the default user "postgres" and password "postgres",
    # connecting to a database named "leaningphysics".
    # Format: postgresql+asyncpg://USER:PASSWORD@HOST:PORT/DATABASE
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/leaningphysics"

    # AI API Configuration (supports OpenAI, Gemini, Doubao via OpenAI-compatible interface)
    # Set OPENAI_BASE_URL to use a different provider:
    #   Gemini:  https://generativelanguage.googleapis.com/v1beta/openai
    #   Doubao:  https://ark.cn-beijing.volces.com/api/v3
    #   OpenAI:  https://api.openai.com/v1  (default)
    OPENAI_API_KEY: str = "YOUR_OPENAI_API_KEY"
    OPENAI_BASE_URL: str = ""
    OPENAI_MODEL: str = "gpt-4-turbo-preview"

    # Secret key for JWT tokens - generate a random one if not provided
    SECRET_KEY: str = secrets.token_urlsafe(32) if not __name__ == "__main__" else "dev-secret-key"

    # Token expiration
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding='utf-8')

settings = Settings()
