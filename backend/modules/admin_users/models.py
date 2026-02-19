from pydantic import BaseModel
from typing import Optional

class AdminUserModel(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    password_hash: str
    role: str = "admin"
    is_active: bool = True
    created_at: str
    updated_at: Optional[str] = None
