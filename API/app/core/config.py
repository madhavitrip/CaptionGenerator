import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

# Load .env file first
load_dotenv()


class Settings(BaseSettings):
    database_url: str
    gemini_api_key: str

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        case_sensitive=False
    )


settings = Settings()

# Verify API key is loaded
if not settings.gemini_api_key or settings.gemini_api_key == "your_gemini_api_key_here":
    raise ValueError("GEMINI_API_KEY not set in .env file. Get one from https://aistudio.google.com/apikey")

GEMINI_API_KEY = settings.gemini_api_key
