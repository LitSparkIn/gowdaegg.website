from datetime import datetime, timezone
from typing import Optional
import uuid
from motor.motor_asyncio import AsyncIOMotorDatabase

from modules.expense.repository import ExpenseRepository
from modules.expense.models import ExpenseModel
from modules.expense.schemas import (
    ExpenseCreateRequest, 
    ExpenseUpdateRequest, 
    ExpenseResponse,
    ExpenseListResponse
)
from core.exceptions import NotFoundException
from core.timezone import get_ist_now

class ExpenseService:
    """Service layer for Expense business logic."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.repository = ExpenseRepository(db)
    
    async def create_expense(self, request: ExpenseCreateRequest) -> ExpenseResponse:
        """Create a new expense with current date (IST)"""
        now = get_ist_now()
        expense_date = now.strftime("%Y-%m-%d")  # Store date only
        
        expense = ExpenseModel(
            id=str(uuid.uuid4()),
            amount=request.amount,
            category=request.category or "",
            description=request.description,
            expense_date=expense_date,
            created_at=now.isoformat(),
            updated_at=now.isoformat()
        )
        
        await self.repository.create(expense)
        return ExpenseResponse(**expense.model_dump())
    
    async def get_expense(self, expense_id: str) -> ExpenseResponse:
        """Get a single expense by ID"""
        expense = await self.repository.get_by_id(expense_id)
        if not expense:
            raise NotFoundException("Expense", expense_id)
        return ExpenseResponse(**expense)
    
    async def get_all_expenses(
        self, 
        skip: int = 0, 
        limit: int = 1000,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None
    ) -> ExpenseListResponse:
        """Get all expenses with optional date filtering"""
        expenses = await self.repository.get_all(
            skip=skip, 
            limit=limit,
            from_date=from_date,
            to_date=to_date
        )
        total = await self.repository.get_count(from_date=from_date, to_date=to_date)
        total_amount = await self.repository.get_total_amount(from_date=from_date, to_date=to_date)
        
        return ExpenseListResponse(
            expenses=[ExpenseResponse(**e) for e in expenses],
            total=total,
            total_amount=total_amount
        )
    
    async def update_expense(self, expense_id: str, request: ExpenseUpdateRequest) -> ExpenseResponse:
        """Update an existing expense"""
        existing = await self.repository.get_by_id(expense_id)
        if not existing:
            raise NotFoundException("Expense", expense_id)
        
        update_data = {"updated_at": get_ist_now().isoformat()}
        
        if request.amount is not None:
            update_data["amount"] = request.amount
        if request.category is not None:
            update_data["category"] = request.category
        if request.description is not None:
            update_data["description"] = request.description
        
        updated = await self.repository.update(expense_id, update_data)
        return ExpenseResponse(**updated)
    
    async def delete_expense(self, expense_id: str) -> bool:
        """Delete an expense"""
        exists = await self.repository.exists(expense_id)
        if not exists:
            raise NotFoundException("Expense", expense_id)
        await self.repository.delete(expense_id)
        return True
