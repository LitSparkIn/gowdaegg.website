from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional
from core.config import settings

class Database:
    """Database connection manager"""
    
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None

    async def connect(self):
        """Connect to MongoDB"""
        self.client = AsyncIOMotorClient(settings.MONGO_URL)
        self.db = self.client[settings.DB_NAME]
        
    async def disconnect(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()

    def get_db(self) -> AsyncIOMotorDatabase:
        """Get database instance"""
        if self.db is None:
            raise Exception("Database not initialized. Call connect() first.")
        return self.db

# Global database instance
database = Database()

async def get_database() -> AsyncIOMotorDatabase:
    """Dependency for getting database in routes"""
    return database.get_db()
