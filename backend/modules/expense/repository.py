from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from modules.expense.models import ExpenseModel

class ExpenseRepository:
    """Repository for Expense database operations."""
    
    COLLECTION_NAME = "expenses"
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db[self.COLLECTION_NAME]
    
    async def create(self, expense: ExpenseModel) -> ExpenseModel:
        """Create a new expense"""
        expense_dict = expense.model_dump()
        await self.collection.insert_one(expense_dict)
        return expense
    
    async def get_by_id(self, expense_id: str) -> Optional[dict]:
        """Get an expense by ID"""
        return await self.collection.find_one({"id": expense_id}, {"_id": 0})
    
    async def get_all(
        self, 
        skip: int = 0, 
        limit: int = 1000,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None
    ) -> list[dict]:
        """Get all expenses with optional date filtering"""
        query = {}
        
        if from_date or to_date:
            query["expense_date"] = {}
            if from_date:
                query["expense_date"]["$gte"] = from_date
            if to_date:
                query["expense_date"]["$lte"] = to_date
            if not query["expense_date"]:
                del query["expense_date"]
        
        cursor = self.collection.find(query, {"_id": 0}).sort("expense_date", -1).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)
    
    async def get_count(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None
    ) -> int:
        """Get total count of expenses"""
        query = {}
        
        if from_date or to_date:
            query["expense_date"] = {}
            if from_date:
                query["expense_date"]["$gte"] = from_date
            if to_date:
                query["expense_date"]["$lte"] = to_date
            if not query["expense_date"]:
                del query["expense_date"]
        
        return await self.collection.count_documents(query)
    
    async def get_total_amount(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None
    ) -> float:
        """Get total expense amount"""
        query = {}
        
        if from_date or to_date:
            query["expense_date"] = {}
            if from_date:
                query["expense_date"]["$gte"] = from_date
            if to_date:
                query["expense_date"]["$lte"] = to_date
            if not query["expense_date"]:
                del query["expense_date"]
        
        pipeline = [
            {"$match": query},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        
        result = await self.collection.aggregate(pipeline).to_list(1)
        return result[0]["total"] if result else 0.0
    
    async def update(self, expense_id: str, update_data: dict) -> Optional[dict]:
        """Update an expense by ID"""
        result = await self.collection.update_one(
            {"id": expense_id},
            {"$set": update_data}
        )
        if result.modified_count == 0 and result.matched_count == 0:
            return None
        return await self.get_by_id(expense_id)
    
    async def delete(self, expense_id: str) -> bool:
        """Delete an expense by ID"""
        result = await self.collection.delete_one({"id": expense_id})
        return result.deleted_count > 0
    
    async def exists(self, expense_id: str) -> bool:
        """Check if an expense exists"""
        return await self.collection.count_documents({"id": expense_id}) > 0
