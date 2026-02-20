from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timedelta, timezone
from typing import Optional

from core.database import get_database
from core.response import success_response
from core.timezone import get_ist_date, get_ist_now, IST
from auth.security import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

def verify_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Verify that the current user is an admin"""
    from fastapi import HTTPException
    if current_user.get("role") not in ["superadmin", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Admin only.")
    return current_user

@router.get("")
async def get_dashboard_data(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_admin)
):
    """
    Get comprehensive dashboard data including:
    - Today's stats (sales, collection, crates)
    - Overall counts (routes, shops, salesmen, suppliers)
    - Payment type breakdown for today
    - Last 7 days sales trend
    - Top performing salesmen today
    - Recent transactions
    - Salesman submission status
    All dates follow IST (Indian Standard Time).
    """
    today = get_ist_date()
    
    # Get date range for last 7 days (in IST)
    now_ist = get_ist_now()
    dates_7_days = [(now_ist - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(6, -1, -1)]
    
    # ===== TODAY'S STATS =====
    today_sales_pipeline = [
        {"$match": {"sale_date": today}},
        {"$group": {
            "_id": None,
            "total_crates": {"$sum": "$crates"},
            "total_order_amount": {"$sum": "$order_amount"},
            "total_collected": {"$sum": "$collected_amount"},
            "total_pending": {"$sum": "$pending_amount"},
            "total_transactions": {"$sum": 1},
            "total_return_tray": {"$sum": "$return_tray"}
        }}
    ]
    today_sales_result = await db.sales.aggregate(today_sales_pipeline).to_list(1)
    today_stats = today_sales_result[0] if today_sales_result else {
        "total_crates": 0, "total_order_amount": 0, "total_collected": 0,
        "total_pending": 0, "total_transactions": 0, "total_return_tray": 0
    }
    
    # ===== TODAY'S PURCHASES =====
    today_purchases_pipeline = [
        {"$match": {"purchase_date": today}},
        {"$group": {
            "_id": None,
            "total_crates": {"$sum": "$crates"},
            "total_amount": {"$sum": "$total_amount"},
            "total_paid": {"$sum": "$amount_paid"},
            "total_purchases": {"$sum": 1}
        }}
    ]
    today_purchases_result = await db.purchases.aggregate(today_purchases_pipeline).to_list(1)
    today_purchases = today_purchases_result[0] if today_purchases_result else {
        "total_crates": 0, "total_amount": 0, "total_paid": 0, "total_purchases": 0
    }
    
    # ===== TODAY'S EXPENSES =====
    today_expenses_pipeline = [
        {"$match": {"expense_date": today}},
        {"$group": {
            "_id": None,
            "total_expense": {"$sum": "$amount"},
            "total_entries": {"$sum": 1}
        }}
    ]
    today_expenses_result = await db.expenses.aggregate(today_expenses_pipeline).to_list(1)
    today_expenses = today_expenses_result[0] if today_expenses_result else {"total_expense": 0, "total_entries": 0}
    
    # ===== OVERALL COUNTS =====
    routes_count = await db.routes.count_documents({})
    shops_count = await db.shops.count_documents({})
    salesmen_count = await db.salesmen.count_documents({})
    suppliers_count = await db.suppliers.count_documents({})
    active_salesmen = await db.salesmen.count_documents({"is_active": True})
    
    # ===== TOTAL DUES ACROSS ALL SHOPS =====
    total_dues_pipeline = [
        {"$match": {"is_active": True}},
        {"$group": {
            "_id": None,
            "total_dues": {"$sum": "$previous_dues"}
        }}
    ]
    total_dues_result = await db.shops.aggregate(total_dues_pipeline).to_list(1)
    total_dues = total_dues_result[0].get("total_dues", 0) if total_dues_result else 0
    
    # ===== PAYMENT TYPE BREAKDOWN (Today) =====
    payment_breakdown_pipeline = [
        {"$match": {"sale_date": today}},
        {"$group": {
            "_id": "$payment_type",
            "count": {"$sum": 1},
            "amount": {"$sum": "$collected_amount"}
        }}
    ]
    payment_breakdown_result = await db.sales.aggregate(payment_breakdown_pipeline).to_list(10)
    payment_breakdown = {item["_id"]: {"count": item["count"], "amount": item["amount"]} for item in payment_breakdown_result}
    
    # ===== TRANSACTION TYPE BREAKDOWN (Today) =====
    transaction_type_pipeline = [
        {"$match": {"sale_date": today}},
        {"$group": {
            "_id": {
                "$cond": [{"$gt": ["$crates", 0]}, "Sale", "Collection"]
            },
            "count": {"$sum": 1},
            "amount": {"$sum": "$collected_amount"}
        }}
    ]
    transaction_type_result = await db.sales.aggregate(transaction_type_pipeline).to_list(10)
    transaction_breakdown = {item["_id"]: {"count": item["count"], "amount": item["amount"]} for item in transaction_type_result}
    
    # ===== LAST 7 DAYS SALES TREND =====
    sales_trend_pipeline = [
        {"$match": {"sale_date": {"$in": dates_7_days}}},
        {"$group": {
            "_id": "$sale_date",
            "total_sales": {"$sum": "$order_amount"},
            "total_collected": {"$sum": "$collected_amount"},
            "total_crates": {"$sum": "$crates"},
            "transactions": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    sales_trend_result = await db.sales.aggregate(sales_trend_pipeline).to_list(7)
    sales_trend_map = {item["_id"]: item for item in sales_trend_result}
    
    # Fill missing dates with zeros
    sales_trend = []
    for date in dates_7_days:
        if date in sales_trend_map:
            item = sales_trend_map[date]
            sales_trend.append({
                "date": date,
                "day": datetime.strptime(date, "%Y-%m-%d").strftime("%a"),
                "total_sales": item["total_sales"],
                "total_collected": item["total_collected"],
                "total_crates": item["total_crates"],
                "transactions": item["transactions"]
            })
        else:
            sales_trend.append({
                "date": date,
                "day": datetime.strptime(date, "%Y-%m-%d").strftime("%a"),
                "total_sales": 0,
                "total_collected": 0,
                "total_crates": 0,
                "transactions": 0
            })
    
    # ===== LAST 7 DAYS PURCHASES TREND =====
    purchases_trend_pipeline = [
        {"$match": {"purchase_date": {"$in": dates_7_days}}},
        {"$group": {
            "_id": "$purchase_date",
            "total_amount": {"$sum": "$total_amount"},
            "total_crates": {"$sum": "$crates"}
        }},
        {"$sort": {"_id": 1}}
    ]
    purchases_trend_result = await db.purchases.aggregate(purchases_trend_pipeline).to_list(7)
    purchases_trend_map = {item["_id"]: item for item in purchases_trend_result}
    
    purchases_trend = []
    for date in dates_7_days:
        if date in purchases_trend_map:
            item = purchases_trend_map[date]
            purchases_trend.append({
                "date": date,
                "day": datetime.strptime(date, "%Y-%m-%d").strftime("%a"),
                "total_amount": item["total_amount"],
                "total_crates": item["total_crates"]
            })
        else:
            purchases_trend.append({
                "date": date,
                "day": datetime.strptime(date, "%Y-%m-%d").strftime("%a"),
                "total_amount": 0,
                "total_crates": 0
            })
    
    # ===== TOP SALESMEN TODAY =====
    top_salesmen_pipeline = [
        {"$match": {"sale_date": today}},
        {"$group": {
            "_id": "$salesman_id",
            "total_sales": {"$sum": "$order_amount"},
            "total_collected": {"$sum": "$collected_amount"},
            "total_crates": {"$sum": "$crates"},
            "transactions": {"$sum": 1}
        }},
        {"$sort": {"total_collected": -1}},
        {"$limit": 5}
    ]
    top_salesmen_result = await db.sales.aggregate(top_salesmen_pipeline).to_list(5)
    
    # Enrich with salesman names
    top_salesmen = []
    for item in top_salesmen_result:
        salesman = await db.salesmen.find_one({"id": item["_id"]}, {"_id": 0, "name": 1})
        top_salesmen.append({
            "salesman_id": item["_id"],
            "name": salesman.get("name", "Unknown") if salesman else "Unknown",
            "total_sales": item["total_sales"],
            "total_collected": item["total_collected"],
            "total_crates": item["total_crates"],
            "transactions": item["transactions"]
        })
    
    # ===== SALESMAN SUBMISSION STATUS =====
    all_active_salesmen = await db.salesmen.find({"is_active": True}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
    submitted_reports = await db.sale_reports.find({"report_date": today}, {"_id": 0, "salesman_id": 1}).to_list(100)
    submitted_ids = {r["salesman_id"] for r in submitted_reports}
    
    salesman_status = []
    for s in all_active_salesmen:
        salesman_status.append({
            "id": s["id"],
            "name": s["name"],
            "submitted": s["id"] in submitted_ids
        })
    
    submitted_count = len([s for s in salesman_status if s["submitted"]])
    
    # ===== RECENT TRANSACTIONS =====
    recent_transactions = await db.sales.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    # Enrich recent transactions
    enriched_recent = []
    for sale in recent_transactions:
        salesman = await db.salesmen.find_one({"id": sale["salesman_id"]}, {"_id": 0, "name": 1})
        shop = await db.shops.find_one({"id": sale["shop_id"]}, {"_id": 0, "name": 1})
        enriched_recent.append({
            "id": sale["id"],
            "salesman_name": salesman.get("name", "Unknown") if salesman else "Unknown",
            "shop_name": shop.get("name", "Unknown") if shop else "Unknown",
            "crates": sale["crates"],
            "collected_amount": sale["collected_amount"],
            "payment_type": sale["payment_type"],
            "sale_date": sale["sale_date"],
            "sale_time": sale.get("sale_time", "")
        })
    
    return success_response(
        data={
            "today": {
                "date": today,
                "sales": {
                    "total_crates": today_stats.get("total_crates", 0),
                    "total_order_amount": round(today_stats.get("total_order_amount", 0), 2),
                    "total_collected": round(today_stats.get("total_collected", 0), 2),
                    "total_pending": round(today_stats.get("total_pending", 0), 2),
                    "total_transactions": today_stats.get("total_transactions", 0),
                    "total_return_tray": today_stats.get("total_return_tray", 0)
                },
                "purchases": {
                    "total_crates": today_purchases.get("total_crates", 0),
                    "total_amount": round(today_purchases.get("total_amount", 0), 2),
                    "total_paid": round(today_purchases.get("total_paid", 0), 2),
                    "total_purchases": today_purchases.get("total_purchases", 0)
                },
                "expenses": {
                    "total_expense": round(today_expenses.get("total_expense", 0), 2),
                    "total_entries": today_expenses.get("total_entries", 0)
                }
            },
            "overall": {
                "routes": routes_count,
                "shops": shops_count,
                "salesmen": salesmen_count,
                "active_salesmen": active_salesmen,
                "suppliers": suppliers_count,
                "total_dues": round(total_dues, 2)
            },
            "payment_breakdown": payment_breakdown,
            "transaction_breakdown": transaction_breakdown,
            "sales_trend": sales_trend,
            "purchases_trend": purchases_trend,
            "top_salesmen": top_salesmen,
            "salesman_status": {
                "total": len(salesman_status),
                "submitted": submitted_count,
                "pending": len(salesman_status) - submitted_count,
                "details": salesman_status
            },
            "recent_transactions": enriched_recent
        },
        message="Dashboard data fetched successfully"
    )
