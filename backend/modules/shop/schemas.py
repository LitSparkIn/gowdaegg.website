from pydantic import BaseModel, Field, field_validator
from typing import Optional
import re

# ============ Request Schemas ============

class ShopCreateRequest(BaseModel):
    """Schema for creating a new shop"""
    name: str = Field(..., min_length=1, max_length=200, description="Name of the shop")
    phone: str = Field(..., description="10-digit phone number")
    address: str = Field(..., min_length=1, max_length=500, description="Shop address")
    previous_dues: float = Field(default=0.0, description="Previous dues amount")
    credit_threshold: float = Field(default=0.0, description="Credit threshold limit")
    route_id: str = Field(..., description="Route ID the shop belongs to")
    tray_balance: int = Field(default=0, description="Tray balance count")
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        # Remove any spaces or dashes
        cleaned = re.sub(r'[\s\-]', '', v)
        if not cleaned.isdigit() or len(cleaned) != 10:
            raise ValueError('Phone number must be exactly 10 digits')
        return cleaned

class ShopUpdateRequest(BaseModel):
    """Schema for updating an existing shop"""
    name: Optional[str] = Field(None, min_length=1, max_length=200, description="Name of the shop")
    phone: Optional[str] = Field(None, description="10-digit phone number")
    address: Optional[str] = Field(None, min_length=1, max_length=500, description="Shop address")
    previous_dues: Optional[float] = Field(None, description="Previous dues amount")
    credit_threshold: Optional[float] = Field(None, description="Credit threshold limit")
    route_id: Optional[str] = Field(None, description="Route ID the shop belongs to")
    tray_balance: Optional[int] = Field(None, description="Tray balance count")
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        if v is None:
            return v
        cleaned = re.sub(r'[\s\-]', '', v)
        if not cleaned.isdigit() or len(cleaned) != 10:
            raise ValueError('Phone number must be exactly 10 digits')
        return cleaned

# ============ Response Schemas ============

class RouteInfo(BaseModel):
    """Embedded route info in shop response"""
    id: str
    route_name: str

class ShopResponse(BaseModel):
    """Schema for shop response"""
    id: str
    name: str
    phone: str
    address: str
    previous_dues: float
    credit_threshold: float = 0.0
    route_id: str
    route: Optional[RouteInfo] = None
    tray_balance: int
    created_at: str
    updated_at: str

class ShopListResponse(BaseModel):
    """Schema for list of shops response"""
    shops: list[ShopResponse]
    total: int

class MessageResponse(BaseModel):
    """Generic message response"""
    message: str
