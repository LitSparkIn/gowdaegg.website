from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from modules.sale_report.models import SaleReportModel

class SaleReportRepository:
    """Repository for Sale Report database operations."""
    
    COLLECTION_NAME = "sale_reports"
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db[self.COLLECTION_NAME]
    
    async def create(self, report: SaleReportModel) -> SaleReportModel:
        """Create a new sale report"""
        report_dict = report.model_dump()
        await self.collection.insert_one(report_dict)
        return report
    
    async def get_by_id(self, report_id: str) -> Optional[dict]:
        """Get a sale report by ID"""
        return await self.collection.find_one({"id": report_id}, {"_id": 0})
    
    async def get_by_salesman_and_date(self, salesman_id: str, report_date: str) -> Optional[dict]:
        """Get a sale report by salesman and date"""
        return await self.collection.find_one(
            {"salesman_id": salesman_id, "report_date": report_date}, 
            {"_id": 0}
        )
    
    async def get_all(
        self,
        skip: int = 0,
        limit: int = 1000,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        salesman_id: Optional[str] = None
    ) -> list[dict]:
        """Get all sale reports with optional filters"""
        query = {}
        
        if from_date or to_date:
            query["report_date"] = {}
            if from_date:
                query["report_date"]["$gte"] = from_date
            if to_date:
                query["report_date"]["$lte"] = to_date
            if not query["report_date"]:
                del query["report_date"]
        
        if salesman_id:
            query["salesman_id"] = salesman_id
        
        cursor = self.collection.find(query, {"_id": 0}).sort("submitted_at", -1).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)
    
    async def get_count(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        salesman_id: Optional[str] = None
    ) -> int:
        """Get count of sale reports"""
        query = {}
        
        if from_date or to_date:
            query["report_date"] = {}
            if from_date:
                query["report_date"]["$gte"] = from_date
            if to_date:
                query["report_date"]["$lte"] = to_date
            if not query["report_date"]:
                del query["report_date"]
        
        if salesman_id:
            query["salesman_id"] = salesman_id
        
        return await self.collection.count_documents(query)
    
    async def update(self, report_id: str, update_data: dict) -> Optional[dict]:
        """Update a sale report by ID"""
        result = await self.collection.update_one(
            {"id": report_id},
            {"$set": update_data}
        )
        if result.modified_count == 0 and result.matched_count == 0:
            return None
        return await self.get_by_id(report_id)
    
    async def delete(self, report_id: str) -> bool:
        """Delete a sale report by ID"""
        result = await self.collection.delete_one({"id": report_id})
        return result.deleted_count > 0
