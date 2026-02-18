from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from core.timezone import get_ist_now

class SaleModel(BaseModel):
    """Database model for Sale document"""
    id: str
    salesman_id: str
    shop_id: str
    shop_name: Optional[str] = None  # Shop name for easy reference
    crates: int
    price: float  # Price per egg
    order_amount: float
    shop_previous_dues: float
    total_amount: float
    collected_amount: float
    pending_amount: float
    payment_type: str
    return_tray: int
    # Tray balance tracking
    previous_tray_balance: int  # Shop's tray balance before this transaction
    current_tray_balance: int   # Shop's tray balance after this transaction
    # Dues tracking (current_dues = pending_amount, but stored for clarity)
    current_dues: float  # Shop's dues after this transaction
    # Transaction type: "Sale" if crates > 0, else "Collection"
    transaction_type: str
    # Optional image
    image_url: Optional[str] = None
    sale_date: str  # Date of sale (YYYY-MM-DD)
    sale_time: str  # Time of sale (HH:MM:SS)
    created_at: str = Field(default_factory=lambda: get_ist_now().isoformat())
    
    class Config:
        populate_by_name = True
