from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from core.database import get_database
from auth.security import get_current_user
from modules.supplier.service import SupplierService
from modules.supplier.schemas import (
    SupplierCreateRequest,
    SupplierUpdateRequest,
    SupplierResponse,
    SupplierListResponse,
    MessageResponse
)

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])

def get_supplier_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> SupplierService:
    return SupplierService(db)

@router.post("", response_model=SupplierResponse)
async def create_supplier(
    request: SupplierCreateRequest,
    service: SupplierService = Depends(get_supplier_service),
    current_user: dict = Depends(get_current_user)
):
    """Create a new supplier"""
    return await service.create_supplier(request)

@router.get("", response_model=SupplierListResponse)
async def get_suppliers(
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=1000),
    service: SupplierService = Depends(get_supplier_service),
    current_user: dict = Depends(get_current_user)
):
    """Get all suppliers"""
    return await service.get_all_suppliers(skip=skip, limit=limit)

@router.get("/{supplier_id}", response_model=SupplierResponse)
async def get_supplier(
    supplier_id: str,
    service: SupplierService = Depends(get_supplier_service),
    current_user: dict = Depends(get_current_user)
):
    """Get a single supplier by ID"""
    return await service.get_supplier(supplier_id)

@router.put("/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: str,
    request: SupplierUpdateRequest,
    service: SupplierService = Depends(get_supplier_service),
    current_user: dict = Depends(get_current_user)
):
    """Update an existing supplier"""
    return await service.update_supplier(supplier_id, request)

@router.delete("/{supplier_id}", response_model=MessageResponse)
async def delete_supplier(
    supplier_id: str,
    service: SupplierService = Depends(get_supplier_service),
    current_user: dict = Depends(get_current_user)
):
    """Deactivate a supplier (soft delete)"""
    await service.delete_supplier(supplier_id)
    return MessageResponse(message="Supplier deactivated successfully")
