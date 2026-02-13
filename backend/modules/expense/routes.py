from fastapi import APIRouter, Depends, Query
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from core.database import get_database
from auth.security import get_current_user
from modules.expense.service import ExpenseService
from modules.expense.schemas import (
    ExpenseCreateRequest,
    ExpenseUpdateRequest,
    ExpenseResponse,
    ExpenseListResponse,
    MessageResponse
)

router = APIRouter(prefix="/expenses", tags=["Expenses"])

def get_expense_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> ExpenseService:
    return ExpenseService(db)

@router.post("", response_model=ExpenseResponse)
async def create_expense(
    request: ExpenseCreateRequest,
    service: ExpenseService = Depends(get_expense_service),
    current_user: dict = Depends(get_current_user)
):
    """Create a new expense (date is auto-set to current date)"""
    return await service.create_expense(request)

@router.get("", response_model=ExpenseListResponse)
async def get_expenses(
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=1000),
    from_date: Optional[str] = Query(None, description="Filter from date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="Filter to date (YYYY-MM-DD)"),
    service: ExpenseService = Depends(get_expense_service),
    current_user: dict = Depends(get_current_user)
):
    """Get all expenses with optional date range filter"""
    return await service.get_all_expenses(
        skip=skip, 
        limit=limit,
        from_date=from_date,
        to_date=to_date
    )

@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    expense_id: str,
    service: ExpenseService = Depends(get_expense_service),
    current_user: dict = Depends(get_current_user)
):
    """Get a single expense by ID"""
    return await service.get_expense(expense_id)

@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: str,
    request: ExpenseUpdateRequest,
    service: ExpenseService = Depends(get_expense_service),
    current_user: dict = Depends(get_current_user)
):
    """Update an existing expense"""
    return await service.update_expense(expense_id, request)

@router.delete("/{expense_id}", response_model=MessageResponse)
async def delete_expense(
    expense_id: str,
    service: ExpenseService = Depends(get_expense_service),
    current_user: dict = Depends(get_current_user)
):
    """Delete an expense"""
    await service.delete_expense(expense_id)
    return MessageResponse(message="Expense deleted successfully")
