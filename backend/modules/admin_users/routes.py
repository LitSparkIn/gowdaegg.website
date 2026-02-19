from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from core.database import get_database
from core.response import success_response
from auth.security import get_current_user
from modules.admin_users.service import AdminUserService
from modules.admin_users.schemas import (
    AdminCreateRequest,
    AdminUpdateRequest,
    AdminChangePasswordRequest
)

router = APIRouter(prefix="/admin-users", tags=["Admin Users"])

def verify_superadmin(current_user: dict = Depends(get_current_user)) -> dict:
    """Verify that the current user is a superadmin"""
    if current_user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Access denied. Superadmin only.")
    return current_user

def get_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> AdminUserService:
    return AdminUserService(db)

@router.post("")
async def create_admin(
    request: AdminCreateRequest,
    service: AdminUserService = Depends(get_service),
    current_user: dict = Depends(verify_superadmin)
):
    """Create a new admin user (Superadmin only)"""
    admin = await service.create_admin(request)
    return success_response(
        data=admin.model_dump(),
        message="Admin created successfully"
    )

@router.get("")
async def get_all_admins(
    service: AdminUserService = Depends(get_service),
    current_user: dict = Depends(verify_superadmin)
):
    """Get all admin users (Superadmin only)"""
    admins = await service.get_all_admins(include_inactive=True)
    return success_response(
        data={"admins": [a.model_dump() for a in admins], "total": len(admins)},
        message="Admins fetched successfully"
    )

@router.get("/{admin_id}")
async def get_admin(
    admin_id: str,
    service: AdminUserService = Depends(get_service),
    current_user: dict = Depends(verify_superadmin)
):
    """Get admin by ID (Superadmin only)"""
    admin = await service.get_admin_by_id(admin_id)
    return success_response(
        data=admin.model_dump(),
        message="Admin fetched successfully"
    )

@router.put("/{admin_id}")
async def update_admin(
    admin_id: str,
    request: AdminUpdateRequest,
    service: AdminUserService = Depends(get_service),
    current_user: dict = Depends(verify_superadmin)
):
    """Update admin user (Superadmin only)"""
    admin = await service.update_admin(admin_id, request)
    return success_response(
        data=admin.model_dump(),
        message="Admin updated successfully"
    )

@router.post("/{admin_id}/change-password")
async def change_admin_password(
    admin_id: str,
    request: AdminChangePasswordRequest,
    service: AdminUserService = Depends(get_service),
    current_user: dict = Depends(verify_superadmin)
):
    """Change admin password (Superadmin only)"""
    message = await service.change_password(admin_id, request)
    return success_response(
        data=None,
        message=message
    )

@router.post("/{admin_id}/activate")
async def activate_admin(
    admin_id: str,
    service: AdminUserService = Depends(get_service),
    current_user: dict = Depends(verify_superadmin)
):
    """Activate admin user (Superadmin only)"""
    admin = await service.toggle_active(admin_id, is_active=True)
    return success_response(
        data=admin.model_dump(),
        message="Admin activated successfully"
    )

@router.post("/{admin_id}/deactivate")
async def deactivate_admin(
    admin_id: str,
    service: AdminUserService = Depends(get_service),
    current_user: dict = Depends(verify_superadmin)
):
    """Deactivate admin user (Superadmin only)"""
    admin = await service.toggle_active(admin_id, is_active=False)
    return success_response(
        data=admin.model_dump(),
        message="Admin deactivated successfully"
    )
