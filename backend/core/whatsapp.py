import httpx
import logging
from datetime import datetime
from core.database import database

logger = logging.getLogger(__name__)

# Default WhatsApp Business API Configuration
DEFAULT_WHATSAPP_TOKEN = "EAAOHfZAef0okBO7qZAeZCwEKK1HeGbtHoZBRCBZA5zzapsfVIsiCcKhWOHm96i08VLH1uI38OycyJxlVhyt6vyZBt6ZA6nqsCTnWzAorkyu5n0SBD69oOsHDyQYr6PrkJsiEuEROrgCxcvj7gnqb49iJOwse8xQ1ISsoWFAyZCEkrm0syNNPWvKfl8FS5JUlht4j"
DEFAULT_PHONE_NUMBER_ID = "937349779458170"
DEFAULT_TEMPLATE_NAME = "gowda_egg_wa_template"
DEFAULT_HEADER_IMAGE_URL = "https://litspark.solutions/litspark-logo.png"


async def get_whatsapp_settings():
    """Fetch WhatsApp settings from database"""
    db = database.get_db()
    settings = await db.settings.find_one({}, {"_id": 0})
    if settings:
        return {
            "token": settings.get("whatsapp_api_token") or DEFAULT_WHATSAPP_TOKEN,
            "phone_number_id": settings.get("whatsapp_phone_number_id") or DEFAULT_PHONE_NUMBER_ID,
            "template_name": settings.get("whatsapp_template_id") or DEFAULT_TEMPLATE_NAME,
            "header_image_url": settings.get("whatsapp_header_image_url") or DEFAULT_HEADER_IMAGE_URL
        }
    return {
        "token": DEFAULT_WHATSAPP_TOKEN,
        "phone_number_id": DEFAULT_PHONE_NUMBER_ID,
        "template_name": DEFAULT_TEMPLATE_NAME,
        "header_image_url": DEFAULT_HEADER_IMAGE_URL
    }


async def send_transaction_whatsapp(
    phone: str,
    crates: int,
    price: float,
    order_amount: float,
    previous_dues: float,
    total_amount: float,
    amount_collected: float,
    pending_amount: float,
    payment_mode: str,
    tray_balance: int,
    transaction_datetime: str = None
) -> dict:
    """
    Send WhatsApp message to shop after successful transaction.
    
    Args:
        phone: Shop phone number (with country code, e.g., 919876543210)
        crates: Number of crates sold
        price: Price per egg
        order_amount: Order amount
        previous_dues: Previous outstanding dues
        total_amount: Total amount (order + previous dues)
        amount_collected: Amount collected
        pending_amount: Pending amount
        payment_mode: Payment mode (Cash, UPI, etc.)
        tray_balance: Current tray balance
        transaction_datetime: Transaction date and time
    
    Returns:
        API response dict
    """
    
    # Get settings from database
    wa_settings = await get_whatsapp_settings()
    whatsapp_token = wa_settings["token"]
    phone_number_id = wa_settings["phone_number_id"]
    template_name = wa_settings["template_name"]
    header_image_url = wa_settings["header_image_url"]
    
    api_url = f"https://graph.facebook.com/v17.0/{phone_number_id}/messages"
    
    # Format phone number - ensure it has country code
    phone_formatted = phone.strip()
    if not phone_formatted.startswith("91"):
        phone_formatted = f"91{phone_formatted}"
    
    # Use current datetime if not provided
    if not transaction_datetime:
        transaction_datetime = datetime.now().strftime("%d-%m-%Y %I:%M %p")
    
    # Build the payload
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": phone_formatted,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {
                "code": "en"
            },
            "components": [
                {
                    "type": "header",
                    "parameters": [
                        {
                            "type": "image",
                            "image": {
                                "link": header_image_url
                            }
                        }
                    ]
                },
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": str(transaction_datetime)},
                        {"type": "text", "text": str(crates)},
                        {"type": "text", "text": str(price)},
                        {"type": "text", "text": str(order_amount)},
                        {"type": "text", "text": str(previous_dues)},
                        {"type": "text", "text": str(total_amount)},
                        {"type": "text", "text": str(amount_collected)},
                        {"type": "text", "text": str(pending_amount)},
                        {"type": "text", "text": str(payment_mode)},
                        {"type": "text", "text": str(tray_balance)}
                    ]
                }
            ]
        }
    }
    
    headers = {
        "Authorization": f"Bearer {whatsapp_token}",
        "Content-Type": "application/json"
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                api_url,
                json=payload,
                headers=headers
            )
            
            result = response.json()
            
            if response.status_code == 200:
                logger.info(f"WhatsApp message sent successfully to {phone_formatted}")
            else:
                logger.error(f"WhatsApp API error: {response.status_code} - {result}")
            
            return {
                "success": response.status_code == 200,
                "status_code": response.status_code,
                "response": result
            }
            
    except Exception as e:
        logger.error(f"Failed to send WhatsApp message to {phone_formatted}: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }
