from pydantic import BaseModel
from typing import Optional

# ============ Response Schemas for Salesman API ============

class RouteResponse(BaseModel):
    """Route info for salesman"""
    id: str
    route_name: str

class RouteListResponse(BaseModel):
    """List of routes"""
    routes: list[RouteResponse]
    total: int

class ShopResponse(BaseModel):
    """Shop info for salesman"""
    id: str
    name: str
    phone: str
    address: str
    previous_dues: float
    tray_balance: int
    route_id: str

class ShopListResponse(BaseModel):
    """List of shops"""
    shops: list[ShopResponse]
    total: int
