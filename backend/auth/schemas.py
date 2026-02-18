from pydantic import BaseModel, EmailStr

# ============ Admin Auth Schemas ============

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ChangePasswordRequest(BaseModel):
    new_password: str

# ============ Salesman Auth Schemas ============

class SalesmanLoginRequest(BaseModel):
    phone: str
    pin: str

class SalesmanProfileResponse(BaseModel):
    id: str
    name: str
    phone: str
    email: str
    route_id: str
    route_name: str | None = None

class SalesmanLoginResponse(BaseModel):
    token: str
    salesman: SalesmanProfileResponse

# ============ Common Response Schemas ============

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str

class LoginResponse(BaseModel):
    token: str
    user: UserResponse

class MessageResponse(BaseModel):
    message: str
