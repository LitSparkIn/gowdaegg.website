import os
from dotenv import load_dotenv
from pathlib import Path
from functools import lru_cache

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

class Settings:
    """Application settings loaded from environment variables"""
    
    # Database
    MONGO_URL: str = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    DB_NAME: str = os.environ.get('DB_NAME', 'gowda_egg_db')
    
    # JWT
    JWT_SECRET: str = os.environ.get('JWT_SECRET', 'gowda-egg-distributors-secret-key-2024')
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # CORS
    CORS_ORIGINS: list = os.environ.get('CORS_ORIGINS', '*').split(',')
    
    # App
    APP_NAME: str = "Gowda Egg Distributors API"
    DEBUG: bool = os.environ.get('DEBUG', 'False').lower() == 'true'

@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance"""
    return Settings()

settings = get_settings()
