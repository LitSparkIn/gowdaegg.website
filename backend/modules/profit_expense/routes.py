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
    date: str = Query(None, description="Date in YYYY-MM-DD format. Defaults to today IST."),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_admin)
):
    """
    Get profit and expense summary for a given date.
    Returns the saved snapshot if the daily summary was submitted, otherwise calculates live.
    """
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


async def calculate_profit_expense(db, target_date: str) -> dict:
    """Calculate profit and expense summary for a date from live data."""

    # Get daily summary data for gross profit
    daily_summary = await db.daily_summaries.find_one(
        {"date": target_date},
        {"_id": 0, "expenses": 1}
    )

    total_sale = 0
    net_purchase = 0
    if daily_summary and daily_summary.get("expenses"):
        total_sale = daily_summary["expenses"].get("total_sale", 0)
        net_purchase = daily_summary["expenses"].get("net_purchase", 0)

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

    total_expenses = round(general_total + transportation_total + salary_total, 2)
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
        "total_expenses": total_expenses,
        "net_profit": net_profit,
    }
