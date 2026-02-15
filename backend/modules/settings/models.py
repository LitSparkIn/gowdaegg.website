from pydantic import BaseModel, Field
from typing import Optional
from core.timezone import get_ist_now

class SettingsModel(BaseModel):
    """Database model for Settings document"""
    id: str = "global_settings"  # Single settings document
    whatsapp_enabled: bool = False
    sms_enabled: bool = False
    whatsapp_api_token: Optional[str] = None
    whatsapp_phone_number_id: str = "109780805521902"
    whatsapp_template_id: str = "gowda_egg_sale_receipt"
    msg91_auth_key: Optional[str] = None
    msg91_template_id: Optional[str] = None
    updated_at: str = Field(default_factory=lambda: get_ist_now().isoformat())
    
    class Config:
        populate_by_name = True
