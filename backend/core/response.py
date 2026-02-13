from pydantic import BaseModel
from typing import Any, Optional

class APIResponse(BaseModel):
    """Standardized API response format"""
    code: int = 200
    message: str = "Success"
    data: Any = None

def success_response(data: Any = None, message: str = "Success", code: int = 200) -> dict:
    """Create a success response"""
    return {
        "code": code,
        "message": message,
        "data": data
    }

def error_response(message: str = "Error", code: int = 400, data: Any = None) -> dict:
    """Create an error response"""
    return {
        "code": code,
        "message": message,
        "data": data
    }
