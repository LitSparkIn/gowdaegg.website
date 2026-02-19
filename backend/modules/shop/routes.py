from fastapi import APIRouter, Depends, Query
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from core.database import get_database
from auth.security import get_current_user
from modules.shop.service import ShopService
from modules.shop.schemas import (
    ShopCreateRequest,
    ShopUpdateRequest,
    ShopResponse,
    ShopListResponse,
    MessageResponse
)

router = APIRouter(prefix="/shops", tags=["Shops"])

def get_shop_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> ShopService:
    """Dependency to get ShopService instance"""
    return ShopService(db)

@router.post("", response_model=ShopResponse)
async def create_shop(
    request: ShopCreateRequest,
    service: ShopService = Depends(get_shop_service),
    current_user: dict = Depends(get_current_user)
):
    """Create a new shop"""
    return await service.create_shop(request)

@router.get("", response_model=ShopListResponse)
async def get_shops(
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=1000),
    route_id: Optional[str] = Query(None, description="Filter by route ID"),
    service: ShopService = Depends(get_shop_service),
    current_user: dict = Depends(get_current_user)
):
    """Get all shops with pagination and optional route filter"""
    return await service.get_all_shops(skip=skip, limit=limit, route_id=route_id)

@router.get("/{shop_id}", response_model=ShopResponse)
async def get_shop(
    shop_id: str,
    service: ShopService = Depends(get_shop_service),
    current_user: dict = Depends(get_current_user)
):
    """Get a single shop by ID"""
    return await service.get_shop(shop_id)

@router.put("/{shop_id}", response_model=ShopResponse)
async def update_shop(
    shop_id: str,
    request: ShopUpdateRequest,
    service: ShopService = Depends(get_shop_service),
    current_user: dict = Depends(get_current_user)
):
    """Update an existing shop"""
    return await service.update_shop(shop_id, request)

@router.delete("/{shop_id}", response_model=MessageResponse)
async def delete_shop(
    shop_id: str,
    service: ShopService = Depends(get_shop_service),
    current_user: dict = Depends(get_current_user)
):
    """Deactivate a shop (soft delete)"""
    await service.delete_shop(shop_id)
    return MessageResponse(message="Shop deactivated successfully")
