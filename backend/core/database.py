from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional
import logging
from core.config import settings

logger = logging.getLogger(__name__)

class Database:
    """Database connection manager"""
    
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None

    async def connect(self):
        """Connect to MongoDB"""
        self.client = AsyncIOMotorClient(settings.MONGO_URL)
        self.db = self.client[settings.DB_NAME]
        # Create indexes for performance optimization
        await self._create_indexes()
    
    async def _create_indexes(self):
        """Create indexes on frequently queried fields for performance"""
        try:
            # Sales collection indexes
            await self.db.sales.create_index("sale_date")
            await self.db.sales.create_index("salesman_id")
            await self.db.sales.create_index("shop_id")
            await self.db.sales.create_index([("sale_date", -1), ("salesman_id", 1)])
            await self.db.sales.create_index([("sale_date", -1), ("shop_id", 1)])
            
            # Purchases collection indexes
            await self.db.purchases.create_index("purchase_date")
            await self.db.purchases.create_index("supplier_id")
            await self.db.purchases.create_index([("purchase_date", -1)])
            
            # Initial loads collection indexes
            await self.db.initial_loads.create_index("load_date")
            await self.db.initial_loads.create_index("salesman_id")
            await self.db.initial_loads.create_index([("load_date", -1), ("salesman_id", 1)])
            
            # Sale reports collection indexes
            await self.db.sale_reports.create_index("report_date")
            await self.db.sale_reports.create_index("salesman_id")
            await self.db.sale_reports.create_index([("report_date", -1), ("salesman_id", 1)])
            
            # Expenses collection indexes
            await self.db.expenses.create_index("expense_date")
            await self.db.expenses.create_index([("expense_date", -1)])
            
            logger.info("Database indexes created successfully")
        except Exception as e:
            logger.warning(f"Error creating indexes (may already exist): {e}")
        
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
