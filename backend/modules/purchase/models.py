from pydantic import BaseModel, Field
from datetime import datetime, timezone
from core.timezone import get_ist_now

class PurchaseModel(BaseModel):
    """Database model for Purchase document"""
    id: str
    supplier_id: str
    supplier_name: str
    crates: int
    price: float  # Price per egg
    total: float  # Crates * 30 * Price
    previous_dues: float  # From supplier at time of purchase
    grand_total: float  # Total + Previous Dues
    amount_paid: float
    pending_amount: float  # Grand Total - Amount Paid
    payment_mode: str  # Cash, Cheque, Online, Bill
    purchase_date: str
    purchase_time: str
    created_at: str = Field(default_factory=lambda: get_ist_now().isoformat())
    
    class Config:
        populate_by_name = True
