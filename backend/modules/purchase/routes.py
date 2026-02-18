from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from core.database import get_database
from core.response import success_response
from auth.security import get_current_user
from modules.purchase.service import PurchaseService
from modules.purchase.schemas import PurchaseCreateRequest, PurchaseUpdateRequest

router = APIRouter(prefix="/purchases", tags=["Purchases"])

def verify_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Verify that the current user is an admin"""
    if current_user.get("role") not in ["superadmin", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Admin only.")
    return current_user

def get_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> PurchaseService:
    return PurchaseService(db)

@router.post("")
async def create_purchase(
    request: PurchaseCreateRequest,
    service: PurchaseService = Depends(get_service),
    current_user: dict = Depends(verify_admin)
):
    """Create a new purchase"""
    purchase = await service.create_purchase(request)
    return success_response(
        data=purchase.model_dump(),
        message="Purchase created successfully"
    )

@router.get("")
async def get_all_purchases(
    from_date: Optional[str] = Query(None, description="Filter from date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="Filter to date (YYYY-MM-DD)"),
    supplier_id: Optional[str] = Query(None, description="Filter by supplier ID"),
    service: PurchaseService = Depends(get_service),
    current_user: dict = Depends(verify_admin)
):
    """Get all purchases with optional filters"""
    result = await service.get_all_purchases(
        from_date=from_date,
        to_date=to_date,
        supplier_id=supplier_id
    )
    return success_response(
        data=result,
        message="Purchases fetched successfully"
    )

@router.get("/{purchase_id}")
async def get_purchase(
    purchase_id: str,
    service: PurchaseService = Depends(get_service),
    current_user: dict = Depends(verify_admin)
):
    """Get a purchase by ID"""
    purchase = await service.get_purchase_by_id(purchase_id)
    return success_response(
        data=purchase.model_dump(),
        message="Purchase fetched successfully"
    )

@router.delete("/{purchase_id}")
async def delete_purchase(
    purchase_id: str,
    service: PurchaseService = Depends(get_service),
    current_user: dict = Depends(verify_admin)
):
    """Delete a purchase"""
    await service.delete_purchase(purchase_id)
    return success_response(
        data=None,
        message="Purchase deleted successfully"
    )

@router.put("/{purchase_id}")
async def update_purchase(
    purchase_id: str,
    request: PurchaseUpdateRequest,
    service: PurchaseService = Depends(get_service),
    current_user: dict = Depends(verify_admin)
):
    """Update a purchase"""
    purchase = await service.update_purchase(purchase_id, request)
    return success_response(
        data=purchase.model_dump(),
        message="Purchase updated successfully"
    )
