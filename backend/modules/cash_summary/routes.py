from fastapi import APIRouter, Depends, Query, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field
from typing import Optional
import uuid

from core.database import get_database
from core.response import success_response
from core.timezone import get_ist_date, get_ist_now
from auth.security import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cash-summary", tags=["Cash Summary"])


def verify_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") not in ["superadmin", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Admin only.")
    return current_user


class CashTransactionRequest(BaseModel):
    type: str = Field(..., pattern="^(credit|debit)$")
    amount: float = Field(..., gt=0)
    denomination: Optional[dict] = None
    comments: str = Field(default="")


@router.get("")
async def get_cash_summary(
    date: str = Query(None, description="Date in YYYY-MM-DD format. Defaults to today IST."),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_admin)
):
    """Get daily cash summary and all transactions for a given date."""
    target_date = date or get_ist_date()

    # Get all transactions for the date
    transactions = await db.cash_transactions.find(
        {"date": target_date},
        {"_id": 0}
    ).sort("created_at", 1).to_list(1000)

    # Calculate totals
    total_credit = 0
    total_debit = 0
    for t in transactions:
        if t["type"] == "credit":
            total_credit += t["amount"]
        else:
            total_debit += t["amount"]

    # Check if daily summary snapshot exists
    daily_snapshot = await db.daily_cash_summaries.find_one(
        {"date": target_date},
        {"_id": 0}
    )

    return success_response(
        data={
            "date": target_date,
            "transactions": transactions,
            "total_credit": round(total_credit, 2),
            "total_debit": round(total_debit, 2),
            "net_cash": round(total_credit - total_debit, 2),
            "transaction_count": len(transactions),
            "is_submitted": daily_snapshot is not None,
            "snapshot": daily_snapshot
        },
        message="Cash summary fetched successfully"
    )


@router.post("/transaction")
async def create_cash_transaction(
    request: CashTransactionRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_admin)
):
    """Manually add a credit or debit cash transaction for today."""
    target_date = get_ist_date()
    now = get_ist_now().isoformat()

    transaction = {
        "id": str(uuid.uuid4()),
        "date": target_date,
        "type": request.type,
        "amount": round(request.amount, 2),
        "denomination": request.denomination,
        "comments": request.comments,
        "source": "manual",
        "created_by": current_user.get("name", current_user.get("sub", "Admin")),
        "created_at": now
    }

    await db.cash_transactions.insert_one(transaction)
    transaction.pop("_id", None)

    return success_response(
        data=transaction,
        message=f"Cash {request.type} of {request.amount} recorded successfully"
    )


@router.delete("/transaction/{transaction_id}")
async def delete_cash_transaction(
    transaction_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_admin)
):
    """Delete a manual cash transaction."""
    result = await db.cash_transactions.delete_one({"id": transaction_id, "source": "manual"})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found or cannot be deleted (auto-generated)")

    return success_response(data=None, message="Transaction deleted successfully")
