from pydantic import BaseModel, Field
from typing import Optional

# ============ Request Schemas ============

class SaleCreateRequest(BaseModel):
    """Schema for creating a sale"""
    shop_id: str = Field(..., description="Shop ID")
    crates: int = Field(..., ge=0, description="Number of crates")
    price: float = Field(..., ge=0, description="Price per egg")
    order_amount: float = Field(..., ge=0, description="Order amount")
    shop_previous_dues: float = Field(default=0, description="Shop's previous dues")
    total_amount: float = Field(..., description="Total amount")
    collected_amount: float = Field(default=0, ge=0, description="Amount collected")
    pending_amount: float = Field(default=0, description="Pending amount (can be negative if overpaid)")
    payment_type: str = Field(..., description="Payment type (Cash, UPI, Credit, etc.)")
    return_tray: int = Field(default=0, ge=0, description="Number of trays returned")

class SaleUpdateRequest(BaseModel):
    """Schema for updating a sale"""
    crates: int = Field(..., ge=0, description="Number of crates")
    price: float = Field(..., ge=0, description="Price per egg")
    collected_amount: float = Field(default=0, ge=0, description="Amount collected")
    payment_type: str = Field(..., description="Payment type (Cash, UPI, Credit, etc.)")
    return_tray: int = Field(default=0, ge=0, description="Number of trays returned")

# ============ Response Schemas ============

class SaleResponse(BaseModel):
    """Schema for sale response"""
    id: str
    salesman_id: str
    salesman_name: Optional[str] = None
    shop_id: str
    shop_name: Optional[str] = None
    crates: int
    price: float
    order_amount: float
    shop_previous_dues: float
    total_amount: float
    collected_amount: float
    pending_amount: float
    payment_type: str
    return_tray: int
    previous_tray_balance: int
    current_tray_balance: int
    current_dues: float
    transaction_type: str
    image_url: Optional[str] = None
    sale_date: str
    sale_time: str
    created_at: str
    shop_tray_balance: Optional[int] = None  # Current shop tray balance from shop record

class SaleWithDetailsResponse(BaseModel):
    """Schema for sale with shop and salesman details"""
    id: str
    salesman_id: str
    salesman_name: str
    shop_id: str
    shop_name: str
    shop_phone: str
    route_name: str
    crates: int
    price: float
    order_amount: float
    shop_previous_dues: float
    total_amount: float
    collected_amount: float
    pending_amount: float
    payment_type: str
    return_tray: int
    previous_tray_balance: int
    current_tray_balance: int
    current_dues: float
    transaction_type: str
    image_url: Optional[str] = None
    sale_date: str
    sale_time: str
    created_at: str
    credit_threshold: float = 0.0
