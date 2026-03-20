from pydantic import BaseModel, Field
from typing import Optional

# ============ Request Schemas ============

class SalaryExpenseCreateRequest(BaseModel):
    """Schema for creating a new salary expense (payment to salesman)"""
    salesman_id: str = Field(..., description="Salesman ID")
    amount: float = Field(..., gt=0, description="Amount paid")
    payment_mode: str = Field(..., description="Payment mode: Cash, Cheque, Online")
    comments: Optional[str] = Field(default="", description="Comments or notes")


class SalaryExpenseUpdateRequest(BaseModel):
    """Schema for updating a salary expense"""
    amount: Optional[float] = Field(None, gt=0, description="Amount paid")
    payment_mode: Optional[str] = Field(None, description="Payment mode: Cash, Cheque, Online")
    comments: Optional[str] = Field(None, description="Comments or notes")


# ============ Response Schemas ============

class SalaryExpenseResponse(BaseModel):
    """Schema for salary expense response"""
    id: str
    salesman_id: str
    salesman_name: str
    amount: float
    payment_mode: str
    comments: Optional[str] = ""
    expense_date: str
    created_at: str
    updated_at: str


class SalaryExpenseListResponse(BaseModel):
    """Schema for list of salary expenses"""
    expenses: list[SalaryExpenseResponse]
    total: int
    total_amount: float


class MessageResponse(BaseModel):
    """Generic message response"""
    message: str
