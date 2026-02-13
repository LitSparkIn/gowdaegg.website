from pydantic import BaseModel, Field
from datetime import datetime, timezone
from core.timezone import get_ist_now

class InitialLoadModel(BaseModel):
    """Database model for Initial Load document"""
    id: str
    salesman_id: str
    initial_crates: int
    load_date: str  # Date of the load (YYYY-MM-DD)
    created_at: str = Field(default_factory=lambda: get_ist_now().isoformat())
    
    class Config:
        populate_by_name = True
