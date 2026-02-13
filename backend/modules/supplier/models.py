from pydantic import BaseModel, Field
from datetime import datetime, timezone
from core.timezone import get_ist_now

class SupplierModel(BaseModel):
    """Database model for Supplier document"""
    id: str
    name: str
    previous_dues: float = 0.0
    created_at: str = Field(default_factory=lambda: get_ist_now().isoformat())
    updated_at: str = Field(default_factory=lambda: get_ist_now().isoformat())
    is_active: bool = True
    
    class Config:
        populate_by_name = True
