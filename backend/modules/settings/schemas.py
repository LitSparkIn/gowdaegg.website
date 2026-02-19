from pydantic import BaseModel
from typing import Optional

class SettingsUpdateRequest(BaseModel):
    """Schema for updating settings"""
    whatsapp_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    whatsapp_api_token: Optional[str] = None
    whatsapp_phone_number_id: Optional[str] = None
    whatsapp_template_id: Optional[str] = None
    whatsapp_header_image_url: Optional[str] = None
    msg91_auth_key: Optional[str] = None
    msg91_template_id: Optional[str] = None
    todays_egg_rate: Optional[float] = None

class SettingsResponse(BaseModel):
    """Schema for settings response"""
    id: str
    whatsapp_enabled: bool
    sms_enabled: bool
    whatsapp_phone_number_id: str
    whatsapp_template_id: str
    whatsapp_header_image_url: str = "https://litspark.solutions/litspark-logo.png"
    # Don't expose tokens in response for security
    whatsapp_api_token_set: bool
    msg91_auth_key_set: bool
    msg91_template_id: Optional[str]
    todays_egg_rate: Optional[float] = 0.0
    updated_at: str
