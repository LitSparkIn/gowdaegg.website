from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from modules.sales.models import SaleModel

class SaleRepository:
    """Repository for Sale database operations."""
    
    COLLECTION_NAME = "sales"
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db[self.COLLECTION_NAME]
    
    def _build_query(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        salesman_id: Optional[str] = None,
        shop_id: Optional[str] = None,
        transaction_type: Optional[str] = None,
        payment_type: Optional[str] = None,
        has_image: Optional[str] = None
    ) -> dict:
        """Build MongoDB query from filters"""
        query = {}
        and_conditions = []
        
        if from_date or to_date:
            date_query = {}
            if from_date:
                date_query["$gte"] = from_date
            if to_date:
                date_query["$lte"] = to_date
            if date_query:
                query["sale_date"] = date_query
        
        if salesman_id:
            query["salesman_id"] = salesman_id
        if shop_id:
            query["shop_id"] = shop_id
        if payment_type:
            query["payment_type"] = payment_type
        
        # Handle transaction_type filter (supports legacy records without the field)
        if transaction_type:
            if transaction_type == "Sale":
                and_conditions.append({
                    "$or": [
                        {"transaction_type": "Sale"},
                        {"transaction_type": {"$exists": False}, "crates": {"$gt": 0}}
                    ]
                })
            elif transaction_type == "Collection":
                and_conditions.append({
                    "$or": [
                        {"transaction_type": "Collection"},
                        {"transaction_type": {"$exists": False}, "crates": 0}
                    ]
                })
        
        # Handle has_image filter
        if has_image:
            if has_image == "with":
                and_conditions.append({"image_url": {"$ne": None, "$exists": True}})
            elif has_image == "without":
                and_conditions.append({
                    "$or": [{"image_url": None}, {"image_url": {"$exists": False}}]
                })
        
        # Combine with $and if needed
        if and_conditions:
            if query:
                and_conditions.insert(0, query)
            query = {"$and": and_conditions} if len(and_conditions) > 1 else and_conditions[0]
            if len(and_conditions) == 1 and isinstance(and_conditions[0], dict) and "$or" not in and_conditions[0]:
                query = {**query, **and_conditions[0]} if query else and_conditions[0]
        
        return query
    
    async def create(self, sale: SaleModel) -> SaleModel:
        """Create a new sale"""
        sale_dict = sale.model_dump()
        await self.collection.insert_one(sale_dict)
        return sale
    
    async def get_by_id(self, sale_id: str) -> Optional[dict]:
        """Get a sale by ID"""
        return await self.collection.find_one({"id": sale_id}, {"_id": 0})
    
    async def get_by_salesman_today(self, salesman_id: str, today_date: str) -> list[dict]:
        """Get all sales for a salesman for today"""
        cursor = self.collection.find(
            {"salesman_id": salesman_id, "sale_date": today_date},
            {"_id": 0}
        ).sort("created_at", -1)
        return await cursor.to_list(1000)
    
    async def get_all(
        self,
        skip: int = 0,
        limit: int = 1000,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        salesman_id: Optional[str] = None,
        shop_id: Optional[str] = None,
        transaction_type: Optional[str] = None,
        payment_type: Optional[str] = None,
        has_image: Optional[str] = None
    ) -> list[dict]:
        """Get all sales with optional filters"""
        query = self._build_query(from_date, to_date, salesman_id, shop_id, transaction_type, payment_type, has_image)
        cursor = self.collection.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)
    
    async def get_count(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        salesman_id: Optional[str] = None,
        shop_id: Optional[str] = None,
        transaction_type: Optional[str] = None,
        payment_type: Optional[str] = None,
        has_image: Optional[str] = None
    ) -> int:
        """Get count of sales"""
        query = self._build_query(from_date, to_date, salesman_id, shop_id, transaction_type, payment_type, has_image)
        return await self.collection.count_documents(query)
    
    async def get_totals(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        salesman_id: Optional[str] = None,
        shop_id: Optional[str] = None,
        transaction_type: Optional[str] = None,
        payment_type: Optional[str] = None,
        has_image: Optional[str] = None
    ) -> dict:
        """Get total amounts for sales"""
        query = self._build_query(from_date, to_date, salesman_id, shop_id, transaction_type, payment_type, has_image)
        
        pipeline = [
            {"$match": query},
            {"$group": {
                "_id": None,
                "total_crates": {"$sum": "$crates"},
                "total_order_amount": {"$sum": "$order_amount"},
                "total_collected": {"$sum": "$collected_amount"},
                "total_pending": {"$sum": "$pending_amount"},
                "total_return_tray": {"$sum": "$return_tray"}
            }}
        ]
        
        result = await self.collection.aggregate(pipeline).to_list(1)
        if result:
            return result[0]
        return {
            "total_crates": 0,
            "total_order_amount": 0,
            "total_collected": 0,
            "total_pending": 0,
            "total_return_tray": 0
        }
