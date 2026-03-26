from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from core.timezone import get_ist_now

class SaleReportModel(BaseModel):
    """Database model for submitted Sale Report document"""
    id: str
    salesman_id: str
    salesman_name: str
    report_date: str  # Date of the report (YYYY-MM-DD)
    initial_crates: int  # Total Initial Load
    crates_sold: int  # Total Sold
    crates_damaged: int  # Damaged Crates (user entered)
    remaining_crates: int  # Total - Sold - Damaged
    cash_collected: float
    expense: float  # User entered
    food_expense: float = 0  # Food expense breakdown
    diesel_expense: float = 0  # Diesel expense breakdown
    other_expense: float = 0  # Other expense breakdown
    remaining_cash: float  # cash_collected - expense
    cheque: float
    online: float
    return_tray: int  # User entered
    comments: str  # User entered
    image_url: Optional[str] = None  # Optional image
    denomination: Optional[dict] = None  # Cash denomination breakdown
    submitted_at: str = Field(default_factory=lambda: get_ist_now().isoformat())
    
    class Config:
        populate_by_name = True
