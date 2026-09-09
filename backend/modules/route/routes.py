from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from core.database import get_database
from core.uploads import delete_upload_file, save_upload_file
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


@router.put("/{route_id}/qr", response_model=RouteResponse)
async def upload_route_qr(
    route_id: str,
    qr_image: UploadFile = File(...),
    service: RouteService = Depends(get_route_service),
    current_user: dict = Depends(get_current_user)
):
    """Upload or replace the optional UPI QR image for a route."""
    if not qr_image.filename or not qr_image.filename.strip():
        raise HTTPException(status_code=400, detail="Please select a QR image")

    existing_route = await service.get_route(route_id)
    try:
        upi_qr_url = await save_upload_file(qr_image, "route_qr")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    try:
        updated_route = await service.update_route_qr(route_id, upi_qr_url)
    except Exception:
        delete_upload_file(upi_qr_url)
        raise

    if existing_route.upi_qr_url and existing_route.upi_qr_url != upi_qr_url:
        delete_upload_file(existing_route.upi_qr_url)

    return updated_route

@router.delete("/{route_id}", response_model=MessageResponse)
async def delete_route(
    route_id: str,
    service: RouteService = Depends(get_route_service),
    current_user: dict = Depends(get_current_user)
):
    """Deactivate a route (soft delete)"""
    await service.delete_route(route_id)
    return MessageResponse(message="Route deactivated successfully")

@router.post("/{route_id}/activate", response_model=MessageResponse)
async def activate_route(
    route_id: str,
    service: RouteService = Depends(get_route_service),
    current_user: dict = Depends(get_current_user)
):
    """Activate an inactive route"""
    await service.activate_route(route_id)
    return MessageResponse(message="Route activated successfully")
