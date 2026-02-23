from pydantic import BaseModel, Field
from typing import Optional
from datetime import date

# ============ Request Schemas ============

class SalarySetupCreateRequest(BaseModel):
    """Schema for creating a new salary setup"""
    salesman_id: str = Field(..., description="Salesman ID")
    joining_date: str = Field(..., description="Joining date (YYYY-MM-DD)")
    monthly_salary: float = Field(..., ge=0, description="Monthly salary amount")
    current_balance: float = Field(default=0, ge=0, description="Current salary balance")


class SalarySetupUpdateRequest(BaseModel):
    """Schema for updating a salary setup"""
    joining_date: Optional[str] = Field(None, description="Joining date (YYYY-MM-DD)")
    monthly_salary: Optional[float] = Field(None, ge=0, description="Monthly salary amount")


class SalaryBalanceUpdateRequest(BaseModel):
    """Schema for updating salary balance (monthly addition)"""
    amount: float = Field(..., description="Amount to add to balance")
    remarks: Optional[str] = Field(default="Monthly salary credit", description="Remarks for this transaction")


# ============ Response Schemas ============

class SalarySetupResponse(BaseModel):
    """Schema for salary setup response"""
    id: str
    salesman_id: str
    salesman_name: str
    joining_date: str
    monthly_salary: float
    current_balance: float
    created_at: str
    updated_at: str


class SalaryActivityResponse(BaseModel):
    """Schema for salary activity response"""
    id: str
    salary_setup_id: str
    salesman_id: str
    salesman_name: str
    activity_type: str  # 'credit', 'debit', 'adjustment'
    amount: float
    balance_before: float
    balance_after: float
    remarks: str
    activity_date: str
    created_at: str


class SalarySetupListResponse(BaseModel):
    """Schema for list of salary setups"""
    setups: list[SalarySetupResponse]
    total: int


class SalaryActivityListResponse(BaseModel):
    """Schema for list of salary activities"""
    activities: list[SalaryActivityResponse]
    total: int


class MessageResponse(BaseModel):
    """Generic message response"""
    message: str
