from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from modules.purchase.models import PurchaseModel

class PurchaseRepository:
    """Repository for Purchase database operations."""
    
    COLLECTION_NAME = "purchases"
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db[self.COLLECTION_NAME]
    
    async def create(self, purchase: PurchaseModel) -> PurchaseModel:
        """Create a new purchase"""
        purchase_dict = purchase.model_dump()
        await self.collection.insert_one(purchase_dict)
        return purchase
    
    async def get_by_id(self, purchase_id: str) -> Optional[dict]:
        """Get a purchase by ID"""
        return await self.collection.find_one({"id": purchase_id}, {"_id": 0})
    
    async def get_all(
        self,
        skip: int = 0,
        limit: int = 1000,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        supplier_id: Optional[str] = None
    ) -> list[dict]:
        """Get all purchases with optional filters"""
        query = {}
        
        if from_date or to_date:
            query["purchase_date"] = {}
            if from_date:
                query["purchase_date"]["$gte"] = from_date
            if to_date:
                query["purchase_date"]["$lte"] = to_date
            if not query["purchase_date"]:
                del query["purchase_date"]
        
        if supplier_id:
            query["supplier_id"] = supplier_id
        
        cursor = self.collection.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)
    
    async def get_count(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        supplier_id: Optional[str] = None
    ) -> int:
        """Get count of purchases"""
        query = {}
        
        if from_date or to_date:
            query["purchase_date"] = {}
            if from_date:
                query["purchase_date"]["$gte"] = from_date
            if to_date:
                query["purchase_date"]["$lte"] = to_date
            if not query["purchase_date"]:
                del query["purchase_date"]
        
        if supplier_id:
            query["supplier_id"] = supplier_id
        
        return await self.collection.count_documents(query)
    
    async def get_totals(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        supplier_id: Optional[str] = None
    ) -> dict:
        """Get total amounts for purchases"""
        query = {}
        
        if from_date or to_date:
            query["purchase_date"] = {}
            if from_date:
                query["purchase_date"]["$gte"] = from_date
            if to_date:
                query["purchase_date"]["$lte"] = to_date
            if not query["purchase_date"]:
                del query["purchase_date"]
        
        if supplier_id:
            query["supplier_id"] = supplier_id
        
        pipeline = [
            {"$match": query},
            {"$group": {
                "_id": None,
                "total_amount": {"$sum": "$grand_total"},
                "total_paid": {"$sum": "$amount_paid"},
                "total_pending": {"$sum": "$pending_amount"}
            }}
        ]
        
        result = await self.collection.aggregate(pipeline).to_list(1)
        if result:
            return result[0]
        return {
            "total_amount": 0,
            "total_paid": 0,
            "total_pending": 0
        }
    
    async def delete(self, purchase_id: str) -> bool:
        """Delete a purchase by ID"""
        result = await self.collection.delete_one({"id": purchase_id})
        return result.deleted_count > 0
