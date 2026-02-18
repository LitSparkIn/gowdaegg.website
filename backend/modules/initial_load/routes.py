from fastapi import APIRouter, Depends, HTTPException, Query, Form
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from core.database import get_database
from core.response import success_response
from auth.security import get_current_user
from modules.initial_load.service import InitialLoadService
from modules.initial_load.schemas import InitialLoadCreateRequest, InitialLoadUpdateRequest

router = APIRouter(prefix="/salesman/initial-loads", tags=["Initial Loads"])

def verify_salesman(current_user: dict = Depends(get_current_user)) -> dict:
    """Verify that the current user is a salesman"""
    if current_user.get("role") != "salesman":
        raise HTTPException(status_code=403, detail="Access denied. Salesman only.")
    return current_user

def get_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> InitialLoadService:
    return InitialLoadService(db)

@router.post("")
async def create_initial_load(
    initial_crates: int = Form(..., ge=1, description="Number of crates to load"),
    service: InitialLoadService = Depends(get_service),
    current_user: dict = Depends(verify_salesman)
):
    """
    Create an initial load for the current salesman (form data).
    The salesman is identified by their JWT token.
    """
    salesman_id = current_user["sub"]
    
    request = InitialLoadCreateRequest(initial_crates=initial_crates)
    load = await service.create_initial_load(salesman_id, request)
    
    return success_response(
        data=load.model_dump(),
        message="Initial load created successfully"
    )

@router.get("")
async def get_initial_loads(
    service: InitialLoadService = Depends(get_service),
    current_user: dict = Depends(verify_salesman)
):
    """
    Get all initial loads for the current salesman for today.
    The salesman is identified by their JWT token.
    Returns total and initial loads array.
    """
    salesman_id = current_user["sub"]
    
    result = await service.get_salesman_loads_today(salesman_id)
    
    return success_response(
        data=result,
        message="Initial loads fetched successfully"
    )


# ============ Admin Routes ============

admin_router = APIRouter(prefix="/initial-loads", tags=["Initial Loads - Admin"])

def verify_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Verify that the current user is an admin"""
    if current_user.get("role") not in ["superadmin", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Admin only.")
    return current_user

@admin_router.get("")
async def get_all_initial_loads_admin(
    from_date: Optional[str] = Query(None, description="Filter from date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="Filter to date (YYYY-MM-DD)"),
    salesman_id: Optional[str] = Query(None, description="Filter by salesman ID"),
    service: InitialLoadService = Depends(get_service),
    current_user: dict = Depends(verify_admin)
):
    """
    Get all initial loads for admin panel.
    Supports filtering by date range and salesman.
    """
    result = await service.get_all_loads_admin(
        from_date=from_date,
        to_date=to_date,
        salesman_id=salesman_id
    )
    
    return success_response(
        data=result,
        message="Initial loads fetched successfully"
    )

@admin_router.put("/{load_id}")
async def update_initial_load(
    load_id: str,
    request: InitialLoadUpdateRequest,
    service: InitialLoadService = Depends(get_service),
    current_user: dict = Depends(verify_admin)
):
    """
    Update an initial load's crates.
    """
    result = await service.update_initial_load(load_id, request)
    
    return success_response(
        data=result.model_dump(),
        message="Initial load updated successfully"
    )
