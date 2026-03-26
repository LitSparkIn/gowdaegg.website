from fastapi import APIRouter, Depends, Query, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from core.database import get_database
from core.response import success_response
from core.timezone import get_ist_date
from auth.security import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/profit-expense-summary", tags=["Profit Expense Summary"])


def verify_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") not in ["superadmin", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Admin only.")
    return current_user


@router.get("")
async def get_profit_expense_summary(
    date: str = Query(None, description="Single date YYYY-MM-DD. Defaults to today IST."),
    from_date: str = Query(None, description="Range start date YYYY-MM-DD"),
    to_date: str = Query(None, description="Range end date YYYY-MM-DD"),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_admin)
):
    """
    Get profit and expense summary.
    If from_date and to_date provided, aggregates across that range.
    Otherwise uses single date (default today).
    """
    if from_date and to_date:
        data = await calculate_profit_expense_range(db, from_date, to_date)
        return success_response(data=data, message="Profit & expense summary fetched (range)")

    target_date = date or get_ist_date()

    # Check for saved snapshot first
    snapshot = await db.profit_expense_summaries.find_one(
        {"date": target_date},
        {"_id": 0}
    )

    if snapshot:
        return success_response(
            data=snapshot,
            message="Profit & expense summary fetched (submitted)"
        )

    # Calculate live if no snapshot
    data = await calculate_profit_expense(db, target_date)
    data["is_submitted"] = False

    return success_response(
        data=data,
        message="Profit & expense summary fetched (live)"
    )


