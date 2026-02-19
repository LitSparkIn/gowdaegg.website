from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from core.database import get_database
from core.response import success_response
from core.timezone import get_ist_now
from auth.security import get_current_user
from modules.settings.schemas import SettingsUpdateRequest, SettingsResponse

router = APIRouter(prefix="/settings", tags=["Settings"])

def verify_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Verify that the current user is an admin"""
    if current_user.get("role") not in ["superadmin", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Admin only.")
    return current_user

@router.get("")
async def get_settings(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_admin)
):
    """
    Get current settings.
    """
    settings = await db.settings.find_one({"id": "global_settings"}, {"_id": 0})
    
    if not settings:
        # Create default settings if not exists
        default_settings = {
            "id": "global_settings",
            "whatsapp_enabled": False,
            "sms_enabled": False,
            "whatsapp_api_token": None,
            "whatsapp_phone_number_id": "937349779458170",
            "whatsapp_template_id": "gowda_egg_wa_template",
            "whatsapp_header_image_url": "https://litspark.solutions/litspark-logo.png",
            "msg91_auth_key": None,
            "msg91_template_id": None,
            "todays_egg_rate": 0.0,
            "allow_multiple_reports": False,
            "updated_at": get_ist_now().isoformat()
        }
        await db.settings.insert_one(default_settings)
        settings = default_settings
    
    # Prepare response without exposing tokens
    response = SettingsResponse(
        id=settings["id"],
        whatsapp_enabled=settings.get("whatsapp_enabled", False),
        sms_enabled=settings.get("sms_enabled", False),
        whatsapp_phone_number_id=settings.get("whatsapp_phone_number_id", "937349779458170"),
        whatsapp_template_id=settings.get("whatsapp_template_id", "gowda_egg_wa_template"),
        whatsapp_header_image_url=settings.get("whatsapp_header_image_url", "https://litspark.solutions/litspark-logo.png"),
        whatsapp_api_token_set=bool(settings.get("whatsapp_api_token")),
        msg91_auth_key_set=bool(settings.get("msg91_auth_key")),
        msg91_template_id=settings.get("msg91_template_id"),
        todays_egg_rate=settings.get("todays_egg_rate", 0.0),
        allow_multiple_reports=settings.get("allow_multiple_reports", False),
        updated_at=settings.get("updated_at", "")
    )
    
    return success_response(
        data=response.model_dump(),
        message="Settings fetched successfully"
    )

@router.put("")
async def update_settings(
    request: SettingsUpdateRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_admin)
):
    """
    Update settings.
    """
    # Get current settings
    settings = await db.settings.find_one({"id": "global_settings"}, {"_id": 0})
    
    if not settings:
        # Create default settings if not exists
        settings = {
            "id": "global_settings",
            "whatsapp_enabled": False,
            "sms_enabled": False,
            "whatsapp_api_token": None,
            "whatsapp_phone_number_id": "937349779458170",
            "whatsapp_template_id": "gowda_egg_wa_template",
            "whatsapp_header_image_url": "https://litspark.solutions/litspark-logo.png",
            "msg91_auth_key": None,
            "msg91_template_id": None,
            "todays_egg_rate": 0.0,
            "allow_multiple_reports": False,
            "updated_at": get_ist_now().isoformat()
        }
        await db.settings.insert_one(settings)
    
    # Build update dict with only provided fields
    update_data = {}
    if request.whatsapp_enabled is not None:
        update_data["whatsapp_enabled"] = request.whatsapp_enabled
    if request.sms_enabled is not None:
        update_data["sms_enabled"] = request.sms_enabled
    if request.whatsapp_api_token is not None:
        update_data["whatsapp_api_token"] = request.whatsapp_api_token
    if request.whatsapp_phone_number_id is not None:
        update_data["whatsapp_phone_number_id"] = request.whatsapp_phone_number_id
    if request.whatsapp_template_id is not None:
        update_data["whatsapp_template_id"] = request.whatsapp_template_id
    if request.whatsapp_header_image_url is not None:
        update_data["whatsapp_header_image_url"] = request.whatsapp_header_image_url
    if request.msg91_auth_key is not None:
        update_data["msg91_auth_key"] = request.msg91_auth_key
    if request.msg91_template_id is not None:
        update_data["msg91_template_id"] = request.msg91_template_id
    if request.todays_egg_rate is not None:
        update_data["todays_egg_rate"] = request.todays_egg_rate
    if request.allow_multiple_reports is not None:
        update_data["allow_multiple_reports"] = request.allow_multiple_reports
    
    if update_data:
        update_data["updated_at"] = get_ist_now().isoformat()
        await db.settings.update_one(
            {"id": "global_settings"},
            {"$set": update_data}
        )
    
    # Fetch updated settings
    updated_settings = await db.settings.find_one({"id": "global_settings"}, {"_id": 0})
    
    response = SettingsResponse(
        id=updated_settings["id"],
        whatsapp_enabled=updated_settings.get("whatsapp_enabled", False),
        sms_enabled=updated_settings.get("sms_enabled", False),
        whatsapp_phone_number_id=updated_settings.get("whatsapp_phone_number_id", "937349779458170"),
        whatsapp_template_id=updated_settings.get("whatsapp_template_id", "gowda_egg_wa_template"),
        whatsapp_header_image_url=updated_settings.get("whatsapp_header_image_url", "https://litspark.solutions/litspark-logo.png"),
        whatsapp_api_token_set=bool(updated_settings.get("whatsapp_api_token")),
        msg91_auth_key_set=bool(updated_settings.get("msg91_auth_key")),
        msg91_template_id=updated_settings.get("msg91_template_id"),
        todays_egg_rate=updated_settings.get("todays_egg_rate", 0.0),
        allow_multiple_reports=updated_settings.get("allow_multiple_reports", False),
        updated_at=updated_settings.get("updated_at", "")
    )
    
    return success_response(
        data=response.model_dump(),
        message="Settings updated successfully"
    )
