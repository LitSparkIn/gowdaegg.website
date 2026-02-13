from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from modules.shop.models import ShopModel

class ShopRepository:
    """
    Repository for Shop database operations.
    Handles all direct database interactions for shops.
    """
    
    COLLECTION_NAME = "shops"
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db[self.COLLECTION_NAME]
    
    async def create(self, shop: ShopModel) -> ShopModel:
        """Create a new shop in the database"""
        shop_dict = shop.model_dump()
        await self.collection.insert_one(shop_dict)
        return shop
    
    async def get_by_id(self, shop_id: str) -> Optional[dict]:
        """Get a shop by its ID"""
        return await self.collection.find_one({"id": shop_id}, {"_id": 0})
    
    async def get_all(self, skip: int = 0, limit: int = 1000, route_id: Optional[str] = None) -> list[dict]:
        """Get all shops with optional filtering by route"""
        query = {}
        if route_id:
            query["route_id"] = route_id
            
        cursor = self.collection.find(query, {"_id": 0}).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)
    
    async def get_count(self, route_id: Optional[str] = None) -> int:
        """Get total count of shops"""
        query = {}
        if route_id:
            query["route_id"] = route_id
        return await self.collection.count_documents(query)
    
    async def update(self, shop_id: str, update_data: dict) -> Optional[dict]:
        """Update a shop by ID"""
        result = await self.collection.update_one(
            {"id": shop_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0 and result.matched_count == 0:
            return None
            
        return await self.get_by_id(shop_id)
    
    async def delete(self, shop_id: str) -> bool:
        """Delete a shop by ID"""
        result = await self.collection.delete_one({"id": shop_id})
        return result.deleted_count > 0
    
    async def exists(self, shop_id: str) -> bool:
        """Check if a shop exists"""
        return await self.collection.count_documents({"id": shop_id}) > 0
    
    async def get_by_phone(self, phone: str) -> Optional[dict]:
        """Get a shop by phone number"""
        return await self.collection.find_one({"phone": phone}, {"_id": 0})
