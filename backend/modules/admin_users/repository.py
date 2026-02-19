from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from modules.admin_users.models import AdminUserModel

class AdminUserRepository:
    """Repository for Admin User database operations."""
    
    COLLECTION_NAME = "admin_users"
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db[self.COLLECTION_NAME]
    
    async def create(self, admin: AdminUserModel) -> AdminUserModel:
        """Create a new admin user"""
        admin_dict = admin.model_dump()
        await self.collection.insert_one(admin_dict)
        return admin
    
    async def get_by_id(self, admin_id: str) -> Optional[dict]:
        """Get admin by ID"""
        return await self.collection.find_one({"id": admin_id}, {"_id": 0})
    
    async def get_by_email(self, email: str) -> Optional[dict]:
        """Get admin by email"""
        return await self.collection.find_one({"email": email}, {"_id": 0})
    
    async def get_all(self, include_inactive: bool = False) -> list[dict]:
        """Get all admin users"""
        query = {} if include_inactive else {"is_active": True}
        cursor = self.collection.find(query, {"_id": 0}).sort("created_at", -1)
        return await cursor.to_list(1000)
    
    async def update(self, admin_id: str, update_data: dict) -> Optional[dict]:
        """Update admin user"""
        result = await self.collection.find_one_and_update(
            {"id": admin_id},
            {"$set": update_data},
            return_document=True
        )
        if result:
            result.pop("_id", None)
        return result
    
    async def delete(self, admin_id: str) -> bool:
        """Hard delete admin user"""
        result = await self.collection.delete_one({"id": admin_id})
        return result.deleted_count > 0
    
    async def count(self, include_inactive: bool = False) -> int:
        """Count admin users"""
        query = {} if include_inactive else {"is_active": True}
        return await self.collection.count_documents(query)
