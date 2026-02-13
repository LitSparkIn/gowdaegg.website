from pydantic import BaseModel, Field
from typing import Optional

# ============ Request Schemas ============

class ExpenseCreateRequest(BaseModel):
    """Schema for creating a new expense"""
    amount: float = Field(..., gt=0, description="Expense amount")
    category: Optional[str] = Field(default="", max_length=100, description="Expense category (optional)")
    description: str = Field(..., min_length=1, max_length=1000, description="Expense description")

class ExpenseUpdateRequest(BaseModel):
    """Schema for updating an existing expense"""
    amount: Optional[float] = Field(None, gt=0, description="Expense amount")
    category: Optional[str] = Field(None, max_length=100, description="Expense category")
    description: Optional[str] = Field(None, min_length=1, max_length=1000, description="Expense description")

# ============ Response Schemas ============

class ExpenseResponse(BaseModel):
    """Schema for expense response"""
    id: str
    amount: float
    category: str
    description: str
    expense_date: str
    created_at: str
    updated_at: str

class ExpenseListResponse(BaseModel):
    """Schema for list of expenses response"""
    expenses: list[ExpenseResponse]
    total: int
    total_amount: float

class MessageResponse(BaseModel):
    """Generic message response"""
    message: str
