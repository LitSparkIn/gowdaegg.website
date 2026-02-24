from pydantic import BaseModel, Field
from typing import Optional

# ============ Request Schemas ============

class TransportationExpenseCreateRequest(BaseModel):
    """Schema for creating a new transportation expense"""
    salesman_id: str = Field(..., description="Salesman ID")
    amount_given: float = Field(..., ge=0, description="Amount given to driver")
    diesel: float = Field(default=0, ge=0, description="Diesel expense")
    driver_bata: float = Field(default=0, ge=0, description="Driver bata expense")
    toll_over_load: float = Field(default=0, ge=0, description="Toll and overload charges")
    loading_charges: float = Field(default=0, ge=0, description="Loading charges")
    other_expenses: float = Field(default=0, ge=0, description="Other expenses")
    comments: Optional[str] = Field(default="", description="Comments or notes")


class TransportationExpenseUpdateRequest(BaseModel):
    """Schema for updating an existing transportation expense"""
    salesman_id: Optional[str] = Field(None, description="Salesman ID")
    amount_given: Optional[float] = Field(None, ge=0, description="Amount given to driver")
    diesel: Optional[float] = Field(None, ge=0, description="Diesel expense")
    driver_bata: Optional[float] = Field(None, ge=0, description="Driver bata expense")
    toll_over_load: Optional[float] = Field(None, ge=0, description="Toll and overload charges")
    loading_charges: Optional[float] = Field(None, ge=0, description="Loading charges")
    other_expenses: Optional[float] = Field(None, ge=0, description="Other expenses")
    comments: Optional[str] = Field(None, description="Comments or notes")


# ============ Response Schemas ============

class TransportationExpenseResponse(BaseModel):
    """Schema for transportation expense response"""
    id: str
    salesman_id: str
    salesman_name: str
    amount_given: float
    diesel: float
    driver_bata: float
    toll_over_load: float
    loading_charges: float
    other_expenses: float
    total_expense: float
    balance_given_back: float
    expense_date: str
    created_at: str
    updated_at: str


class TransportationExpenseListResponse(BaseModel):
    """Schema for list of transportation expenses response"""
    expenses: list[TransportationExpenseResponse]
    total: int
    total_amount: float


class MessageResponse(BaseModel):
    """Generic message response"""
    message: str
