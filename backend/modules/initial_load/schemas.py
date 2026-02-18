from pydantic import BaseModel, Field
from typing import Optional

# ============ Request Schemas ============

class InitialLoadCreateRequest(BaseModel):
    """Schema for creating initial load"""
    initial_crates: int = Field(..., gt=0, description="Number of initial crates")

class InitialLoadUpdateRequest(BaseModel):
    """Schema for updating initial load"""
    initial_crates: int = Field(..., gt=0, description="Number of initial crates")

# ============ Response Schemas ============

class InitialLoadResponse(BaseModel):
    """Schema for initial load response"""
    id: str
    salesman_id: str
    initial_crates: int
    load_date: str
    created_at: str

class InitialLoadWithSalesmanResponse(BaseModel):
    """Schema for initial load with salesman details"""
    id: str
    salesman_id: str
    salesman_name: str
    salesman_phone: str
    route_name: str
    initial_crates: int
    load_date: str
    created_at: str

class InitialLoadListResponse(BaseModel):
    """Schema for admin initial load list"""
    total_crates: int
    total_records: int
    initial_loads: list[InitialLoadWithSalesmanResponse]
