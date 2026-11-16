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

    # ICICI UPI (keep credentials and key material outside the repository)
    ICICI_UPI_ENABLED: bool = os.environ.get('ICICI_UPI_ENABLED', 'False').lower() == 'true'
    ICICI_UPI_QR_URL: str = os.environ.get(
        'ICICI_UPI_QR_URL',
        'https://apibankingonesandbox.icici.bank.in/api/MerchantAPI/UPI/v0/QR3/614174'
    )
    ICICI_UPI_API_KEY: str = os.environ.get('ICICI_UPI_API_KEY', '')
    ICICI_UPI_MERCHANT_ID: str = os.environ.get('ICICI_UPI_MERCHANT_ID', '614174')
    ICICI_UPI_TERMINAL_ID: str = os.environ.get('ICICI_UPI_TERMINAL_ID', '6012')
    ICICI_UPI_VPA: str = os.environ.get('ICICI_UPI_VPA', 'TECHPAYLOGICUAT@icici')
    ICICI_UPI_MERCHANT_NAME: str = os.environ.get('ICICI_UPI_MERCHANT_NAME', 'Gowda Egg')
    ICICI_UPI_BANK_CERT_PATH: str = os.environ.get('ICICI_UPI_BANK_CERT_PATH', '')
    ICICI_UPI_PRIVATE_KEY_PATH: str = os.environ.get('ICICI_UPI_PRIVATE_KEY_PATH', '')
    ICICI_UPI_PRIVATE_KEY_PASSWORD: str = os.environ.get('ICICI_UPI_PRIVATE_KEY_PASSWORD', '')
    ICICI_UPI_MERCHANT_CERT_PATH: str = os.environ.get('ICICI_UPI_MERCHANT_CERT_PATH', '')
    ICICI_UPI_TIMEOUT_SECONDS: float = float(os.environ.get('ICICI_UPI_TIMEOUT_SECONDS', '30'))

@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance"""
    return Settings()

settings = get_settings()
