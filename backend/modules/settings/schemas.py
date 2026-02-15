from pydantic import BaseModel
from typing import Optional

class SettingsUpdateRequest(BaseModel):
    """Schema for updating settings"""
    whatsapp_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    whatsapp_api_token: Optional[str] = None
    whatsapp_phone_number_id: Optional[str] = None
    whatsapp_template_id: Optional[str] = None
    msg91_auth_key: Optional[str] = None
    msg91_template_id: Optional[str] = None

class SettingsResponse(BaseModel):
    """Schema for settings response"""
    id: str
    whatsapp_enabled: bool
    sms_enabled: bool
    whatsapp_phone_number_id: str
    whatsapp_template_id: str
    # Don't expose tokens in response for security
    whatsapp_api_token_set: bool
    msg91_auth_key_set: bool
    msg91_template_id: Optional[str]
    updated_at: str
