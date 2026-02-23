from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid

from core.database import get_database
from core.response import success_response
from core.timezone import get_ist_date, get_ist_now
from auth.security import get_current_user
from modules.transportation_expense.schemas import (
    TransportationExpenseCreateRequest,
    TransportationExpenseUpdateRequest,
    TransportationExpenseResponse,
    TransportationExpenseListResponse,
    MessageResponse
)

router = APIRouter(prefix="/transportation-expenses", tags=["Transportation Expenses"])


def verify_superadmin(current_user: dict = Depends(get_current_user)) -> dict:
    """Verify that the current user is a superadmin"""
    if current_user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Access denied. Superadmin only.")
    return current_user


@router.post("")
async def create_transportation_expense(
    request: TransportationExpenseCreateRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_superadmin)
):
    """Create a new transportation expense (date is auto-set to current date IST)"""
    
    # Get salesman info
    salesman = await db.salesmen.find_one({"id": request.salesman_id}, {"_id": 0})
    if not salesman:
        raise HTTPException(status_code=404, detail="Salesman not found")
    
    # Calculate totals
    total_expense = (
        request.diesel + 
        request.driver_bata + 
        request.toll_over_load + 
        request.loading_charges + 
        request.other_expenses
    )
    balance_given_back = request.amount_given - total_expense
    
    now = get_ist_now()
    expense_date = get_ist_date()
    
    expense = {
        "id": str(uuid.uuid4()),
        "salesman_id": request.salesman_id,
        "salesman_name": salesman.get("name", "Unknown"),
        "amount_given": request.amount_given,
        "diesel": request.diesel,
        "driver_bata": request.driver_bata,
        "toll_over_load": request.toll_over_load,
        "loading_charges": request.loading_charges,
        "other_expenses": request.other_expenses,
        "total_expense": round(total_expense, 2),
        "balance_given_back": round(balance_given_back, 2),
        "expense_date": expense_date,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.transportation_expenses.insert_one(expense)
    expense.pop("_id", None)
    
    return success_response(
        data=expense,
        message="Transportation expense created successfully"
    )


@router.get("")
async def get_transportation_expenses(
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=1000),
    from_date: Optional[str] = Query(None, description="Filter from date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="Filter to date (YYYY-MM-DD)"),
    salesman_id: Optional[str] = Query(None, description="Filter by salesman ID"),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """Get all transportation expenses with optional filters"""
    
    # Verify admin access
    if current_user.get("role") not in ["superadmin", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Admin only.")
    
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
    cursor = db.transportation_expenses.find(query, {"_id": 0}).sort("expense_date", -1).skip(skip).limit(limit)
    expenses = await cursor.to_list(limit)
    
    # Get total count and amount
    total = await db.transportation_expenses.count_documents(query)
    
    total_pipeline = [
        {"$match": query},
        {"$group": {"_id": None, "total": {"$sum": "$total_expense"}}}
    ]
    total_result = await db.transportation_expenses.aggregate(total_pipeline).to_list(1)
    total_amount = round(total_result[0]["total"], 2) if total_result else 0
    
    return success_response(
        data={
            "expenses": expenses,
            "total": total,
            "total_amount": total_amount
        },
        message="Transportation expenses fetched successfully"
    )


@router.get("/{expense_id}")
async def get_transportation_expense(
    expense_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """Get a single transportation expense by ID"""
    
    # Verify admin access
    if current_user.get("role") not in ["superadmin", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Admin only.")
    
    expense = await db.transportation_expenses.find_one({"id": expense_id}, {"_id": 0})
    if not expense:
        raise HTTPException(status_code=404, detail="Transportation expense not found")
    
    return success_response(
        data=expense,
        message="Transportation expense fetched successfully"
    )


@router.put("/{expense_id}")
async def update_transportation_expense(
    expense_id: str,
    request: TransportationExpenseUpdateRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_superadmin)
):
    """Update an existing transportation expense"""
    
    # Get existing expense
    expense = await db.transportation_expenses.find_one({"id": expense_id}, {"_id": 0})
    if not expense:
        raise HTTPException(status_code=404, detail="Transportation expense not found")
    
    # Build update data
    update_data = {}
    
    if request.salesman_id is not None:
        salesman = await db.salesmen.find_one({"id": request.salesman_id}, {"_id": 0})
        if not salesman:
            raise HTTPException(status_code=404, detail="Salesman not found")
        update_data["salesman_id"] = request.salesman_id
        update_data["salesman_name"] = salesman.get("name", "Unknown")
    
    if request.amount_given is not None:
        update_data["amount_given"] = request.amount_given
    if request.diesel is not None:
        update_data["diesel"] = request.diesel
    if request.driver_bata is not None:
        update_data["driver_bata"] = request.driver_bata
    if request.toll_over_load is not None:
        update_data["toll_over_load"] = request.toll_over_load
    if request.loading_charges is not None:
        update_data["loading_charges"] = request.loading_charges
    if request.other_expenses is not None:
        update_data["other_expenses"] = request.other_expenses
    
    # Recalculate totals
    amount_given = update_data.get("amount_given", expense.get("amount_given", 0))
    diesel = update_data.get("diesel", expense.get("diesel", 0))
    driver_bata = update_data.get("driver_bata", expense.get("driver_bata", 0))
    toll_over_load = update_data.get("toll_over_load", expense.get("toll_over_load", 0))
    loading_charges = update_data.get("loading_charges", expense.get("loading_charges", 0))
    other_expenses = update_data.get("other_expenses", expense.get("other_expenses", 0))
    
    total_expense = diesel + driver_bata + toll_over_load + loading_charges + other_expenses
    balance_given_back = amount_given - total_expense
    
    update_data["total_expense"] = round(total_expense, 2)
    update_data["balance_given_back"] = round(balance_given_back, 2)
    update_data["updated_at"] = get_ist_now().isoformat()
    
    await db.transportation_expenses.update_one(
        {"id": expense_id},
        {"$set": update_data}
    )
    
    # Get updated expense
    updated_expense = await db.transportation_expenses.find_one({"id": expense_id}, {"_id": 0})
    
    return success_response(
        data=updated_expense,
        message="Transportation expense updated successfully"
    )


@router.delete("/{expense_id}")
async def delete_transportation_expense(
    expense_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_superadmin)
):
    """Delete a transportation expense"""
    
    expense = await db.transportation_expenses.find_one({"id": expense_id})
    if not expense:
        raise HTTPException(status_code=404, detail="Transportation expense not found")
    
    await db.transportation_expenses.delete_one({"id": expense_id})
    
    return success_response(
        data=None,
        message="Transportation expense deleted successfully"
    )
