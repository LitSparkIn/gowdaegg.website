from decimal import Decimal
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


class GenerateUPIQRRequest(BaseModel):
    amount: Decimal = Field(..., gt=0, decimal_places=2, max_digits=12)
    bill_number: Optional[str] = Field(None, min_length=1, max_length=50)
    expiry_minutes: int = Field(default=15, ge=1, le=60)
