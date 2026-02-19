from fastapi import APIRouter, Depends, Query
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from core.database import get_database
from auth.security import get_current_user
from modules.salesman.service import SalesmanService
from modules.salesman.schemas import (
    SalesmanCreateRequest,
    SalesmanUpdateRequest,
    SalesmanResponse,
    SalesmanListResponse,
    MessageResponse
)

router = APIRouter(prefix="/salesmen", tags=["Salesmen"])

def get_salesman_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> SalesmanService:
    """Dependency to get SalesmanService instance"""
    return SalesmanService(db)

@router.post("", response_model=SalesmanResponse)
async def create_salesman(
    request: SalesmanCreateRequest,
    service: SalesmanService = Depends(get_salesman_service),
    current_user: dict = Depends(get_current_user)
):
    """Create a new salesman"""
    return await service.create_salesman(request)

@router.get("", response_model=SalesmanListResponse)
async def get_salesmen(
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=1000),
    route_id: Optional[str] = Query(None, description="Filter by route ID"),
    service: SalesmanService = Depends(get_salesman_service),
    current_user: dict = Depends(get_current_user)
):
    """Get all salesmen with pagination and optional route filter"""
    return await service.get_all_salesmen(skip=skip, limit=limit, route_id=route_id)

@router.get("/{salesman_id}", response_model=SalesmanResponse)
async def get_salesman(
    salesman_id: str,
    service: SalesmanService = Depends(get_salesman_service),
    current_user: dict = Depends(get_current_user)
):
    """Get a single salesman by ID"""
    return await service.get_salesman(salesman_id)

@router.put("/{salesman_id}", response_model=SalesmanResponse)
async def update_salesman(
    salesman_id: str,
    request: SalesmanUpdateRequest,
    service: SalesmanService = Depends(get_salesman_service),
    current_user: dict = Depends(get_current_user)
):
    """Update an existing salesman"""
    return await service.update_salesman(salesman_id, request)

@router.delete("/{salesman_id}", response_model=MessageResponse)
async def delete_salesman(
    salesman_id: str,
    service: SalesmanService = Depends(get_salesman_service),
    current_user: dict = Depends(get_current_user)
):
    """Deactivate a salesman (soft delete)"""
    await service.delete_salesman(salesman_id)
    return MessageResponse(message="Salesman deactivated successfully")
