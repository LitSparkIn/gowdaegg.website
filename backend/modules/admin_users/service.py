import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase

from modules.admin_users.repository import AdminUserRepository
from modules.admin_users.models import AdminUserModel
from modules.admin_users.schemas import (
    AdminCreateRequest, 
    AdminUpdateRequest, 
    AdminResponse,
    AdminChangePasswordRequest
)
from auth.security import hash_password
from core.exceptions import BadRequestException, NotFoundException

class AdminUserService:
    """Service layer for Admin User business logic."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.repository = AdminUserRepository(db)
    
    async def create_admin(self, request: AdminCreateRequest) -> AdminResponse:
        """Create a new admin user"""
        # Validate passwords match
        if request.password != request.confirm_password:
            raise BadRequestException("Passwords do not match")
        
        # Validate password strength
        if len(request.password) < 6:
            raise BadRequestException("Password must be at least 6 characters")
        
        # Check if email already exists
        existing = await self.repository.get_by_email(request.email)
        if existing:
            raise BadRequestException(f"Admin with email '{request.email}' already exists")
        
        now = datetime.now(timezone.utc).isoformat()
        
        admin = AdminUserModel(
            id=str(uuid.uuid4()),
            name=request.name,
            email=request.email,
            phone=request.phone,
            password_hash=hash_password(request.password),
            role="admin",
            is_active=True,
            created_at=now
        )
        
        await self.repository.create(admin)
        
        return AdminResponse(
            id=admin.id,
            name=admin.name,
            email=admin.email,
            phone=admin.phone,
            role=admin.role,
            is_active=admin.is_active,
            created_at=admin.created_at
        )
    
    async def get_all_admins(self, include_inactive: bool = True) -> list[AdminResponse]:
        """Get all admin users"""
        admins = await self.repository.get_all(include_inactive=include_inactive)
        return [
            AdminResponse(
                id=a["id"],
                name=a["name"],
                email=a["email"],
                phone=a["phone"],
                role=a["role"],
                is_active=a.get("is_active", True),
                created_at=a["created_at"],
                updated_at=a.get("updated_at")
            )
            for a in admins
        ]
    
    async def get_admin_by_id(self, admin_id: str) -> AdminResponse:
        """Get admin by ID"""
        admin = await self.repository.get_by_id(admin_id)
        if not admin:
            raise NotFoundException(f"Admin with id '{admin_id}' not found")
        
        return AdminResponse(
            id=admin["id"],
            name=admin["name"],
            email=admin["email"],
            phone=admin["phone"],
            role=admin["role"],
            is_active=admin.get("is_active", True),
            created_at=admin["created_at"],
            updated_at=admin.get("updated_at")
        )
    
    async def update_admin(self, admin_id: str, request: AdminUpdateRequest) -> AdminResponse:
        """Update admin user"""
        admin = await self.repository.get_by_id(admin_id)
        if not admin:
            raise NotFoundException(f"Admin with id '{admin_id}' not found")
        
        update_data = {}
        
        if request.name is not None:
            update_data["name"] = request.name
        if request.email is not None:
            # Check if email is taken by another admin
            existing = await self.repository.get_by_email(request.email)
            if existing and existing["id"] != admin_id:
                raise BadRequestException(f"Email '{request.email}' is already in use")
            update_data["email"] = request.email
        if request.phone is not None:
            update_data["phone"] = request.phone
        
        if update_data:
            update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            updated = await self.repository.update(admin_id, update_data)
        else:
            updated = admin
        
        return AdminResponse(
            id=updated["id"],
            name=updated["name"],
            email=updated["email"],
            phone=updated["phone"],
            role=updated["role"],
            is_active=updated.get("is_active", True),
            created_at=updated["created_at"],
            updated_at=updated.get("updated_at")
        )
    
    async def change_password(self, admin_id: str, request: AdminChangePasswordRequest) -> str:
        """Change admin password"""
        admin = await self.repository.get_by_id(admin_id)
        if not admin:
            raise NotFoundException(f"Admin with id '{admin_id}' not found")
        
        if request.new_password != request.confirm_password:
            raise BadRequestException("Passwords do not match")
        
        if len(request.new_password) < 6:
            raise BadRequestException("Password must be at least 6 characters")
        
        update_data = {
            "password_hash": hash_password(request.new_password),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await self.repository.update(admin_id, update_data)
        return "Password changed successfully"
    
    async def toggle_active(self, admin_id: str, is_active: bool) -> AdminResponse:
        """Activate or deactivate admin"""
        admin = await self.repository.get_by_id(admin_id)
        if not admin:
            raise NotFoundException(f"Admin with id '{admin_id}' not found")
        
        update_data = {
            "is_active": is_active,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        updated = await self.repository.update(admin_id, update_data)
        
        return AdminResponse(
            id=updated["id"],
            name=updated["name"],
            email=updated["email"],
            phone=updated["phone"],
            role=updated["role"],
            is_active=updated.get("is_active", True),
            created_at=updated["created_at"],
            updated_at=updated.get("updated_at")
        )
