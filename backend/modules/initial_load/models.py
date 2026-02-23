from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from core.timezone import get_ist_now

class InitialLoadModel(BaseModel):
    """Database model for Initial Load document"""
    id: str
    salesman_id: str
    initial_crates: int
    load_date: str  # Date of the load (YYYY-MM-DD)
    created_at: str = Field(default_factory=lambda: get_ist_now().isoformat())
    # Report submission tracking
    report_submitted: bool = False  # True if this load is part of a submitted report
    sale_report_id: Optional[str] = None  # ID of the report this load was included in
    
    class Config:
        populate_by_name = True
