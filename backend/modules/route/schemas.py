from pydantic import BaseModel, Field
from typing import Optional

# ============ Request Schemas ============

class RouteCreateRequest(BaseModel):
    """Schema for creating a new route"""
    route_name: str = Field(..., min_length=1, max_length=100, description="Name of the route")

class RouteUpdateRequest(BaseModel):
    """Schema for updating an existing route"""
    route_name: Optional[str] = Field(None, min_length=1, max_length=100, description="Name of the route")

# ============ Response Schemas ============

class RouteResponse(BaseModel):
    """Schema for route response"""
    id: str
    route_name: str
    created_at: str
    updated_at: str

class RouteListResponse(BaseModel):
    """Schema for list of routes response"""
    routes: list[RouteResponse]
    total: int

class MessageResponse(BaseModel):
    """Generic message response"""
    message: str
