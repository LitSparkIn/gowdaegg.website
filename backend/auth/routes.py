from fastapi import APIRouter, Depends, Form
from auth.schemas import (
    LoginRequest, 
    LoginResponse, 
    ChangePasswordRequest, 
    MessageResponse, 
    UserResponse,
    SalesmanLoginRequest,
    SalesmanLoginResponse,
    SalesmanProfileResponse
)
from auth.service import auth_service
from auth.security import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

# ============ Admin Auth Routes ============

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Authenticate admin user and return access token"""
    token, user = await auth_service.authenticate(request.email, request.password)
    return LoginResponse(token=token, user=user)

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current authenticated admin user profile"""
    return await auth_service.get_user_profile(
        user_id=current_user["sub"],
        email=current_user["email"],
        role=current_user["role"]
    )

@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    request: ChangePasswordRequest, 
    current_user: dict = Depends(get_current_user)
):
    """Change current user's password"""
    message = await auth_service.change_password(
        email=current_user["email"],
        current_password=request.current_password,
        new_password=request.new_password
    )
    return MessageResponse(message=message)

# ============ Salesman Auth Routes ============

@router.post("/salesman/login", response_model=SalesmanLoginResponse)
async def salesman_login(
    phone: str = Form(..., description="Salesman phone number"),
    pin: str = Form(..., description="4-digit PIN")
):
    """
    Authenticate salesman using phone and PIN (form data).
    Returns JWT token and salesman profile.
    """
    token, salesman = await auth_service.authenticate_salesman(phone, pin)
    return SalesmanLoginResponse(token=token, salesman=salesman)

@router.get("/salesman/me", response_model=SalesmanProfileResponse)
async def get_salesman_me(current_user: dict = Depends(get_current_user)):
    """Get current authenticated salesman profile"""
    if current_user.get("role") != "salesman":
        # If admin is accessing, return error
        from core.exceptions import UnauthorizedException
        raise UnauthorizedException("This endpoint is for salesmen only")
    
    return await auth_service.get_salesman_profile(current_user["sub"])
