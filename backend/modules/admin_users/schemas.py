from pydantic import BaseModel, EmailStr
from typing import Optional

class AdminCreateRequest(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str
    confirm_password: str

class AdminUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

class AdminChangePasswordRequest(BaseModel):
    new_password: str
    confirm_password: str

class AdminResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    role: str
    is_active: bool
    created_at: str
    updated_at: Optional[str] = None

class AdminListResponse(BaseModel):
    admins: list[AdminResponse]
    total: int
