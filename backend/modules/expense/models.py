from pydantic import BaseModel, Field
from datetime import datetime, timezone
from core.timezone import get_ist_now

class ExpenseModel(BaseModel):
    """Database model for Expense document"""
    id: str
    amount: float
    category: str = ""
    description: str
    expense_date: str  # Date when expense was recorded
    created_at: str = Field(default_factory=lambda: get_ist_now().isoformat())
    updated_at: str = Field(default_factory=lambda: get_ist_now().isoformat())
    
    class Config:
        populate_by_name = True
