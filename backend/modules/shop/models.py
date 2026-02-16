from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from core.timezone import get_ist_now

class ShopModel(BaseModel):
    """Database model for Shop document"""
    id: str
    name: str
    phone: str
    address: str
    previous_dues: float = 0.0
    credit_threshold: float = 0.0
    route_id: str
    tray_balance: int = 0
    created_at: str = Field(default_factory=lambda: get_ist_now().isoformat())
    updated_at: str = Field(default_factory=lambda: get_ist_now().isoformat())
    is_active: bool = True
    
    class Config:
        populate_by_name = True
