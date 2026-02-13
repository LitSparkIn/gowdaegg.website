from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from modules.route.models import RouteModel

class RouteRepository:
    """
    Repository for Route database operations.
    Handles all direct database interactions for routes.
    """
    
    COLLECTION_NAME = "routes"
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db[self.COLLECTION_NAME]
    
    async def create(self, route: RouteModel) -> RouteModel:
        """
        Create a new route in the database
        
        Args:
            route: RouteModel instance to create
            
        Returns:
            Created RouteModel
        """
        route_dict = route.model_dump()
        await self.collection.insert_one(route_dict)
        return route
    
    async def get_by_id(self, route_id: str) -> Optional[dict]:
        """
        Get a route by its ID
        
        Args:
            route_id: Route ID to find
            
        Returns:
            Route dict or None if not found
        """
        return await self.collection.find_one({"id": route_id}, {"_id": 0})
    
    async def get_all(self, skip: int = 0, limit: int = 1000) -> list[dict]:
        """
        Get all routes with pagination
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            List of route dicts
        """
        cursor = self.collection.find({}, {"_id": 0}).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)
    
    async def get_count(self) -> int:
        """
        Get total count of routes
        
        Returns:
            Total number of routes
        """
        return await self.collection.count_documents({})
    
    async def update(self, route_id: str, update_data: dict) -> Optional[dict]:
        """
        Update a route by ID
        
        Args:
            route_id: Route ID to update
            update_data: Dictionary of fields to update
            
        Returns:
            Updated route dict or None if not found
        """
        result = await self.collection.update_one(
            {"id": route_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            return None
            
        return await self.get_by_id(route_id)
    
    async def delete(self, route_id: str) -> bool:
        """
        Delete a route by ID
        
        Args:
            route_id: Route ID to delete
            
        Returns:
            True if deleted, False if not found
        """
        result = await self.collection.delete_one({"id": route_id})
        return result.deleted_count > 0
    
    async def exists(self, route_id: str) -> bool:
        """
        Check if a route exists
        
        Args:
            route_id: Route ID to check
            
        Returns:
            True if exists, False otherwise
        """
        return await self.collection.count_documents({"id": route_id}) > 0
    
    async def get_by_name(self, route_name: str) -> Optional[dict]:
        """
        Get a route by its name
        
        Args:
            route_name: Route name to find
            
        Returns:
            Route dict or None if not found
        """
        return await self.collection.find_one({"route_name": route_name}, {"_id": 0})
