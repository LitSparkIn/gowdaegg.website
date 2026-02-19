from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase

from core.database import get_database
from core.response import success_response
from core.timezone import get_ist_date, get_ist_time
from auth.security import get_current_user
from modules.salesman_api.schemas import (
    RouteResponse,
    ShopResponse
)

router = APIRouter(prefix="/salesman", tags=["Salesman API"])

def verify_salesman(current_user: dict = Depends(get_current_user)) -> dict:
    """Verify that the current user is a salesman"""
    if current_user.get("role") != "salesman":
        raise HTTPException(status_code=403, detail="Access denied. Salesman only.")
    return current_user

@router.get("/home")
async def get_home_data(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_salesman)
):
    """
    Get home screen data for salesman app.
    Returns salesman profile, all routes and today's report summary for the logged-in salesman.
    All dates follow IST (Indian Standard Time).
    """
    today_date = get_ist_date()
    salesman_id = current_user.get("sub")
    
    # Get salesman profile
    salesman = await db.salesmen.find_one({"id": salesman_id}, {"_id": 0})
    profile = None
    if salesman:
        # Get route name if assigned
        route_name = ""
        if salesman.get("route_id"):
            route = await db.routes.find_one({"id": salesman["route_id"]}, {"_id": 0})
            if route:
                route_name = route.get("route_name", "")
        
        profile = {
            "id": salesman.get("id"),
            "name": salesman.get("name"),
            "phone": salesman.get("phone"),
            "email": salesman.get("email"),
            "route_id": salesman.get("route_id"),
            "route_name": route_name
        }
    
    # Get all routes
    routes = await db.routes.find({}, {"_id": 0}).to_list(1000)
    route_list = []
    for idx, r in enumerate(routes):
        route_list.append({
            "id": r.get("id"),
            "slug": r.get("route_name", "").lower().replace(" ", "-"),
            "name": r.get("route_name", ""),
            "route_order": idx + 1,
            "status": 1,
            "created_at": r.get("created_at"),
            "updated_at": r.get("created_at")
        })
    
    # Get today's total crates loaded for THIS salesman only
    initial_loads_pipeline = [
        {"$match": {"salesman_id": salesman_id, "load_date": today_date}},
        {"$group": {"_id": None, "total": {"$sum": "$initial_crates"}}}
    ]
    initial_load_result = await db.initial_loads.aggregate(initial_loads_pipeline).to_list(1)
    total_crates_loaded = initial_load_result[0]["total"] if initial_load_result else 0
    
    # Get today's sales totals for THIS salesman only
    sales_pipeline = [
        {"$match": {"salesman_id": salesman_id, "sale_date": today_date}},
        {"$group": {
            "_id": None,
            "total_crates_sold": {"$sum": "$crates"},
            "total_cash": {"$sum": {"$cond": [{"$eq": ["$payment_type", "Cash"]}, "$collected_amount", 0]}},
            "total_cheque": {"$sum": {"$cond": [{"$eq": ["$payment_type", "Cheque"]}, "$collected_amount", 0]}},
            "total_actransfer": {"$sum": {"$cond": [{"$not": {"$in": ["$payment_type", ["Cash", "Cheque", "Bill"]]}}, "$collected_amount", 0]}}
        }}
    ]
    sales_result = await db.sales.aggregate(sales_pipeline).to_list(1)
    
    if sales_result:
        total_crates_sold = sales_result[0].get("total_crates_sold", 0)
        total_cash = sales_result[0].get("total_cash", 0)
        total_cheque = sales_result[0].get("total_cheque", 0)
        total_actransfer = sales_result[0].get("total_actransfer", 0)
    else:
        total_crates_sold = 0
        total_cash = 0
        total_cheque = 0
        total_actransfer = 0
    
    remaining_crates = total_crates_loaded - total_crates_sold
    
    # Check if today's report is already submitted
    sale_report = await db.sale_reports.find_one(
        {"salesman_id": salesman_id, "report_date": today_date},
        {"_id": 0, "id": 1}
    )
    is_report_submitted = sale_report is not None
    
    report = {
        "totalcratesloaded": total_crates_loaded,
        "totalcratessold": str(total_crates_sold),
        "remainingcrates": remaining_crates,
        "totalcash": total_cash,
        "totalcheque": total_cheque,
        "totalactransfer": total_actransfer,
        "is_report_submitted": is_report_submitted
    }
    
    # Get today's egg rate from settings
    settings = await db.settings.find_one({"id": "global_settings"}, {"_id": 0, "todays_egg_rate": 1})
    todays_egg_rate = settings.get("todays_egg_rate", 0.0) if settings else 0.0
    
    return success_response(
        data={
            "profile": profile,
            "routes": route_list,
            "report": report,
            "todays_egg_rate": todays_egg_rate
        },
        message="Data generated"
    )

@router.get("/routes")
async def get_all_routes(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_salesman)
):
    """
    Get all available routes.
    Accessible by authenticated salesmen only.
    """
    routes = await db.routes.find({}, {"_id": 0, "id": 1, "route_name": 1}).to_list(1000)
    
    route_list = [RouteResponse(**r).model_dump() for r in routes]
    
    return success_response(
        data=route_list,
        message="Routes fetched successfully"
    )

@router.get("/routes/{route_id}/shops")
async def get_shops_by_route(
    route_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_salesman)
):
    """
    Get all shops for a specific route.
    Accessible by authenticated salesmen only.
    """
    # Verify route exists
    route = await db.routes.find_one({"id": route_id}, {"_id": 0})
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    # Get shops for this route
    shops = await db.shops.find(
        {"route_id": route_id},
        {"_id": 0, "id": 1, "name": 1, "phone": 1, "address": 1, "previous_dues": 1, "tray_balance": 1, "route_id": 1}
    ).to_list(1000)
    
    shop_list = [ShopResponse(**s).model_dump() for s in shops]
    
    return success_response(
        data=shop_list,
        message="Shops fetched successfully"
    )

@router.get("/shops/{shop_id}")
async def get_shop_details(
    shop_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_salesman)
):
    """
    Get shop details by ID along with shop transactions.
    Accessible by authenticated salesmen only.
    """
    shop = await db.shops.find_one(
        {"id": shop_id},
        {"_id": 0, "id": 1, "name": 1, "phone": 1, "address": 1, "previous_dues": 1, "tray_balance": 1, "route_id": 1}
    )
    
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    
    # Get route info
    route = await db.routes.find_one({"id": shop["route_id"]}, {"_id": 0, "id": 1, "route_name": 1})
    
    shop_data = ShopResponse(**shop).model_dump()
    if route:
        shop_data["route_name"] = route["route_name"]
    
    # Get shop transactions (most recent 50 transactions)
    transactions_cursor = db.sales.find(
        {"shop_id": shop_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(50)
    
    transactions = []
    async for txn in transactions_cursor:
        # Get salesman name for each transaction
        salesman = await db.salesmen.find_one({"id": txn.get("salesman_id")}, {"_id": 0, "name": 1})
        txn["salesman_name"] = salesman["name"] if salesman else "Unknown"
        transactions.append(txn)
    
    shop_data["transactions"] = transactions
    shop_data["total_transactions"] = len(transactions)
    
    return success_response(
        data=shop_data,
        message="Shop details fetched successfully"
    )
