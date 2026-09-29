import asyncio
import json
import logging
from typing import Optional

import httpx
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2 import service_account
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging"


def _format_currency(value: float) -> str:
    return f"{value:,.2f}"


class CustomerNotificationService:
    @staticmethod
    async def _get_access_token(service_account_json: str) -> tuple[str, str]:
        info = json.loads(service_account_json)
        credentials = service_account.Credentials.from_service_account_info(
            info, scopes=[FCM_SCOPE]
        )
        await asyncio.to_thread(credentials.refresh, GoogleAuthRequest())
        return credentials.token, info["project_id"]

    @classmethod
    async def _send_to_token(
        cls,
        access_token: str,
        project_id: str,
        fcm_token: str,
        title: str,
        body: str,
        data: dict,
    ) -> tuple[bool, bool]:
        url = f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"
        payload = {
            "message": {
                "token": fcm_token,
                "notification": {"title": title, "body": body},
                "data": {key: str(value) for key, value in data.items()},
                "android": {"priority": "high"},
                "apns": {"payload": {"aps": {"sound": "default"}}},
            }
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                json=payload,
                headers={"Authorization": f"Bearer {access_token}"},
            )

        if response.status_code == 200:
            return True, False

        response_text = response.text.lower()
        invalid_token = response.status_code in (400, 404) and any(
            marker in response_text
            for marker in ("unregistered", "invalid_argument", "registration-token-not-registered")
        )
        logger.warning("FCM send failed (%s): %s", response.status_code, response.text)
        return False, invalid_token

    @classmethod
    async def send_to_shop(
        cls,
        db: AsyncIOMotorDatabase,
        shop_id: str,
        title: str,
        body: str,
        data: dict,
    ) -> dict:
        settings = await db.settings.find_one(
            {"id": "global_settings"},
            {"_id": 0, "firebase_enabled": 1, "firebase_service_account_json": 1},
        )
        if not settings or not settings.get("firebase_enabled"):
            return {"success": False, "sent": 0, "failed": 0, "device_count": 0, "reason": "Firebase disabled"}

        service_account_json = settings.get("firebase_service_account_json")
        if not service_account_json:
            return {"success": False, "sent": 0, "failed": 0, "device_count": 0, "reason": "Firebase not configured"}

        sessions = await db.customer_sessions.find(
            {
                "shop_id": shop_id,
                "revoked_at": None,
                "fcm_token": {"$nin": [None, ""]},
            },
            {"_id": 0, "id": 1, "fcm_token": 1},
        ).to_list(1000)

        if not sessions:
            return {"success": True, "sent": 0, "failed": 0, "device_count": 0}

        try:
            access_token, project_id = await cls._get_access_token(service_account_json)
        except Exception as exc:
            logger.exception("Unable to authenticate with Firebase: %s", exc)
            return {"success": False, "sent": 0, "failed": len(sessions), "device_count": len(sessions)}

        sent = 0
        failed = 0
        for session in sessions:
            try:
                success, invalid_token = await cls._send_to_token(
                    access_token, project_id, session["fcm_token"], title, body, data
                )
                if success:
                    sent += 1
                else:
                    failed += 1
                if invalid_token:
                    await db.customer_sessions.update_one(
                        {"id": session["id"]}, {"$set": {"fcm_token": None}}
                    )
            except Exception as exc:
                failed += 1
                logger.exception("FCM send error: %s", exc)

        return {
            "success": failed == 0,
            "sent": sent,
            "failed": failed,
            "device_count": len(sessions),
        }

    @classmethod
    async def send_transaction_push(cls, db: AsyncIOMotorDatabase, sale: dict) -> dict:
        is_collection = sale.get("transaction_type") == "Collection" or sale.get("crates", 0) == 0
        if is_collection:
            title = "Payment Received"
            body = (
                f"Payment of Rs. {_format_currency(sale.get('collected_amount', 0))} received. "
                f"Balance: Rs. {_format_currency(sale.get('pending_amount', 0))}"
            )
            notification_type = "payment"
            screen = "payments"
        else:
            title = "New Transaction"
            body = (
                f"Order of Rs. {_format_currency(sale.get('order_amount', 0))} recorded. "
                f"Balance: Rs. {_format_currency(sale.get('pending_amount', 0))}"
            )
            notification_type = "transaction"
            screen = "transactions"

        return await cls.send_to_shop(
            db,
            sale["shop_id"],
            title,
            body,
            {
                "type": notification_type,
                "sale_id": sale["id"],
                "shop_id": sale["shop_id"],
                "screen": screen,
            },
        )
