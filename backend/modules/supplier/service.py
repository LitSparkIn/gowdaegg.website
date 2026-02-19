from datetime import datetime, timezone
from typing import Optional
import uuid
from motor.motor_asyncio import AsyncIOMotorDatabase

from modules.supplier.repository import SupplierRepository
from modules.supplier.models import SupplierModel
from modules.supplier.schemas import (
    SupplierCreateRequest, 
    SupplierUpdateRequest, 
    SupplierResponse,
    SupplierListResponse
)
from core.exceptions import NotFoundException, ConflictException
from core.timezone import get_ist_now

class SupplierService:
    """Service layer for Supplier business logic."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.repository = SupplierRepository(db)
    
    async def create_supplier(self, request: SupplierCreateRequest) -> SupplierResponse:
        """Create a new supplier"""
        # Check for duplicate name
        existing = await self.repository.get_by_name(request.name)
        if existing:
            raise ConflictException(f"Supplier with name '{request.name}' already exists")
        
        now = get_ist_now().isoformat()
        supplier = SupplierModel(
            id=str(uuid.uuid4()),
            name=request.name,
            previous_dues=request.previous_dues,
            created_at=now,
            updated_at=now
        )
        
        await self.repository.create(supplier)
        return SupplierResponse(**supplier.model_dump())
    
    async def get_supplier(self, supplier_id: str) -> SupplierResponse:
        """Get a single supplier by ID"""
        supplier = await self.repository.get_by_id(supplier_id)
        if not supplier:
            raise NotFoundException("Supplier", supplier_id)
        return SupplierResponse(**supplier)
    
    async def get_all_suppliers(self, skip: int = 0, limit: int = 1000) -> SupplierListResponse:
        """Get all suppliers with pagination (active and inactive)"""
        suppliers = await self.repository.get_all(skip=skip, limit=limit)
        inactive_suppliers = await self.repository.get_inactive(skip=0, limit=1000)
        total = await self.repository.get_count()
        return SupplierListResponse(
            suppliers=[SupplierResponse(**s) for s in suppliers],
            inactive_suppliers=[SupplierResponse(**s) for s in inactive_suppliers],
            total=total
        )
    
    async def update_supplier(self, supplier_id: str, request: SupplierUpdateRequest) -> SupplierResponse:
        """Update an existing supplier"""
        existing = await self.repository.get_by_id(supplier_id)
        if not existing:
            raise NotFoundException("Supplier", supplier_id)
        
        update_data = {"updated_at": get_ist_now().isoformat()}
        
        if request.name is not None:
            name_check = await self.repository.get_by_name(request.name)
            if name_check and name_check["id"] != supplier_id:
                raise ConflictException(f"Supplier with name '{request.name}' already exists")
            update_data["name"] = request.name
            
        if request.previous_dues is not None:
            update_data["previous_dues"] = request.previous_dues
        
        updated = await self.repository.update(supplier_id, update_data)
        return SupplierResponse(**updated)
    
    async def delete_supplier(self, supplier_id: str) -> bool:
        """Soft delete a supplier (mark as inactive)"""
        exists = await self.repository.exists(supplier_id)
        if not exists:
            raise NotFoundException("Supplier", supplier_id)
        await self.repository.delete(supplier_id)
        return True

    async def activate_supplier(self, supplier_id: str) -> bool:
        """Activate an inactive supplier"""
        exists = await self.repository.exists(supplier_id)
        if not exists:
            raise NotFoundException("Supplier", supplier_id)
        await self.repository.activate(supplier_id)
        return True
