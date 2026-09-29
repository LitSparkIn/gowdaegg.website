from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


class SendOTPRequest(BaseModel):
    phone: str
    mode: Literal["whatsapp", "sms", "text"] = "whatsapp"


class CustomerLoginRequest(BaseModel):
    phone: str
    otp: str = Field(..., min_length=4, max_length=4)
    fcm_token: Optional[str] = None

    @field_validator("fcm_token")
    @classmethod
    def validate_fcm_token(cls, value):
        if value and len(value) < 20:
            raise ValueError("FCM token must contain at least 20 characters")
        return value or None


class RefreshRequest(BaseModel):
    refresh_token: str = Field(..., min_length=20)
    fcm_token: Optional[str] = None

    @field_validator("fcm_token")
    @classmethod
    def validate_fcm_token(cls, value):
        if value and len(value) < 20:
            raise ValueError("FCM token must contain at least 20 characters")
        return value or None


class LogoutRequest(BaseModel):
    refresh_token: str = Field(..., min_length=20)
