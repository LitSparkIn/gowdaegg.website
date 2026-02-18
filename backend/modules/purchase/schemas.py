from pydantic import BaseModel, Field
from typing import Optional

# ============ Request Schemas ============

class PurchaseCreateRequest(BaseModel):
    """Schema for creating a new purchase"""
    supplier_id: str = Field(..., description="ID of the supplier")
    crates: int = Field(..., ge=1, description="Number of crates")
    price: float = Field(..., gt=0, description="Price per egg")
    amount_paid: float = Field(..., ge=0, description="Amount paid")
    payment_mode: str = Field(..., description="Payment mode: Cash, Cheque, Online, Bill")

class PurchaseUpdateRequest(BaseModel):
    """Schema for updating a purchase"""
    crates: int = Field(..., ge=1, description="Number of crates")
    price: float = Field(..., gt=0, description="Price per egg")
    amount_paid: float = Field(..., ge=0, description="Amount paid")
    payment_mode: str = Field(..., description="Payment mode: Cash, Cheque, Online, Bill")

# ============ Response Schemas ============

class PurchaseResponse(BaseModel):
    """Schema for purchase response"""
    id: str
    supplier_id: str
    supplier_name: str
    crates: int
    price: float
    total: float
    previous_dues: float
    grand_total: float
    amount_paid: float
    pending_amount: float
    payment_mode: str
    purchase_date: str
    purchase_time: str
    created_at: str

class PurchaseListResponse(BaseModel):
    """Schema for list of purchases response"""
    purchases: list[PurchaseResponse]
    total_records: int
    total_amount: float
    total_paid: float
    total_pending: float
