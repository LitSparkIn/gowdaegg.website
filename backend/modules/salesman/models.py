from pydantic import BaseModel, Field
from datetime import datetime, timezone
from core.timezone import get_ist_now

class SalesmanModel(BaseModel):
    """Database model for Salesman document"""
    id: str
    route_id: str
    name: str
    phone: str
    email: str
    pin_hash: str  # Store hashed PIN for security
    created_at: str = Field(default_factory=lambda: get_ist_now().isoformat())
    updated_at: str = Field(default_factory=lambda: get_ist_now().isoformat())
    is_active: bool = True
    
    class Config:
        populate_by_name = True
