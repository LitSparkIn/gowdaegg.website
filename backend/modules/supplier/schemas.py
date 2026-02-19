from pydantic import BaseModel, Field
from typing import Optional

# ============ Request Schemas ============

class SupplierCreateRequest(BaseModel):
    """Schema for creating a new supplier"""
    name: str = Field(..., min_length=1, max_length=200, description="Name of the supplier")
    previous_dues: float = Field(default=0.0, description="Previous dues amount")

class SupplierUpdateRequest(BaseModel):
    """Schema for updating an existing supplier"""
    name: Optional[str] = Field(None, min_length=1, max_length=200, description="Name of the supplier")
    previous_dues: Optional[float] = Field(None, description="Previous dues amount")

# ============ Response Schemas ============

class SupplierResponse(BaseModel):
    """Schema for supplier response"""
    id: str
    name: str
    previous_dues: float
    is_active: Optional[bool] = True
    created_at: str
    updated_at: str

class SupplierListResponse(BaseModel):
    """Schema for list of suppliers response"""
    suppliers: list[SupplierResponse]
    inactive_suppliers: Optional[list[SupplierResponse]] = []
    total: int

class MessageResponse(BaseModel):
    """Generic message response"""
    message: str