async def calculate_profit_expense_range(db, from_date: str, to_date: str) -> dict:
    """Aggregate profit and expense data across a date range."""
    date_filter = {"$gte": from_date, "$lte": to_date}

    # Sales
    sales_pipeline = [
        {"$match": {"sale_date": date_filter}},
        {"$group": {"_id": None, "total_crates": {"$sum": "$crates"}, "total_value": {"$sum": "$order_amount"}}}
    ]
    sales_result = await db.sales.aggregate(sales_pipeline).to_list(1)
    total_sale = round(sales_result[0]["total_value"], 2) if sales_result else 0
    total_crates = sales_result[0]["total_crates"] if sales_result else 0

    # COGS from purchases
    purchase_pipeline = [
        {"$match": {"purchase_date": date_filter}},
        {"$group": {"_id": None, "total_crates": {"$sum": "$crates"}, "weighted_sum": {"$sum": {"$multiply": ["$crates", "$rate"]}}}}
    ]
    purchase_result = await db.purchases.aggregate(purchase_pipeline).to_list(1)
    if purchase_result and purchase_result[0].get("total_crates", 0) > 0:
        buy_rate = round(purchase_result[0]["weighted_sum"] / purchase_result[0]["total_crates"], 2)
    else:
        buy_rate = 0
    net_purchase = round(total_crates * 30 * buy_rate, 2)

    # Also check daily_summaries for submitted days
    summaries = await db.daily_summaries.find(
        {"date": date_filter},
        {"_id": 0, "expenses": 1}
    ).to_list(1000)
    if summaries:
        sum_total_sale = sum(s.get("expenses", {}).get("total_sale", 0) for s in summaries)
        sum_net_purchase = sum(s.get("expenses", {}).get("net_purchase", 0) for s in summaries)
        if sum_total_sale > 0:
            total_sale = round(sum_total_sale, 2)
            net_purchase = round(sum_net_purchase, 2)

    gross_profit = round(total_sale - net_purchase, 2)

    # 1. General Expenses
    general_expenses = await db.expenses.find(
        {"expense_date": date_filter},
        {"_id": 0, "id": 1, "category": 1, "description": 1, "amount": 1, "expense_date": 1}
    ).to_list(1000)
    general_total = round(sum(e.get("amount", 0) for e in general_expenses), 2)

    # 2. Transportation Expenses
    transportation_expenses = await db.transportation_expenses.find(
        {"expense_date": date_filter},
        {"_id": 0, "id": 1, "salesman_name": 1, "total_expense": 1, "vehicle_number": 1, "comments": 1, "expense_date": 1}
    ).to_list(1000)
    transportation_total = round(sum(e.get("total_expense", 0) for e in transportation_expenses), 2)

    # 3. Salary Expenses
    salary_expenses = await db.salary_expenses.find(
        {"expense_date": date_filter},
        {"_id": 0, "id": 1, "salesman_name": 1, "amount": 1, "remarks": 1, "expense_date": 1}
    ).to_list(1000)
    salary_total = round(sum(e.get("amount", 0) for e in salary_expenses), 2)

    # 4. Salesman Expenses
    salesman_expenses = await db.sale_reports.find(
        {"report_date": date_filter, "expense": {"$gt": 0}},
        {"_id": 0, "id": 1, "salesman_name": 1, "expense": 1, "food_expense": 1, "diesel_expense": 1, "other_expense": 1, "report_date": 1}
    ).to_list(1000)
    salesman_expense_total = round(sum(e.get("expense", 0) for e in salesman_expenses), 2)
    salesman_food_total = round(sum(e.get("food_expense", 0) for e in salesman_expenses), 2)
    salesman_diesel_total = round(sum(e.get("diesel_expense", 0) for e in salesman_expenses), 2)
    salesman_other_total = round(sum(e.get("other_expense", 0) for e in salesman_expenses), 2)

    total_expenses = round(general_total + transportation_total + salary_total + salesman_expense_total, 2)
    net_profit = round(gross_profit - total_expenses, 2)

    return {
        "date": f"{from_date} to {to_date}",
        "from_date": from_date,
        "to_date": to_date,
        "is_submitted": False,
        "total_sale": total_sale,
        "net_purchase": net_purchase,
        "gross_profit": gross_profit,
        "general_expenses": general_expenses,
        "general_total": general_total,
        "transportation_expenses": [
            {"id": e["id"], "description": f"{e.get('salesman_name', 'N/A')}" + (f" - {e.get('vehicle_number', '')}" if e.get('vehicle_number') else ""), "amount": e.get("total_expense", 0), "comments": e.get("comments", "")}
            for e in transportation_expenses
        ],
        "transportation_total": transportation_total,
        "salary_expenses": [
            {"id": e["id"], "description": e.get("salesman_name", "N/A"), "amount": e.get("amount", 0), "remarks": e.get("remarks", "")}
            for e in salary_expenses
        ],
        "salary_total": salary_total,
        "salesman_expenses": [
            {"id": e["id"], "description": e.get("salesman_name", "N/A"), "amount": e.get("expense", 0), "food_expense": e.get("food_expense", 0), "diesel_expense": e.get("diesel_expense", 0), "other_expense": e.get("other_expense", 0)}
            for e in salesman_expenses
        ],
        "salesman_expense_total": salesman_expense_total,
        "salesman_food_total": salesman_food_total,
        "salesman_diesel_total": salesman_diesel_total,
        "salesman_other_total": salesman_other_total,
        "total_expenses": total_expenses,
        "net_profit": net_profit,
    }


