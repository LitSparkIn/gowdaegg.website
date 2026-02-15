import httpx
import logging
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class NotificationService:
    """Service for sending WhatsApp and SMS notifications"""
    
    @staticmethod
    async def send_whatsapp(
        phone: str,
        crates: int,
        price: float,
        order_amount: float,
        previous_dues: float,
        total_amount: float,
        collected_amount: float,
        pending_amount: float,
        payment_type: str,
        tray_balance: int,
        sale_datetime: str,
        template_id: str,
        route_slug: str,
        api_token: str,
        phone_number_id: str = "109780805521902"
    ) -> dict:
        """
        Send WhatsApp message using Facebook Graph API.
        """
        try:
            # Format phone number (ensure it has country code)
            if not phone.startswith("91"):
                phone = f"91{phone}"
            
            # Format datetime
            try:
                dt = datetime.fromisoformat(sale_datetime.replace('Z', '+00:00'))
                formatted_datetime = dt.strftime("%d %b %Y %I:%M %p")
            except:
                formatted_datetime = sale_datetime
            
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": phone,
                "type": "template",
                "template": {
                    "name": template_id,
                    "language": {"code": "en"},
                    "components": [
                        {
                            "type": "body",
                            "parameters": [
                                {"type": "text", "text": formatted_datetime},
                                {"type": "text", "text": str(crates)},
                                {"type": "text", "text": str(price)},
                                {"type": "text", "text": str(order_amount)},
                                {"type": "text", "text": str(previous_dues)},
                                {"type": "text", "text": str(total_amount)},
                                {"type": "text", "text": str(collected_amount)},
                                {"type": "text", "text": str(pending_amount)},
                                {"type": "text", "text": payment_type},
                                {"type": "text", "text": str(tray_balance)}
                            ]
                        },
                        {
                            "type": "button",
                            "sub_type": "url",
                            "index": "0",
                            "parameters": [
                                {"type": "text", "text": route_slug}
                            ]
                        }
                    ]
                }
            }
            
            url = f"https://graph.facebook.com/v17.0/{phone_number_id}/messages"
            headers = {
                "Authorization": f"Bearer {api_token}",
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=headers, timeout=30.0)
                result = response.json()
                
                if response.status_code == 200:
                    logger.info(f"WhatsApp sent successfully to {phone}")
                    return {"success": True, "response": result}
                else:
                    logger.error(f"WhatsApp failed: {result}")
                    return {"success": False, "error": result}
                    
        except Exception as e:
            logger.error(f"WhatsApp error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    @staticmethod
    async def send_sms(
        phone: str,
        order_date: str,
        crates: int,
        price: float,
        order_amount: float,
        previous_dues: float,
        total_amount: float,
        collected_amount: float,
        pending_amount: float,
        payment_type: str,
        tray_balance: int,
        auth_key: str,
        template_id: str
    ) -> dict:
        """
        Send SMS using MSG91 API.
        """
        try:
            # Format phone number with country code
            if not phone.startswith("91"):
                phone = f"91{phone}"
            
            payload = {
                "template_id": template_id,
                "recipients": [
                    {
                        "mobiles": phone,
                        "order_date": order_date,
                        "trays": str(crates),
                        "price_per_egg": str(price),
                        "total": str(order_amount),
                        "previous_dues": str(previous_dues),
                        "grand_total": str(total_amount),
                        "amount_paid": str(collected_amount),
                        "balance": str(pending_amount),
                        "payment_mode": payment_type,
                        "tray_balance": str(tray_balance)
                    }
                ]
            }
            
            url = "https://control.msg91.com/api/v5/flow/"
            headers = {
                "authkey": auth_key,
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=headers, timeout=30.0)
                result = response.json()
                
                if response.status_code == 200:
                    logger.info(f"SMS sent successfully to {phone}")
                    return {"success": True, "response": result}
                else:
                    logger.error(f"SMS failed: {result}")
                    return {"success": False, "error": result}
                    
        except Exception as e:
            logger.error(f"SMS error: {str(e)}")
            return {"success": False, "error": str(e)}
