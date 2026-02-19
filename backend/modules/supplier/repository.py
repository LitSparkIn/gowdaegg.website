from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from modules.supplier.models import SupplierModel

class SupplierRepository:
    """Repository for Supplier database operations."""
    
    COLLECTION_NAME = "suppliers"
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db[self.COLLECTION_NAME]
    
    async def create(self, supplier: SupplierModel) -> SupplierModel:
        """Create a new supplier"""
        supplier_dict = supplier.model_dump()
        await self.collection.insert_one(supplier_dict)
        return supplier
    
    async def get_by_id(self, supplier_id: str) -> Optional[dict]:
        """Get a supplier by ID"""
        return await self.collection.find_one({"id": supplier_id}, {"_id": 0})
    
    async def get_all(self, skip: int = 0, limit: int = 1000) -> list[dict]:
        """Get all active suppliers"""
        query = {"$or": [{"is_active": True}, {"is_active": {"$exists": False}}]}
        cursor = self.collection.find(query, {"_id": 0}).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)
    
    async def get_inactive(self, skip: int = 0, limit: int = 1000) -> list[dict]:
        """Get all inactive suppliers"""
        cursor = self.collection.find({"is_active": False}, {"_id": 0}).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)
    
    async def get_count(self) -> int:
        """Get total count of active suppliers"""
        query = {"$or": [{"is_active": True}, {"is_active": {"$exists": False}}]}
        return await self.collection.count_documents(query)
    
    async def update(self, supplier_id: str, update_data: dict) -> Optional[dict]:
        """Update a supplier by ID"""
        result = await self.collection.update_one(
            {"id": supplier_id},
            {"$set": update_data}
        )
        if result.modified_count == 0 and result.matched_count == 0:
            return None
        return await self.get_by_id(supplier_id)
    
    async def delete(self, supplier_id: str) -> bool:
        """Soft delete a supplier by ID (set is_active to False)"""
        result = await self.collection.update_one(
            {"id": supplier_id},
            {"$set": {"is_active": False}}
        )
        return result.modified_count > 0
    
    async def exists(self, supplier_id: str) -> bool:
        """Check if a supplier exists"""
        return await self.collection.count_documents({"id": supplier_id}) > 0
    
    async def get_by_name(self, name: str) -> Optional[dict]:
        """Get a supplier by name"""
        return await self.collection.find_one({"name": name}, {"_id": 0})