async def calculate_profit_expense(db, target_date: str) -> dict:
    """Calculate profit and expense summary for a date from live data."""

    # Get daily summary data for gross profit
    daily_summary = await db.daily_summaries.find_one(
        {"date": target_date},
        {"_id": 0, "expenses": 1, "profit_loss": 1}
    )

    total_sale = 0
    net_purchase = 0
    if daily_summary and daily_summary.get("expenses"):
        total_sale = daily_summary["expenses"].get("total_sale", 0)
        net_purchase = daily_summary["expenses"].get("net_purchase", 0)

    # If no daily summary yet, calculate live from sales data
    if total_sale == 0:
        sales_pipeline = [
            {"$match": {"sale_date": target_date}},
            {"$group": {
                "_id": None,
                "total_crates": {"$sum": "$crates"},
                "total_value": {"$sum": "$order_amount"}
            }}
        ]
        sales_result = await db.sales.aggregate(sales_pipeline).to_list(1)
        if sales_result:
            total_sale = round(sales_result[0].get("total_value", 0), 2)
            total_crates = sales_result[0].get("total_crates", 0)

            # Calculate net_purchase (COGS) from purchase data
            purchase_pipeline = [
                {"$match": {"purchase_date": target_date}},
                {"$group": {
                    "_id": None,
                    "total_crates": {"$sum": "$crates"},
                    "total_amount": {"$sum": "$amount"},
                    "weighted_sum": {"$sum": {"$multiply": ["$crates", "$rate"]}}
                }}
            ]
            purchase_result = await db.purchases.aggregate(purchase_pipeline).to_list(1)
            if purchase_result and purchase_result[0].get("total_crates", 0) > 0:
                buy_rate = round(purchase_result[0]["weighted_sum"] / purchase_result[0]["total_crates"], 2)
            else:
                buy_rate = 0
            net_purchase = round(total_crates * 30 * buy_rate, 2)

    gross_profit = round(total_sale - net_purchase, 2)

    # Fetch individual expense line items from 3 sources

    # 1. General Expenses
    general_expenses = await db.expenses.find(
        {"expense_date": target_date},
        {"_id": 0, "id": 1, "category": 1, "description": 1, "amount": 1}
    ).to_list(1000)
    general_total = round(sum(e.get("amount", 0) for e in general_expenses), 2)

    # 2. Transportation Expenses
    transportation_expenses = await db.transportation_expenses.find(
        {"expense_date": target_date},
        {"_id": 0, "id": 1, "salesman_name": 1, "total_expense": 1, "vehicle_number": 1, "comments": 1}
    ).to_list(1000)
    transportation_total = round(sum(e.get("total_expense", 0) for e in transportation_expenses), 2)

    # 3. Salary Expenses
    salary_expenses = await db.salary_expenses.find(
        {"expense_date": target_date},
        {"_id": 0, "id": 1, "salesman_name": 1, "amount": 1, "remarks": 1}
    ).to_list(1000)
    salary_total = round(sum(e.get("amount", 0) for e in salary_expenses), 2)

    # 4. Salesman Expenses (from sale reports)
    salesman_expenses = await db.sale_reports.find(
        {"report_date": target_date, "expense": {"$gt": 0}},
        {"_id": 0, "id": 1, "salesman_name": 1, "expense": 1, "food_expense": 1, "diesel_expense": 1, "other_expense": 1}
    ).to_list(1000)
    salesman_expense_total = round(sum(e.get("expense", 0) for e in salesman_expenses), 2)
    salesman_food_total = round(sum(e.get("food_expense", 0) for e in salesman_expenses), 2)
    salesman_diesel_total = round(sum(e.get("diesel_expense", 0) for e in salesman_expenses), 2)
    salesman_other_total = round(sum(e.get("other_expense", 0) for e in salesman_expenses), 2)

    total_expenses = round(general_total + transportation_total + salary_total + salesman_expense_total, 2)
    net_profit = round(gross_profit - total_expenses, 2)

    return {
        "date": target_date,
        "total_sale": round(total_sale, 2),
        "net_purchase": round(net_purchase, 2),
        "gross_profit": gross_profit,
        "general_expenses": general_expenses,
        "general_total": general_total,
        "transportation_expenses": [
            {
                "id": e["id"],
                "description": f"{e.get('salesman_name', 'N/A')}" + (f" - {e.get('vehicle_number', '')}" if e.get('vehicle_number') else ""),
                "amount": e.get("total_expense", 0),
                "comments": e.get("comments", "")
            }
            for e in transportation_expenses
        ],
        "transportation_total": transportation_total,
        "salary_expenses": [
            {
                "id": e["id"],
                "description": e.get("salesman_name", "N/A"),
                "amount": e.get("amount", 0),
                "remarks": e.get("remarks", "")
            }
            for e in salary_expenses
        ],
        "salary_total": salary_total,
        "salesman_expenses": [
            {
                "id": e["id"],
                "description": e.get("salesman_name", "N/A"),
                "amount": e.get("expense", 0),
                "food_expense": e.get("food_expense", 0),
                "diesel_expense": e.get("diesel_expense", 0),
                "other_expense": e.get("other_expense", 0),
            }
            for e in salesman_expenses
        ],
        "salesman_expense_total": salesman_expense_total,
        "salesman_food_total": salesman_food_total,
        "salesman_diesel_total": salesman_diesel_total,
        "salesman_other_total": salesman_other_total,
        "total_expenses": total_expenses,
        "net_profit": net_profit,
    }
