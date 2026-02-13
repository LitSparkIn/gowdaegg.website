from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Optional
import re

# ============ Request Schemas ============

class SalesmanCreateRequest(BaseModel):
    """Schema for creating a new salesman"""
    route_id: str = Field(..., description="Route ID assigned to salesman")
    name: str = Field(..., min_length=1, max_length=200, description="Name of the salesman")
    phone: str = Field(..., description="10-digit phone number")
    email: EmailStr = Field(..., description="Email address")
    pin: str = Field(..., description="4-digit PIN")
    confirm_pin: str = Field(..., description="Confirm 4-digit PIN")
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        cleaned = re.sub(r'[\s\-]', '', v)
        if not cleaned.isdigit() or len(cleaned) != 10:
            raise ValueError('Phone number must be exactly 10 digits')
        return cleaned
    
    @field_validator('pin')
    @classmethod
    def validate_pin(cls, v):
        if not v.isdigit() or len(v) != 4:
            raise ValueError('PIN must be exactly 4 digits')
        return v
    
    @field_validator('confirm_pin')
    @classmethod
    def validate_confirm_pin(cls, v, info):
        if 'pin' in info.data and v != info.data['pin']:
            raise ValueError('PIN and Confirm PIN must match')
        return v

class SalesmanUpdateRequest(BaseModel):
    """Schema for updating an existing salesman"""
    route_id: Optional[str] = Field(None, description="Route ID assigned to salesman")
    name: Optional[str] = Field(None, min_length=1, max_length=200, description="Name of the salesman")
    phone: Optional[str] = Field(None, description="10-digit phone number")
    email: Optional[EmailStr] = Field(None, description="Email address")
    pin: Optional[str] = Field(None, description="4-digit PIN (leave empty to keep current)")
    confirm_pin: Optional[str] = Field(None, description="Confirm 4-digit PIN")
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        if v is None:
            return v
        cleaned = re.sub(r'[\s\-]', '', v)
        if not cleaned.isdigit() or len(cleaned) != 10:
            raise ValueError('Phone number must be exactly 10 digits')
        return cleaned
    
    @field_validator('pin')
    @classmethod
    def validate_pin(cls, v):
        if v is None or v == '':
            return None
        if not v.isdigit() or len(v) != 4:
            raise ValueError('PIN must be exactly 4 digits')
        return v
    
    @field_validator('confirm_pin')
    @classmethod
    def validate_confirm_pin(cls, v, info):
        pin = info.data.get('pin')
        if pin and v != pin:
            raise ValueError('PIN and Confirm PIN must match')
        return v

# ============ Response Schemas ============

class RouteInfo(BaseModel):
    """Embedded route info in salesman response"""
    id: str
    route_name: str

class SalesmanResponse(BaseModel):
    """Schema for salesman response"""
    id: str
    route_id: str
    route: Optional[RouteInfo] = None
    name: str
    phone: str
    email: str
    created_at: str
    updated_at: str

class SalesmanListResponse(BaseModel):
    """Schema for list of salesmen response"""
    salesmen: list[SalesmanResponse]
    total: int

class MessageResponse(BaseModel):
    """Generic message response"""
    message: str
