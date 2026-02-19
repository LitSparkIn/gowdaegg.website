from auth.security import hash_password, verify_password, create_access_token
from auth.schemas import UserResponse, SalesmanProfileResponse
from core.exceptions import UnauthorizedException, BadRequestException
from core.database import database
import hashlib

# Hardcoded superadmin user (can be moved to DB later)
_SUPERADMIN = {
    "id": "superadmin-001",
    "email": "superadmin@gmail.com",
    "password_hash": None,  # Will be set on first access
    "name": "Super Admin",
    "role": "superadmin"
}

def _get_superadmin() -> dict:
    """Get superadmin with lazily hashed password"""
    if _SUPERADMIN["password_hash"] is None:
        _SUPERADMIN["password_hash"] = hash_password("LS@Super")
    return _SUPERADMIN

def _hash_pin(pin: str) -> str:
    """Hash PIN using SHA-256 (same as salesman module)"""
    return hashlib.sha256(pin.encode()).hexdigest()

class AuthService:
    """Authentication service handling login and user management"""
    
    async def authenticate(self, email: str, password: str) -> tuple[str, UserResponse]:
        """
        Authenticate admin user and return token with user info
        """
        superadmin = _get_superadmin()
        
        # Check superadmin first
        if email == superadmin["email"]:
            if verify_password(password, superadmin["password_hash"]):
                token = create_access_token(
                    superadmin["id"], 
                    superadmin["email"], 
                    superadmin["role"]
                )
                user = UserResponse(
                    id=superadmin["id"],
                    email=superadmin["email"],
                    name=superadmin["name"],
                    role=superadmin["role"]
                )
                return token, user
        
        # Check admin users from database
        db = database.get_db()
        admin = await db.admin_users.find_one({"email": email}, {"_id": 0})
        
        if admin:
            if not admin.get("is_active", True):
                raise UnauthorizedException("Account is deactivated. Please contact superadmin.")
            
            if verify_password(password, admin.get("password_hash", "")):
                token = create_access_token(
                    admin["id"],
                    admin["email"],
                    admin["role"]
                )
                user = UserResponse(
                    id=admin["id"],
                    email=admin["email"],
                    name=admin["name"],
                    role=admin["role"]
                )
                return token, user
        
        raise UnauthorizedException("Invalid email or password")
    
    async def authenticate_salesman(self, phone: str, pin: str) -> tuple[str, SalesmanProfileResponse]:
        """
        Authenticate salesman by phone and PIN
        
        Args:
            phone: 10-digit phone number
            pin: 4-digit PIN
            
        Returns:
            Tuple of (token, salesman_profile)
            
        Raises:
            UnauthorizedException: If credentials are invalid
        """
        db = database.get_db()
        
        # Find salesman by phone
        salesman = await db.salesmen.find_one({"phone": phone}, {"_id": 0})
        
        if not salesman:
            raise UnauthorizedException("Invalid phone number or PIN")
        
        # Verify PIN
        pin_hash = _hash_pin(pin)
        if salesman.get("pin_hash") != pin_hash:
            raise UnauthorizedException("Invalid phone number or PIN")
        
        # Check if salesman is active
        if not salesman.get("is_active", True):
            raise UnauthorizedException("Account is deactivated. Please contact admin.")
        
        # Get route info
        route_name = None
        if salesman.get("route_id"):
            route = await db.routes.find_one({"id": salesman["route_id"]}, {"_id": 0})
            if route:
                route_name = route.get("route_name")
        
        # Create token with salesman role
        token = create_access_token(
            salesman["id"],
            salesman["email"],
            "salesman"
        )
        
        profile = SalesmanProfileResponse(
            id=salesman["id"],
            name=salesman["name"],
            phone=salesman["phone"],
            email=salesman["email"],
            route_id=salesman["route_id"],
            route_name=route_name
        )
        
        return token, profile
    
    async def get_user_profile(self, user_id: str, email: str, role: str) -> UserResponse:
        """
        Get user profile from token payload
        """
        superadmin = _get_superadmin()
        
        if email == superadmin["email"]:
            return UserResponse(
                id=superadmin["id"],
                email=superadmin["email"],
                name=superadmin["name"],
                role=superadmin["role"]
            )
        
        # Check admin users from database
        db = database.get_db()
        admin = await db.admin_users.find_one({"id": user_id}, {"_id": 0})
        
        if admin:
            return UserResponse(
                id=admin["id"],
                email=admin["email"],
                name=admin["name"],
                role=admin["role"]
            )
        
        # Fallback for other users
        return UserResponse(
            id=user_id,
            email=email,
            name="User",
            role=role
        )
    
    async def get_salesman_profile(self, salesman_id: str) -> SalesmanProfileResponse:
        """
        Get salesman profile by ID
        """
        db = database.get_db()
        
        salesman = await db.salesmen.find_one({"id": salesman_id}, {"_id": 0})
        
        if not salesman:
            raise UnauthorizedException("Salesman not found")
        
        # Get route info
        route_name = None
        if salesman.get("route_id"):
            route = await db.routes.find_one({"id": salesman["route_id"]}, {"_id": 0})
            if route:
                route_name = route.get("route_name")
        
        return SalesmanProfileResponse(
            id=salesman["id"],
            name=salesman["name"],
            phone=salesman["phone"],
            email=salesman["email"],
            route_id=salesman["route_id"],
            route_name=route_name
        )
    
    async def change_password(self, email: str, new_password: str) -> str:
        """
        Change user password (no current password required)
        """
        superadmin = _get_superadmin()
        
        if email == superadmin["email"]:
            # Update the superadmin password hash
            _SUPERADMIN["password_hash"] = hash_password(new_password)
            return "Password changed successfully"
        
        raise BadRequestException("User not found")

# Service instance
auth_service = AuthService()
