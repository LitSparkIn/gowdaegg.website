from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid

from core.database import get_database
from core.response import success_response
from core.timezone import get_ist_date, get_ist_now
from auth.security import get_current_user

router = APIRouter(prefix="/daily-summary", tags=["Daily Summary"])

def verify_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Verify that the current user is an admin"""
    if current_user.get("role") not in ["superadmin", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Admin only.")
    return current_user

@router.get("")
async def get_daily_summary(
    date: Optional[str] = Query(None, description="Summary date (YYYY-MM-DD). Defaults to today (IST)."),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_admin)
):
    """
    Get daily summary with crate information, sale information, profit/loss, and expenses.
    All dates follow IST (Indian Standard Time).
    """
    # Use today's date (IST) if not provided
    if date:
        target_date = date
    else:
        target_date = get_ist_date()
    
    # Calculate previous date for carryover
    target_date_obj = datetime.strptime(target_date, "%Y-%m-%d")
    previous_date = (target_date_obj - timedelta(days=1)).strftime("%Y-%m-%d")
    
    # ============ CRATE INFORMATION ============
    
    # Get carryover from previous days (all purchases - all sales before today)
    # Total purchased before today
    prev_purchase_pipeline = [
        {"$match": {"purchase_date": {"$lt": target_date}}},
        {"$group": {
            "_id": None,
            "total_crates": {"$sum": "$crates"},
            "total_value": {"$sum": "$total"}
        }}
    ]
    prev_purchase_result = await db.purchases.aggregate(prev_purchase_pipeline).to_list(1)
    prev_total_purchased = prev_purchase_result[0]["total_crates"] if prev_purchase_result else 0
    prev_total_purchase_value = prev_purchase_result[0]["total_value"] if prev_purchase_result else 0
    
    # Total sold before today
    prev_sales_pipeline = [
        {"$match": {"sale_date": {"$lt": target_date}}},
        {"$group": {"_id": None, "total_crates": {"$sum": "$crates"}}}
    ]
    prev_sales_result = await db.sales.aggregate(prev_sales_pipeline).to_list(1)
    prev_total_sold = prev_sales_result[0]["total_crates"] if prev_sales_result else 0
    
    # Total damaged before today (from sale_reports)
    prev_damage_pipeline = [
        {"$match": {"report_date": {"$lt": target_date}}},
        {"$group": {"_id": None, "total_damaged": {"$sum": "$crates_damaged"}}}
    ]
    prev_damage_result = await db.sale_reports.aggregate(prev_damage_pipeline).to_list(1)
    prev_total_damaged = prev_damage_result[0]["total_damaged"] if prev_damage_result else 0
    
    carryover_crates = prev_total_purchased - prev_total_sold - prev_total_damaged
    carryover_crates = max(0, carryover_crates)  # Ensure non-negative
    
    # Carryover price (average price from previous purchases)
    if prev_total_purchased > 0:
        carryover_price = prev_total_purchase_value / (prev_total_purchased * 30) if prev_total_purchased > 0 else 0
    else:
        carryover_price = 0
    
    # Round carryover_price to 2 decimals
    carryover_price = round(carryover_price, 2)
    
    # Today's purchases
    today_purchase_pipeline = [
        {"$match": {"purchase_date": target_date}},
        {"$group": {
            "_id": None,
            "total_crates": {"$sum": "$crates"},
            "total_value": {"$sum": "$total"}
        }}
    ]
    today_purchase_result = await db.purchases.aggregate(today_purchase_pipeline).to_list(1)
    purchase_today = today_purchase_result[0]["total_crates"] if today_purchase_result else 0
    purchase_today_value = round(today_purchase_result[0]["total_value"], 2) if today_purchase_result else 0
    
    # Calculate weighted average purchase rate: Total Value / (Total Crates * 30 eggs)
    purchase_rate = round(purchase_today_value / (purchase_today * 30), 2) if purchase_today > 0 else 0
    
    # Total crates available today
    total_crates = carryover_crates + purchase_today
    
    # Calculate average rate - round intermediate values
    carryover_value = round(carryover_crates * 30 * carryover_price, 2)
    total_value = round(carryover_value + purchase_today_value, 2)
    average_rate = round(total_value / (total_crates * 30), 2) if total_crates > 0 else 0
    
    # Today's damage (from sale_reports)
    today_damage_pipeline = [
        {"$match": {"report_date": target_date}},
        {"$group": {"_id": None, "total_damaged": {"$sum": "$crates_damaged"}}}
    ]
    today_damage_result = await db.sale_reports.aggregate(today_damage_pipeline).to_list(1)
    damage_today = today_damage_result[0]["total_damaged"] if today_damage_result else 0
    
    # Net crates
    net_crates = total_crates - damage_today
    
    # ============ SALE INFORMATION ============
    
    # Total initial load today
    initial_load_pipeline = [
        {"$match": {"load_date": target_date}},
        {"$group": {"_id": None, "total": {"$sum": "$initial_crates"}}}
    ]
    initial_load_result = await db.initial_loads.aggregate(initial_load_pipeline).to_list(1)
    total_initial_load = initial_load_result[0]["total"] if initial_load_result else 0
    
    # Total sales today
    today_sales_pipeline = [
        {"$match": {"sale_date": target_date}},
        {"$group": {
            "_id": None,
            "total_crates": {"$sum": "$crates"},
            "total_value": {"$sum": "$order_amount"},
            "total_collected": {"$sum": "$collected_amount"}
        }}
    ]
    today_sales_result = await db.sales.aggregate(today_sales_pipeline).to_list(1)
    total_sales = today_sales_result[0]["total_crates"] if today_sales_result else 0
    total_sale_value = round(today_sales_result[0]["total_value"], 2) if today_sales_result else 0
    total_collected = round(today_sales_result[0]["total_collected"], 2) if today_sales_result else 0
    
    # Calculate weighted average sale rate: Total Value / (Total Crates * 30 eggs)
    sale_rate = round(total_sale_value / (total_sales * 30), 2) if total_sales > 0 else 0
    
    # Returned crates (Initial Load - Sales - Damages from sale reports)
    returned_crates = total_initial_load - total_sales - damage_today
    returned_crates = max(0, returned_crates)
    
    # ============ PROFIT | LOSS ============
    
    total_buy_crates = net_crates
    buy_rate = average_rate  # Already rounded to 2 decimals
    buy_value = round(total_buy_crates * 30 * buy_rate, 2)
    
    total_sale_crates = total_sales
    # Recalculate sale value based on actual sales
    sale_value = round(total_sale_value, 2) if total_sale_value > 0 else round(total_sale_crates * 30 * sale_rate, 2)
    
    # ============ EXPENSES ============
    
    # Salesman expenses (from sale_reports)
    salesman_expense_pipeline = [
        {"$match": {"report_date": target_date}},
        {"$group": {"_id": None, "total": {"$sum": "$expense"}}}
    ]
    salesman_expense_result = await db.sale_reports.aggregate(salesman_expense_pipeline).to_list(1)
    salesman_expenses = round(salesman_expense_result[0]["total"], 2) if salesman_expense_result else 0
    
    # Other expenses (from expenses table) - using expense_date field
    other_expense_pipeline = [
        {"$match": {"expense_date": target_date}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    other_expense_result = await db.expenses.aggregate(other_expense_pipeline).to_list(1)
    other_expenses = round(other_expense_result[0]["total"], 2) if other_expense_result else 0
    
    # Damaged eggs loss (damage crates * 30 eggs * average rate)
    damage_loss = round(damage_today * 30 * average_rate, 2)
    
    total_expenses = round(salesman_expenses + other_expenses + damage_loss, 2)
    
    # Net Purchase = Cost of goods sold (crates sold * 30 * buy rate)
    net_purchase = round(total_sale_crates * 30 * buy_rate, 2)
    
    # Net Profit = Total Sale Value - Net Purchase - Total Expenses
    net_profit = round(sale_value - net_purchase - total_expenses, 2)
    
    # Carryover for tomorrow
    carryover_tomorrow = net_crates - total_sales
    carryover_tomorrow = max(0, carryover_tomorrow)
    
    # ============ SALESMAN SUBMISSION STATUS ============
    
    # Get all active salesmen
    all_salesmen = await db.salesmen.find({}, {"_id": 0}).to_list(1000)
    
    # Get all submitted reports for target date
    submitted_reports = await db.sale_reports.find(
        {"report_date": target_date},
        {"_id": 0, "salesman_id": 1}
    ).to_list(1000)
    submitted_salesman_ids = {r["salesman_id"] for r in submitted_reports}
    
    # Get initial loads for each salesman today
    initial_loads_by_salesman = {}
    initial_loads_cursor = await db.initial_loads.aggregate([
        {"$match": {"load_date": target_date}},
        {"$group": {
            "_id": "$salesman_id",
            "total_loaded": {"$sum": "$initial_crates"}
        }}
    ]).to_list(1000)
    for load in initial_loads_cursor:
        initial_loads_by_salesman[load["_id"]] = load["total_loaded"]
    
    # Get sales for each salesman today (crates > 0)
    sales_by_salesman = {}
    sales_cursor = await db.sales.aggregate([
        {"$match": {"sale_date": target_date, "crates": {"$gt": 0}}},
        {"$group": {
            "_id": "$salesman_id",
            "total_sold": {"$sum": "$crates"},
            "total_value": {"$sum": "$order_amount"}
        }}
    ]).to_list(1000)
    for sale in sales_cursor:
        sales_by_salesman[sale["_id"]] = {
            "total_sold": sale["total_sold"],
            "total_value": sale["total_value"]
        }
    
    # Get collections for each salesman today (crates = 0, collected_amount > 0)
    collections_by_salesman = {}
    collections_cursor = await db.sales.aggregate([
        {"$match": {"sale_date": target_date, "crates": 0, "collected_amount": {"$gt": 0}}},
        {"$group": {
            "_id": "$salesman_id",
            "total_collected": {"$sum": "$collected_amount"},
            "collection_count": {"$sum": 1}
        }}
    ]).to_list(1000)
    for collection in collections_cursor:
        collections_by_salesman[collection["_id"]] = {
            "total_collected": collection["total_collected"],
            "collection_count": collection["collection_count"]
        }
    
    # Build salesman status list
    salesman_status = []
    pending_submissions = 0  # Only count those who have loaded or made transactions but not submitted
    
    for salesman in all_salesmen:
        salesman_id = salesman["id"]
        is_submitted = salesman_id in submitted_salesman_ids
        loaded = initial_loads_by_salesman.get(salesman_id, 0)
        sales_data = sales_by_salesman.get(salesman_id, {"total_sold": 0, "total_value": 0})
        sold = sales_data["total_sold"]
        total_value = sales_data["total_value"]
        
        collection_data = collections_by_salesman.get(salesman_id, {"total_collected": 0, "collection_count": 0})
        collected = collection_data["total_collected"]
        collection_count = collection_data["collection_count"]
        
        # Calculate average rate (price per egg)
        avg_rate = total_value / (sold * 30) if sold > 0 else 0
        
        # Determine if this salesman is active today (has initial load OR made any sales/collections)
        is_active_today = loaded > 0 or sold > 0 or collected > 0
        
        # Only count as pending if they are active but not submitted
        if is_active_today and not is_submitted:
            pending_submissions += 1
        
        salesman_status.append({
            "id": salesman_id,
            "name": salesman.get("name", "Unknown"),
            "phone": salesman.get("phone", ""),
            "loaded": loaded,
            "sold": sold,
            "collected": round(collected, 2),
            "collection_count": collection_count,
            "avg_rate": round(avg_rate, 2),
            "is_active_today": is_active_today,
            "submitted": is_submitted
        })
    
    # Sort: active salesmen first, then by name
    salesman_status.sort(key=lambda x: (not x["is_active_today"], x["name"]))
    
    # All submitted if no active salesman has pending submission
    all_submitted = pending_submissions == 0
    active_salesmen_count = sum(1 for s in salesman_status if s["is_active_today"])
    submitted_count = sum(1 for s in salesman_status if s["is_active_today"] and s["submitted"])
    
    return success_response(
        data={
            "date": target_date,
            "crate_information": {
                "carryover_today": carryover_crates,
                "carryover_price": round(carryover_price, 2),
                "carryover_value": round(carryover_value, 2),
                "purchase_today": purchase_today,
                "purchase_rate": round(purchase_rate, 2),
                "purchase_value": round(purchase_today_value, 2),
                "total_crates": total_crates,
                "average_rate": round(average_rate, 2),
                "damage": damage_today,
                "net_crates": net_crates
            },
            "sale_information": {
                "total_initial_load": total_initial_load,
                "total_sales": total_sales,
                "total_collected": total_collected,
                "total_damages": damage_today,
                "returned": returned_crates
            },
            "profit_loss": {
                "total_buy_crates": total_buy_crates,
                "buy_rate": round(buy_rate, 2),
                "buy_value": round(buy_value, 2),
                "total_sale_crates": total_sale_crates,
                "sale_rate": round(sale_rate, 2),
                "sale_value": round(sale_value, 2)
            },
            "expenses": {
                "salesman_expenses": round(salesman_expenses, 2),
                "other_expenses": round(other_expenses, 2),
                "damage_loss": round(damage_loss, 2),
                "total_expenses": round(total_expenses, 2),
                "total_sale": round(sale_value, 2),
                "net_purchase": round(net_purchase, 2),
                "net_profit": round(net_profit, 2),
                "carryover_tomorrow": carryover_tomorrow
            },
            "salesman_status": {
                "salesmen": salesman_status,
                "total_salesmen": len(all_salesmen),
                "active_salesmen": active_salesmen_count,
                "submitted_count": submitted_count,
                "pending_count": pending_submissions,
                "all_submitted": all_submitted
            }
        },
        message="Daily summary generated successfully"
    )



@router.post("/submit")
async def submit_daily_summary(
    date: Optional[str] = Query(None, description="Summary date (YYYY-MM-DD). Defaults to today (IST)."),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_admin)
):
    """
    Submit and lock the daily summary for a specific date.
    Once submitted, no initial loads, sales, or expenses can be added for that date.
    All dates follow IST (Indian Standard Time).
    """
    if date:
        target_date = date
    else:
        target_date = get_ist_date()
    
    # Check if already submitted
    existing = await db.daily_summaries.find_one({"date": target_date})
    if existing:
        raise HTTPException(status_code=400, detail=f"Daily summary for {target_date} has already been submitted")
    
    # Get the full summary data first
    # (Reuse the same calculation logic from get_daily_summary)
    target_date_obj = datetime.strptime(target_date, "%Y-%m-%d")
    previous_date = (target_date_obj - timedelta(days=1)).strftime("%Y-%m-%d")
    
    # Get carryover
    prev_purchase_pipeline = [
        {"$match": {"purchase_date": {"$lt": target_date}}},
        {"$group": {"_id": None, "total_crates": {"$sum": "$crates"}, "total_value": {"$sum": "$total"}}}
    ]
    prev_purchase_result = await db.purchases.aggregate(prev_purchase_pipeline).to_list(1)
    prev_total_purchased = prev_purchase_result[0]["total_crates"] if prev_purchase_result else 0
    prev_total_purchase_value = prev_purchase_result[0]["total_value"] if prev_purchase_result else 0
    
    prev_sales_pipeline = [
        {"$match": {"sale_date": {"$lt": target_date}}},
        {"$group": {"_id": None, "total_crates": {"$sum": "$crates"}}}
    ]
    prev_sales_result = await db.sales.aggregate(prev_sales_pipeline).to_list(1)
    prev_total_sold = prev_sales_result[0]["total_crates"] if prev_sales_result else 0
    
    prev_damage_pipeline = [
        {"$match": {"report_date": {"$lt": target_date}}},
        {"$group": {"_id": None, "total_damaged": {"$sum": "$crates_damaged"}}}
    ]
    prev_damage_result = await db.sale_reports.aggregate(prev_damage_pipeline).to_list(1)
    prev_total_damaged = prev_damage_result[0]["total_damaged"] if prev_damage_result else 0
    
    carryover_crates = max(0, prev_total_purchased - prev_total_sold - prev_total_damaged)
    carryover_price = round(prev_total_purchase_value / (prev_total_purchased * 30), 2) if prev_total_purchased > 0 else 0
    carryover_value = round(carryover_crates * 30 * carryover_price, 2)
    
    # Today's purchases
    today_purchase_pipeline = [
        {"$match": {"purchase_date": target_date}},
        {"$group": {"_id": None, "total_crates": {"$sum": "$crates"}, "total_value": {"$sum": "$total"}}}
    ]
    today_purchase_result = await db.purchases.aggregate(today_purchase_pipeline).to_list(1)
    purchase_today = today_purchase_result[0]["total_crates"] if today_purchase_result else 0
    purchase_today_value = round(today_purchase_result[0]["total_value"], 2) if today_purchase_result else 0
    purchase_rate = round(purchase_today_value / (purchase_today * 30), 2) if purchase_today > 0 else 0
    
    total_crates = carryover_crates + purchase_today
    total_value = round(carryover_value + purchase_today_value, 2)
    average_rate = round(total_value / (total_crates * 30), 2) if total_crates > 0 else 0
    
    # Damage
    today_damage_pipeline = [
        {"$match": {"report_date": target_date}},
        {"$group": {"_id": None, "total_damaged": {"$sum": "$crates_damaged"}}}
    ]
    today_damage_result = await db.sale_reports.aggregate(today_damage_pipeline).to_list(1)
    damage_today = today_damage_result[0]["total_damaged"] if today_damage_result else 0
    net_crates = total_crates - damage_today
    
    # Sales
    initial_load_pipeline = [
        {"$match": {"load_date": target_date}},
        {"$group": {"_id": None, "total": {"$sum": "$initial_crates"}}}
    ]
    initial_load_result = await db.initial_loads.aggregate(initial_load_pipeline).to_list(1)
    total_initial_load = initial_load_result[0]["total"] if initial_load_result else 0
    
    today_sales_pipeline = [
        {"$match": {"sale_date": target_date}},
        {"$group": {"_id": None, "total_crates": {"$sum": "$crates"}, "total_value": {"$sum": "$order_amount"}}}
    ]
    today_sales_result = await db.sales.aggregate(today_sales_pipeline).to_list(1)
    total_sales = today_sales_result[0]["total_crates"] if today_sales_result else 0
    total_sale_value = round(today_sales_result[0]["total_value"], 2) if today_sales_result else 0
    sale_rate = round(total_sale_value / (total_sales * 30), 2) if total_sales > 0 else 0
    returned_crates = max(0, total_initial_load - total_sales - damage_today)
    
    # Expenses
    salesman_expense_pipeline = [
        {"$match": {"report_date": target_date}},
        {"$group": {"_id": None, "total": {"$sum": "$expense"}}}
    ]
    salesman_expense_result = await db.sale_reports.aggregate(salesman_expense_pipeline).to_list(1)
    salesman_expenses = round(salesman_expense_result[0]["total"], 2) if salesman_expense_result else 0
    
    other_expense_pipeline = [
        {"$match": {"expense_date": target_date}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    other_expense_result = await db.expenses.aggregate(other_expense_pipeline).to_list(1)
    other_expenses = round(other_expense_result[0]["total"], 2) if other_expense_result else 0
    
    # Damaged eggs loss
    damage_loss = round(damage_today * 30 * average_rate, 2)
    total_expenses = round(salesman_expenses + other_expenses + damage_loss, 2)
    
    # Profit calculation
    buy_rate = average_rate
    buy_value = round(net_crates * 30 * buy_rate, 2)
    net_purchase = round(total_sales * 30 * buy_rate, 2)
    net_profit = round(total_sale_value - net_purchase - total_expenses, 2)
    carryover_tomorrow = max(0, net_crates - total_sales)
    
    # Create summary record
    summary_record = {
        "id": str(uuid.uuid4()),
        "date": target_date,
        "crate_information": {
            "carryover_today": carryover_crates,
            "carryover_price": carryover_price,
            "carryover_value": carryover_value,
            "purchase_today": purchase_today,
            "purchase_rate": purchase_rate,
            "purchase_value": purchase_today_value,
            "total_crates": total_crates,
            "average_rate": average_rate,
            "damage": damage_today,
            "net_crates": net_crates
        },
        "sale_information": {
            "total_initial_load": total_initial_load,
            "total_sales": total_sales,
            "total_damages": damage_today,
            "returned": returned_crates
        },
        "profit_loss": {
            "total_buy_crates": net_crates,
            "buy_rate": buy_rate,
            "buy_value": buy_value,
            "total_sale_crates": total_sales,
            "sale_rate": sale_rate,
            "sale_value": total_sale_value
        },
        "expenses": {
            "salesman_expenses": salesman_expenses,
            "other_expenses": other_expenses,
            "damage_loss": damage_loss,
            "total_expenses": total_expenses,
            "total_sale": total_sale_value,
            "net_purchase": net_purchase,
            "net_profit": net_profit,
            "carryover_tomorrow": carryover_tomorrow
        },
        "submitted_by": current_user.get("sub"),
        "submitted_at": get_ist_now().isoformat(),
        "created_at": get_ist_now().isoformat()
    }
    
    await db.daily_summaries.insert_one(summary_record)
    
    return success_response(
        data={"date": target_date, "id": summary_record["id"]},
        message=f"Daily summary for {target_date} submitted successfully"
    )


@router.get("/submitted")
async def get_submitted_summaries(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_admin)
):
    """
    Get all submitted daily summaries (history).
    """
    cursor = db.daily_summaries.find({}, {"_id": 0}).sort("date", -1).skip(skip).limit(limit)
    summaries = await cursor.to_list(limit)
    total = await db.daily_summaries.count_documents({})
    
    return success_response(
        data={
            "summaries": summaries,
            "total": total,
            "skip": skip,
            "limit": limit
        },
        message="Submitted summaries fetched successfully"
    )


@router.get("/submitted/{date}")
async def get_submitted_summary_by_date(
    date: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_admin)
):
    """
    Get a specific submitted daily summary by date.
    """
    summary = await db.daily_summaries.find_one({"date": date}, {"_id": 0})
    if not summary:
        raise HTTPException(status_code=404, detail=f"No submitted summary found for {date}")
    
    return success_response(
        data=summary,
        message="Submitted summary fetched successfully"
    )


@router.get("/check-submitted")
async def check_if_submitted(
    date: Optional[str] = Query(None, description="Date to check (YYYY-MM-DD). Defaults to today (IST)."),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_admin)
):
    """
    Check if a daily summary has been submitted for a specific date.
    All dates follow IST (Indian Standard Time).
    """
    if date:
        target_date = date
    else:
        target_date = get_ist_date()
    
    summary = await db.daily_summaries.find_one({"date": target_date}, {"_id": 0, "date": 1, "submitted_at": 1})
    
    return success_response(
        data={
            "date": target_date,
            "is_submitted": summary is not None,
            "submitted_at": summary.get("submitted_at") if summary else None
        },
        message="Submission status checked"
    )
