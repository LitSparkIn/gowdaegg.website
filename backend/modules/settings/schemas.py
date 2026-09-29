from pydantic import BaseModel
from typing import Optional

class SettingsUpdateRequest(BaseModel):
    """Schema for updating settings"""
    whatsapp_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    whatsapp_api_token: Optional[str] = None
    whatsapp_phone_number_id: Optional[str] = None
    whatsapp_template_id: Optional[str] = None
    customer_login_otp_template: Optional[str] = None
    whatsapp_header_image_url: Optional[str] = None
    msg91_auth_key: Optional[str] = None
    msg91_template_id: Optional[str] = None
    customer_login_otp_flow_id: Optional[str] = None
    firebase_enabled: Optional[bool] = None
    firebase_service_account_json: Optional[str] = None
    todays_egg_rate: Optional[float] = None
    allow_multiple_reports: Optional[bool] = None

class SettingsResponse(BaseModel):
    """Schema for settings response"""
    id: str
    whatsapp_enabled: bool
    sms_enabled: bool
    whatsapp_phone_number_id: str
    whatsapp_template_id: str
    customer_login_otp_template: Optional[str] = None
    whatsapp_header_image_url: str = "https://litspark.solutions/litspark-logo.png"
    # Don't expose tokens in response for security
    whatsapp_api_token_set: bool
    msg91_auth_key_set: bool
    msg91_template_id: Optional[str]
    customer_login_otp_flow_id: Optional[str] = None
    firebase_enabled: bool = False
    firebase_service_account_json_set: bool = False
    todays_egg_rate: Optional[float] = 0.0
    allow_multiple_reports: bool = False
    updated_at: str
