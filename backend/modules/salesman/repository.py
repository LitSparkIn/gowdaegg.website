from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from modules.salesman.models import SalesmanModel

class SalesmanRepository:
    """
    Repository for Salesman database operations.
    """
    
    COLLECTION_NAME = "salesmen"
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db[self.COLLECTION_NAME]
    
    async def create(self, salesman: SalesmanModel) -> SalesmanModel:
        """Create a new salesman in the database"""
        salesman_dict = salesman.model_dump()
        await self.collection.insert_one(salesman_dict)
        return salesman
    
    async def get_by_id(self, salesman_id: str) -> Optional[dict]:
        """Get a salesman by ID"""
        return await self.collection.find_one({"id": salesman_id}, {"_id": 0})
    
    async def get_all(self, skip: int = 0, limit: int = 1000, route_id: Optional[str] = None) -> list[dict]:
        """Get all salesmen with optional filtering by route"""
        query = {}
        if route_id:
            query["route_id"] = route_id
            
        cursor = self.collection.find(query, {"_id": 0}).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)
    
    async def get_count(self, route_id: Optional[str] = None) -> int:
        """Get total count of salesmen"""
        query = {}
        if route_id:
            query["route_id"] = route_id
        return await self.collection.count_documents(query)
    
    async def update(self, salesman_id: str, update_data: dict) -> Optional[dict]:
        """Update a salesman by ID"""
        result = await self.collection.update_one(
            {"id": salesman_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0 and result.matched_count == 0:
            return None
            
        return await self.get_by_id(salesman_id)
    
    async def delete(self, salesman_id: str) -> bool:
        """Delete a salesman by ID"""
        result = await self.collection.delete_one({"id": salesman_id})
        return result.deleted_count > 0
    
    async def exists(self, salesman_id: str) -> bool:
        """Check if a salesman exists"""
        return await self.collection.count_documents({"id": salesman_id}) > 0
    
    async def get_by_email(self, email: str) -> Optional[dict]:
        """Get a salesman by email"""
        return await self.collection.find_one({"email": email}, {"_id": 0})
    
    async def get_by_phone(self, phone: str) -> Optional[dict]:
        """Get a salesman by phone"""
        return await self.collection.find_one({"phone": phone}, {"_id": 0})
