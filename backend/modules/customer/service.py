import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta

import httpx
from motor.motor_asyncio import AsyncIOMotorDatabase

from auth.security import create_access_token
from core.config import settings as app_settings
from core.exceptions import BadRequestException, UnauthorizedException

OTP_EXPIRY_SECONDS = 300
OTP_COOLDOWN_SECONDS = 60
OTP_MAX_ATTEMPTS = 5
REFRESH_EXPIRY_SECONDS = 365 * 24 * 60 * 60
TEST_CUSTOMER_PHONE = "9901080987"
TEST_CUSTOMER_OTP = "0000"


def normalize_phone(phone: str) -> tuple[str, str]:
    cleaned = "".join(character for character in phone if character.isdigit())
    if cleaned.startswith("91") and len(cleaned) == 12:
        cleaned = cleaned[2:]
    if len(cleaned) != 10:
        raise BadRequestException("Phone number must be a valid 10-digit Indian number")
    return cleaned, f"91{cleaned}"


def _hmac_hash(value: str) -> str:
    return hmac.new(
        app_settings.JWT_SECRET.encode(), value.encode(), hashlib.sha256
    ).hexdigest()


class CustomerService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db

    async def _get_active_shop(self, phone: str) -> dict:
        shop = await self.db.shops.find_one(
            {"phone": phone, "is_active": {"$ne": False}}, {"_id": 0}
        )
        if not shop:
            raise BadRequestException("No active customer account found for this phone number")
        return shop

    async def _send_whatsapp_otp(self, phone: str, otp: str, settings: dict):
        token = settings.get("whatsapp_api_token")
        phone_number_id = settings.get("whatsapp_phone_number_id")
        template = settings.get("customer_login_otp_template")
        if not token or not phone_number_id or not template:
            raise BadRequestException("Customer WhatsApp OTP is not configured")

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": phone,
            "type": "template",
            "template": {
                "name": template,
                "language": {"code": "en_US"},
                "components": [
                    {
                        "type": "body",
                        "parameters": [
                            {"type": "text", "text": otp},
                            {"type": "text", "text": "Gowda Egg"},
                        ],
                    },
                    {
                        "type": "button",
                        "sub_type": "url",
                        "index": "0",
                        "parameters": [{"type": "text", "text": otp}],
                    },
                ],
            },
        }
        url = f"https://graph.facebook.com/v24.0/{phone_number_id}/messages"
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                json=payload,
                headers={"Authorization": f"Bearer {token}"},
            )
        if response.status_code != 200:
            raise BadRequestException("Unable to send WhatsApp OTP")

    async def _send_sms_otp(self, phone: str, otp: str, settings: dict):
        auth_key = settings.get("msg91_auth_key")
        flow_id = settings.get("customer_login_otp_flow_id")
        if not auth_key or not flow_id:
            raise BadRequestException("Customer SMS OTP is not configured")

        payload = {
            "template_id": flow_id,
            "recipients": [{"mobiles": phone, "otp": otp}],
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://control.msg91.com/api/v5/flow/",
                json=payload,
                headers={"authkey": auth_key, "Content-Type": "application/json"},
            )
        if response.status_code != 200:
            raise BadRequestException("Unable to send SMS OTP")

    async def send_otp(self, phone: str, mode: str) -> dict:
        normalized_phone, provider_phone = normalize_phone(phone)
        await self._get_active_shop(normalized_phone)

        now = datetime.utcnow()
        existing = await self.db.customer_otps.find_one({"phone": normalized_phone})
        if existing and existing.get("sent_at"):
            elapsed = (now - existing["sent_at"]).total_seconds()
            if elapsed < OTP_COOLDOWN_SECONDS:
                raise BadRequestException(
                    f"Please wait {int(OTP_COOLDOWN_SECONDS - elapsed)} seconds before requesting another OTP"
                )

        normalized_mode = "sms" if mode == "text" else mode
        if normalized_phone == TEST_CUSTOMER_PHONE:
            otp = TEST_CUSTOMER_OTP
        else:
            otp = f"{secrets.randbelow(10000):04d}"
            settings = await self.db.settings.find_one({"id": "global_settings"}, {"_id": 0}) or {}
            if normalized_mode == "whatsapp":
                await self._send_whatsapp_otp(provider_phone, otp, settings)
            else:
                await self._send_sms_otp(provider_phone, otp, settings)

        await self.db.customer_otps.update_one(
            {"phone": normalized_phone},
            {
                "$set": {
                    "phone": normalized_phone,
                    "otp_hash": _hmac_hash(f"{normalized_phone}:{otp}"),
                    "attempts": 0,
                    "sent_at": now,
                    "expires_at": now + timedelta(seconds=OTP_EXPIRY_SECONDS),
                }
            },
            upsert=True,
        )
        return {
            "phone": provider_phone,
            "mode": normalized_mode,
            "expires_in_seconds": OTP_EXPIRY_SECONDS,
        }

    async def _customer_payload(self, shop: dict) -> dict:
        route = await self.db.routes.find_one(
            {"id": shop.get("route_id")}, {"_id": 0, "route_name": 1, "upi_qr_url": 1}
        )
        return {
            "id": shop["id"],
            "name": shop.get("name", ""),
            "phone": shop.get("phone", ""),
            "address": shop.get("address", ""),
            "route_id": shop.get("route_id"),
            "route_name": route.get("route_name") if route else None,
            "upi_qr_url": route.get("upi_qr_url") if route else None,
            "previous_dues": shop.get("previous_dues", 0),
            "tray_balance": shop.get("tray_balance", 0),
        }

    async def _create_session(self, shop: dict, fcm_token: str | None) -> dict:
        now = datetime.utcnow()
        refresh_token = secrets.token_urlsafe(48)
        if fcm_token:
            await self.db.customer_sessions.update_many(
                {"fcm_token": fcm_token, "revoked_at": None},
                {"$set": {"revoked_at": now}},
            )

        session = {
            "id": str(uuid.uuid4()),
            "shop_id": shop["id"],
            "phone": shop["phone"],
            "fcm_token": fcm_token,
            "refresh_token_hash": _hmac_hash(refresh_token),
            "created_at": now,
            "last_used_at": now,
            "expires_at": now + timedelta(seconds=REFRESH_EXPIRY_SECONDS),
            "revoked_at": None,
        }
        await self.db.customer_sessions.insert_one(session)
        return await self._auth_response(shop, refresh_token)

    async def _auth_response(self, shop: dict, refresh_token: str) -> dict:
        access_token = create_access_token(shop["id"], shop["phone"], "customer")
        return {
            "token": access_token,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "access_expires_in_seconds": app_settings.JWT_EXPIRATION_HOURS * 3600,
            "refresh_expires_in_seconds": REFRESH_EXPIRY_SECONDS,
            "customer": await self._customer_payload(shop),
        }

    async def login(self, phone: str, otp: str, fcm_token: str | None) -> dict:
        normalized_phone, _ = normalize_phone(phone)
        shop = await self._get_active_shop(normalized_phone)
        otp_record = await self.db.customer_otps.find_one({"phone": normalized_phone})
        now = datetime.utcnow()
        if not otp_record or otp_record.get("expires_at", now) <= now:
            raise UnauthorizedException("OTP has expired or is invalid")
        if otp_record.get("attempts", 0) >= OTP_MAX_ATTEMPTS:
            raise UnauthorizedException("Maximum OTP attempts exceeded")

        expected_hash = _hmac_hash(f"{normalized_phone}:{otp}")
        if not hmac.compare_digest(otp_record.get("otp_hash", ""), expected_hash):
            await self.db.customer_otps.update_one(
                {"phone": normalized_phone}, {"$inc": {"attempts": 1}}
            )
            raise UnauthorizedException("Invalid OTP")

        await self.db.customer_otps.delete_one({"phone": normalized_phone})
        return await self._create_session(shop, fcm_token)

    async def refresh(self, refresh_token: str, fcm_token: str | None) -> dict:
        now = datetime.utcnow()
        session = await self.db.customer_sessions.find_one(
            {
                "refresh_token_hash": _hmac_hash(refresh_token),
                "revoked_at": None,
                "expires_at": {"$gt": now},
            },
            {"_id": 0},
        )
        if not session:
            raise UnauthorizedException("Invalid or expired refresh token")

        shop = await self.db.shops.find_one(
            {"id": session["shop_id"], "is_active": {"$ne": False}}, {"_id": 0}
        )
        if not shop:
            raise UnauthorizedException("Customer account is inactive")

        new_refresh_token = secrets.token_urlsafe(48)
        update = {
            "refresh_token_hash": _hmac_hash(new_refresh_token),
            "last_used_at": now,
            "expires_at": now + timedelta(seconds=REFRESH_EXPIRY_SECONDS),
        }
        if fcm_token:
            await self.db.customer_sessions.update_many(
                {"fcm_token": fcm_token, "id": {"$ne": session["id"]}, "revoked_at": None},
                {"$set": {"revoked_at": now}},
            )
            update["fcm_token"] = fcm_token

        await self.db.customer_sessions.update_one({"id": session["id"]}, {"$set": update})
        return await self._auth_response(shop, new_refresh_token)

    async def logout(self, refresh_token: str):
        await self.db.customer_sessions.update_one(
            {"refresh_token_hash": _hmac_hash(refresh_token), "revoked_at": None},
            {"$set": {"revoked_at": datetime.utcnow()}},
        )

    async def get_shop_for_customer(self, customer_id: str) -> dict:
        shop = await self.db.shops.find_one(
            {"id": customer_id, "is_active": {"$ne": False}}, {"_id": 0}
        )
        if not shop:
            raise UnauthorizedException("Customer account is inactive")
        return shop

    async def get_transactions(self, shop_id: str, collection: bool, limit: int = 20) -> list[dict]:
        legacy_crates = 0 if collection else {"$gt": 0}
        transaction_type = "Collection" if collection else "Sale"
        query = {
            "shop_id": shop_id,
            "$or": [
                {"transaction_type": transaction_type},
                {"transaction_type": {"$exists": False}, "crates": legacy_crates},
            ],
        }
        return await self.db.sales.find(query, {"_id": 0}).sort(
            [("sale_date", -1), ("sale_time", -1)]
        ).limit(limit).to_list(limit)

    async def get_all_transactions(self, shop_id: str, page: int = 1, limit: int = 15) -> dict:
        """Return a page of sales and collections together, newest first."""
        query = {"shop_id": shop_id}
        total_records = await self.db.sales.count_documents(query)
        skip = (page - 1) * limit
        records = await self.db.sales.find(
            query, {"_id": 0}
        ).sort(
            [("sale_date", -1), ("sale_time", -1)]
        ).skip(skip).limit(limit).to_list(limit)

        # Older records predate transaction_type; classify them consistently.
        for record in records:
            if not record.get("transaction_type"):
                record["transaction_type"] = "Sale" if record.get("crates", 0) > 0 else "Collection"
        return {
            "transactions": records,
            "count": len(records),
            "total_records": total_records,
            "page": page,
            "limit": limit,
            "total_pages": (total_records + limit - 1) // limit if total_records else 0,
        }
