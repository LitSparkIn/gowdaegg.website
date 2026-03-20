from fastapi import APIRouter, Depends, Query
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from core.database import get_database
from auth.security import get_current_user
from modules.shop.service import ShopService
from modules.shop.schemas import (
    ShopCreateRequest,
    ShopUpdateRequest,
    ShopResponse,
    ShopListResponse,
    MessageResponse
)

router = APIRouter(prefix="/shops", tags=["Shops"])

def get_shop_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> ShopService:
    """Dependency to get ShopService instance"""
    return ShopService(db)

@router.post("", response_model=ShopResponse)
async def create_shop(
    request: ShopCreateRequest,
    service: ShopService = Depends(get_shop_service),
    current_user: dict = Depends(get_current_user)
):
    """Create a new shop"""
    return await service.create_shop(request)

@router.get("", response_model=ShopListResponse)
async def get_shops(
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=1000),
    route_id: Optional[str] = Query(None, description="Filter by route ID"),
    service: ShopService = Depends(get_shop_service),
    current_user: dict = Depends(get_current_user)
):
    """Get all shops with pagination and optional route filter"""
    return await service.get_all_shops(skip=skip, limit=limit, route_id=route_id)

@router.get("/{shop_id}", response_model=ShopResponse)
async def get_shop(
    shop_id: str,
    service: ShopService = Depends(get_shop_service),
    current_user: dict = Depends(get_current_user)
):
    """Get a single shop by ID"""
    return await service.get_shop(shop_id)

@router.put("/{shop_id}", response_model=ShopResponse)
async def update_shop(
    shop_id: str,
    request: ShopUpdateRequest,
    service: ShopService = Depends(get_shop_service),
    current_user: dict = Depends(get_current_user)
):
    """Update an existing shop"""
    return await service.update_shop(shop_id, request)

@router.delete("/{shop_id}", response_model=MessageResponse)
async def delete_shop(
    shop_id: str,
    service: ShopService = Depends(get_shop_service),
    current_user: dict = Depends(get_current_user)
):
    """Deactivate a shop (soft delete)"""
    await service.delete_shop(shop_id)
    return MessageResponse(message="Shop deactivated successfully")

@router.post("/{shop_id}/activate", response_model=MessageResponse)
async def activate_shop(
    shop_id: str,
    service: ShopService = Depends(get_shop_service),
    current_user: dict = Depends(get_current_user)
):
    """Activate an inactive shop"""
    await service.activate_shop(shop_id)
    return MessageResponse(message="Shop activated successfully")


@router.get("/{shop_id}/transactions")
async def get_shop_transactions(
    shop_id: str,
    from_date: str = Query(None, description="Filter from date (YYYY-MM-DD)"),
    to_date: str = Query(None, description="Filter to date (YYYY-MM-DD)"),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """Get all transactions for a specific shop"""
    from core.response import success_response
    
    # Check shop exists - get all fields
    shop = await db.shops.find_one({"id": shop_id}, {"_id": 0})
    if not shop:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Shop not found")
    
    # Get route info
    route = await db.routes.find_one({"id": shop.get("route_id")}, {"_id": 0, "route_name": 1})
    shop["route_name"] = route.get("route_name", "N/A") if route else "N/A"
    
    # Build query for transactions
    query = {"shop_id": shop_id}
    if from_date:
        query["sale_date"] = {"$gte": from_date}
    if to_date:
        if "sale_date" in query:
            query["sale_date"]["$lte"] = to_date
        else:
            query["sale_date"] = {"$lte": to_date}
    
    # Get transactions sorted by date desc
    transactions_cursor = db.sales.find(query, {"_id": 0}).sort([("sale_date", -1), ("sale_time", -1)])
    transactions = await transactions_cursor.to_list(10000)
    
    # Get salesman names for each transaction
    salesman_ids = list(set(t.get("salesman_id") for t in transactions if t.get("salesman_id")))
    salesmen = {}
    if salesman_ids:
        salesmen_cursor = db.salesmen.find({"id": {"$in": salesman_ids}}, {"_id": 0, "id": 1, "name": 1})
        async for s in salesmen_cursor:
            salesmen[s["id"]] = s["name"]
    
    # Add salesman name to each transaction
    for t in transactions:
        t["salesman_name"] = salesmen.get(t.get("salesman_id"), "Unknown")
    
    # Calculate totals
    totals = {
        "total_transactions": len(transactions),
        "total_crates": sum(t.get("crates", 0) for t in transactions),
        "total_order_amount": sum(t.get("order_amount", 0) for t in transactions),
        "total_collected": sum(t.get("collected_amount", 0) for t in transactions),
        "total_pending": sum(t.get("pending_amount", 0) for t in transactions)
    }
    
    return success_response(
        data={
            "shop": shop,
            "transactions": transactions,
            "totals": totals
        },
        message="Shop transactions fetched successfully"
    )
