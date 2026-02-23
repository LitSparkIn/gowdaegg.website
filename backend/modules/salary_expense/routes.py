from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid

from core.database import get_database
from core.response import success_response
from core.timezone import get_ist_date, get_ist_now
from auth.security import get_current_user
from modules.salary_expense.schemas import (
    SalaryExpenseCreateRequest,
    SalaryExpenseUpdateRequest,
)

router = APIRouter(prefix="/salary-expenses", tags=["Salary Expenses"])


def verify_superadmin(current_user: dict = Depends(get_current_user)) -> dict:
    """Verify that the current user is a superadmin"""
    if current_user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Access denied. Superadmin only.")
    return current_user


def verify_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Verify that the current user is an admin"""
    if current_user.get("role") not in ["superadmin", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Admin only.")
    return current_user


@router.post("")
async def create_salary_expense(
    request: SalaryExpenseCreateRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_superadmin)
):
    """
    Create a new salary expense (payment to salesman).
    This will also deduct the amount from the salesman's salary balance.
    """
    
    # Validate payment mode
    valid_modes = ["Cash", "Cheque", "Online"]
    if request.payment_mode not in valid_modes:
        raise HTTPException(status_code=400, detail=f"Invalid payment mode. Must be one of: {', '.join(valid_modes)}")
    
    # Check if salesman exists
    salesman = await db.salesmen.find_one({"id": request.salesman_id}, {"_id": 0})
    if not salesman:
        raise HTTPException(status_code=404, detail="Salesman not found")
    
    # Check if salary setup exists for this salesman
    salary_setup = await db.salary_setups.find_one({"salesman_id": request.salesman_id}, {"_id": 0})
    if not salary_setup:
        raise HTTPException(status_code=400, detail="No salary setup found for this salesman. Please create a salary setup first.")
    
    now = get_ist_now()
    expense_date = get_ist_date()
    
    expense = {
        "id": str(uuid.uuid4()),
        "salesman_id": request.salesman_id,
        "salesman_name": salesman.get("name", "Unknown"),
        "amount": request.amount,
        "payment_mode": request.payment_mode,
        "expense_date": expense_date,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.salary_expenses.insert_one(expense)
    expense.pop("_id", None)
    
    # Deduct from salary balance
    balance_before = salary_setup.get("current_balance", 0)
    balance_after = balance_before - request.amount
    
    await db.salary_setups.update_one(
        {"salesman_id": request.salesman_id},
        {"$set": {
            "current_balance": balance_after,
            "updated_at": now.isoformat()
        }}
    )
    
    # Create activity record for this deduction
    activity = {
        "id": str(uuid.uuid4()),
        "salary_setup_id": salary_setup["id"],
        "salesman_id": request.salesman_id,
        "salesman_name": salesman.get("name", "Unknown"),
        "activity_type": "debit",
        "amount": request.amount,
        "balance_before": balance_before,
        "balance_after": balance_after,
        "remarks": f"Salary payment - {request.payment_mode}",
        "activity_date": expense_date,
        "created_at": now.isoformat()
    }
    await db.salary_activities.insert_one(activity)
    
    return success_response(
        data={
            "expense": expense,
            "balance_before": balance_before,
            "balance_after": balance_after
        },
        message="Salary expense created and balance updated"
    )


@router.get("")
async def get_salary_expenses(
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=1000),
    from_date: Optional[str] = Query(None, description="Filter from date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="Filter to date (YYYY-MM-DD)"),
    salesman_id: Optional[str] = Query(None, description="Filter by salesman ID"),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_admin)
):
    """Get all salary expenses with optional filters"""
    
    # Build query
    query = {}
    if from_date or to_date:
        date_filter = {}
        if from_date:
            date_filter["$gte"] = from_date
        if to_date:
            date_filter["$lte"] = to_date
        if date_filter:
            query["expense_date"] = date_filter
    
    if salesman_id:
        query["salesman_id"] = salesman_id
    
    # Get expenses
    cursor = db.salary_expenses.find(query, {"_id": 0}).sort("expense_date", -1).skip(skip).limit(limit)
    expenses = await cursor.to_list(limit)
    
    # Get total count and amount
    total = await db.salary_expenses.count_documents(query)
    
    total_pipeline = [
        {"$match": query},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    total_result = await db.salary_expenses.aggregate(total_pipeline).to_list(1)
    total_amount = round(total_result[0]["total"], 2) if total_result else 0
    
    return success_response(
        data={
            "expenses": expenses,
            "total": total,
            "total_amount": total_amount
        },
        message="Salary expenses fetched successfully"
    )


@router.get("/{expense_id}")
async def get_salary_expense(
    expense_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_admin)
):
    """Get a single salary expense by ID"""
    
    expense = await db.salary_expenses.find_one({"id": expense_id}, {"_id": 0})
    if not expense:
        raise HTTPException(status_code=404, detail="Salary expense not found")
    
    return success_response(
        data=expense,
        message="Salary expense fetched successfully"
    )


@router.put("/{expense_id}")
async def update_salary_expense(
    expense_id: str,
    request: SalaryExpenseUpdateRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_superadmin)
):
    """Update a salary expense and adjust the salary balance accordingly"""
    
    # Get existing expense
    expense = await db.salary_expenses.find_one({"id": expense_id}, {"_id": 0})
    if not expense:
        raise HTTPException(status_code=404, detail="Salary expense not found")
    
    # Validate payment mode if provided
    if request.payment_mode:
        valid_modes = ["Cash", "Cheque", "Online"]
        if request.payment_mode not in valid_modes:
            raise HTTPException(status_code=400, detail=f"Invalid payment mode. Must be one of: {', '.join(valid_modes)}")
    
    now = get_ist_now()
    old_amount = expense.get("amount", 0)
    new_amount = request.amount if request.amount is not None else old_amount
    amount_diff = new_amount - old_amount
    
    # Update expense
    update_data = {"updated_at": now.isoformat()}
    if request.amount is not None:
        update_data["amount"] = request.amount
    if request.payment_mode is not None:
        update_data["payment_mode"] = request.payment_mode
    
    await db.salary_expenses.update_one(
        {"id": expense_id},
        {"$set": update_data}
    )
    
    # Adjust salary balance if amount changed
    if amount_diff != 0:
        salary_setup = await db.salary_setups.find_one({"salesman_id": expense["salesman_id"]}, {"_id": 0})
        if salary_setup:
            current_balance = salary_setup.get("current_balance", 0)
            new_balance = current_balance - amount_diff  # Deduct the difference
            
            await db.salary_setups.update_one(
                {"salesman_id": expense["salesman_id"]},
                {"$set": {
                    "current_balance": new_balance,
                    "updated_at": now.isoformat()
                }}
            )
            
            # Create adjustment activity
            activity = {
                "id": str(uuid.uuid4()),
                "salary_setup_id": salary_setup["id"],
                "salesman_id": expense["salesman_id"],
                "salesman_name": expense.get("salesman_name", "Unknown"),
                "activity_type": "debit" if amount_diff > 0 else "credit",
                "amount": abs(amount_diff),
                "balance_before": current_balance,
                "balance_after": new_balance,
                "remarks": "Salary expense adjustment",
                "activity_date": get_ist_date(),
                "created_at": now.isoformat()
            }
            await db.salary_activities.insert_one(activity)
    
    # Get updated expense
    updated_expense = await db.salary_expenses.find_one({"id": expense_id}, {"_id": 0})
    
    return success_response(
        data=updated_expense,
        message="Salary expense updated successfully"
    )


@router.delete("/{expense_id}")
async def delete_salary_expense(
    expense_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_superadmin)
):
    """Delete a salary expense and restore the amount to salary balance"""
    
    expense = await db.salary_expenses.find_one({"id": expense_id}, {"_id": 0})
    if not expense:
        raise HTTPException(status_code=404, detail="Salary expense not found")
    
    now = get_ist_now()
    
    # Restore amount to salary balance
    salary_setup = await db.salary_setups.find_one({"salesman_id": expense["salesman_id"]}, {"_id": 0})
    if salary_setup:
        current_balance = salary_setup.get("current_balance", 0)
        restored_balance = current_balance + expense.get("amount", 0)
        
        await db.salary_setups.update_one(
            {"salesman_id": expense["salesman_id"]},
            {"$set": {
                "current_balance": restored_balance,
                "updated_at": now.isoformat()
            }}
        )
        
        # Create restoration activity
        activity = {
            "id": str(uuid.uuid4()),
            "salary_setup_id": salary_setup["id"],
            "salesman_id": expense["salesman_id"],
            "salesman_name": expense.get("salesman_name", "Unknown"),
            "activity_type": "credit",
            "amount": expense.get("amount", 0),
            "balance_before": current_balance,
            "balance_after": restored_balance,
            "remarks": "Salary expense deleted - amount restored",
            "activity_date": get_ist_date(),
            "created_at": now.isoformat()
        }
        await db.salary_activities.insert_one(activity)
    
    # Delete the expense
    await db.salary_expenses.delete_one({"id": expense_id})
    
    return success_response(
        data=None,
        message="Salary expense deleted and balance restored"
    )
