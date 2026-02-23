from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from modules.initial_load.models import InitialLoadModel

class InitialLoadRepository:
    """Repository for Initial Load database operations."""
    
    COLLECTION_NAME = "initial_loads"
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db[self.COLLECTION_NAME]
    
    async def create(self, initial_load: InitialLoadModel) -> InitialLoadModel:
        """Create a new initial load"""
        load_dict = initial_load.model_dump()
        await self.collection.insert_one(load_dict)
        return initial_load
    
    async def get_by_salesman_today(self, salesman_id: str, today_date: str, only_non_submitted: bool = False) -> list[dict]:
        """Get all initial loads for a salesman for today only"""
        query = {"salesman_id": salesman_id, "load_date": today_date}
        
        if only_non_submitted:
            query["$or"] = [
                {"report_submitted": False},
                {"report_submitted": {"$exists": False}}
            ]
        
        cursor = self.collection.find(query, {"_id": 0}).sort("created_at", -1)
        return await cursor.to_list(1000)
    
    async def get_total_crates_today(self, salesman_id: str, today_date: str, only_non_submitted: bool = False) -> int:
        """Get total crates loaded today for a salesman"""
        match_query = {"salesman_id": salesman_id, "load_date": today_date}
        
        if only_non_submitted:
            match_query["$or"] = [
                {"report_submitted": False},
                {"report_submitted": {"$exists": False}}
            ]
        
        pipeline = [
            {"$match": match_query},
            {"$group": {"_id": None, "total": {"$sum": "$initial_crates"}}}
        ]
        result = await self.collection.aggregate(pipeline).to_list(1)
        return result[0]["total"] if result else 0
    
    async def get_by_id(self, load_id: str) -> Optional[dict]:
        """Get an initial load by ID"""
        return await self.collection.find_one({"id": load_id}, {"_id": 0})
    
    async def get_all(
        self, 
        skip: int = 0, 
        limit: int = 1000,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        salesman_id: Optional[str] = None
    ) -> list[dict]:
        """Get all initial loads with optional filters (for admin)"""
        query = {}
        
        if from_date or to_date:
            query["load_date"] = {}
            if from_date:
                query["load_date"]["$gte"] = from_date
            if to_date:
                query["load_date"]["$lte"] = to_date
            if not query["load_date"]:
                del query["load_date"]
        
        if salesman_id:
            query["salesman_id"] = salesman_id
        
        cursor = self.collection.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)
    
    async def get_count(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        salesman_id: Optional[str] = None
    ) -> int:
        """Get total count of initial loads"""
        query = {}
        
        if from_date or to_date:
            query["load_date"] = {}
            if from_date:
                query["load_date"]["$gte"] = from_date
            if to_date:
                query["load_date"]["$lte"] = to_date
            if not query["load_date"]:
                del query["load_date"]
        
        if salesman_id:
            query["salesman_id"] = salesman_id
        
        return await self.collection.count_documents(query)
    
    async def get_total_crates(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        salesman_id: Optional[str] = None
    ) -> int:
        """Get total crates for filters"""
        query = {}
        
        if from_date or to_date:
            query["load_date"] = {}
            if from_date:
                query["load_date"]["$gte"] = from_date
            if to_date:
                query["load_date"]["$lte"] = to_date
            if not query["load_date"]:
                del query["load_date"]
        
        if salesman_id:
            query["salesman_id"] = salesman_id
        
        pipeline = [
            {"$match": query},
            {"$group": {"_id": None, "total": {"$sum": "$initial_crates"}}}
        ]
        result = await self.collection.aggregate(pipeline).to_list(1)
        return result[0]["total"] if result else 0
