from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from core.timezone import get_ist_now

class RouteModel(BaseModel):
    """Database model for Route document"""
    id: str
    route_name: str
    created_at: str = Field(default_factory=lambda: get_ist_now().isoformat())
    updated_at: str = Field(default_factory=lambda: get_ist_now().isoformat())
    is_active: bool = True
    
    class Config:
        # Allow population by field name
        populate_by_name = True
