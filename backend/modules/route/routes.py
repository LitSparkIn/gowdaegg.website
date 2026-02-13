from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from core.database import get_database
from auth.security import get_current_user
from modules.route.service import RouteService
from modules.route.schemas import (
    RouteCreateRequest,
    RouteUpdateRequest,
    RouteResponse,
    RouteListResponse,
    MessageResponse
)

router = APIRouter(prefix="/routes", tags=["Routes"])

def get_route_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> RouteService:
    """Dependency to get RouteService instance"""
    return RouteService(db)

@router.post("", response_model=RouteResponse)
async def create_route(
    request: RouteCreateRequest,
    service: RouteService = Depends(get_route_service),
    current_user: dict = Depends(get_current_user)
):
    """Create a new route"""
    return await service.create_route(request)

@router.get("", response_model=RouteListResponse)
async def get_routes(
    skip: int = 0,
    limit: int = 1000,
    service: RouteService = Depends(get_route_service),
    current_user: dict = Depends(get_current_user)
):
    """Get all routes with pagination"""
    return await service.get_all_routes(skip=skip, limit=limit)

@router.get("/{route_id}", response_model=RouteResponse)
async def get_route(
    route_id: str,
    service: RouteService = Depends(get_route_service),
    current_user: dict = Depends(get_current_user)
):
    """Get a single route by ID"""
    return await service.get_route(route_id)

@router.put("/{route_id}", response_model=RouteResponse)
async def update_route(
    route_id: str,
    request: RouteUpdateRequest,
    service: RouteService = Depends(get_route_service),
    current_user: dict = Depends(get_current_user)
):
    """Update an existing route"""
    return await service.update_route(route_id, request)

@router.delete("/{route_id}", response_model=MessageResponse)
async def delete_route(
    route_id: str,
    service: RouteService = Depends(get_route_service),
    current_user: dict = Depends(get_current_user)
):
    """Delete a route"""
    await service.delete_route(route_id)
    return MessageResponse(message="Route deleted successfully")
