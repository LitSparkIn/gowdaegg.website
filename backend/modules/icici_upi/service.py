import logging
import uuid
from decimal import Decimal, InvalidOperation

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

from core.config import settings
from core.timezone import get_ist_now
from modules.icici_upi.client import ICICIUPIClient, ICICIUPIRequestError


logger = logging.getLogger(__name__)


class ICICIUPIPaymentNotFoundError(LookupError):
    pass


class ICICIUPIPaymentValidationError(ValueError):
    pass


class ICICIUPIPaymentService:
    TERMINAL_STATUSES = {"SUCCESS", "FAILED", "QR_FAILED"}
    FAILURE_STATUSES = {"FAIL", "FAILED", "FAILURE", "REJECT", "REJECTED"}

    def __init__(self, db: AsyncIOMotorDatabase, client: ICICIUPIClient | None = None):
        self.db = db
        self.client = client or ICICIUPIClient()

    @staticmethod
    def _money(value) -> Decimal:
        try:
            return Decimal(str(value)).quantize(Decimal("0.01"))
        except (InvalidOperation, TypeError, ValueError) as exc:
            raise ICICIUPIPaymentValidationError(
                "ICICI returned an invalid payment amount"
            ) from exc

    @classmethod
    def normalize_status(cls, payload: dict) -> str:
        value = str(
            payload.get("TxnStatus")
            or payload.get("status")
            or payload.get("Status")
            or "PENDING"
        ).upper()
        if value == "SUCCESS":
            return "SUCCESS"
        if value in cls.FAILURE_STATUSES:
            return "FAILED"
        return "PENDING"

    @staticmethod
    def _public_payment(payment: dict) -> dict:
        return {
            "payment_id": payment["id"],
            "merchant_transaction_id": payment["merchant_transaction_id"],
            "bill_number": payment.get("bill_number"),
            "ref_id": payment.get("ref_id"),
            "amount": f"{Decimal(str(payment['amount'])):.2f}",
            "status": payment.get("status", "PENDING"),
            "upi_uri": payment.get("upi_uri"),
            "bank_rrn": payment.get("bank_rrn"),
            "collection_id": payment.get("collection_id"),
            "status_message": payment.get("status_message"),
            "valid_from": payment.get("valid_from"),
            "expires_at": payment.get("expires_at"),
            "created_at": payment.get("created_at"),
            "updated_at": payment.get("updated_at"),
        }

    async def create_qr_payment(
        self,
        shop: dict,
        amount: Decimal,
        bill_number: str | None,
        expiry_minutes: int,
    ) -> dict:
        now = get_ist_now()
        payment_id = str(uuid.uuid4())
        request_id = uuid.uuid4().hex
        merchant_transaction_id = uuid.uuid4().hex[:35]
        bill_number = bill_number or f"GE{uuid.uuid4().hex[:20].upper()}"
        payment = {
            "id": payment_id,
            "shop_id": shop["id"],
            "merchant_id": settings.ICICI_UPI_MERCHANT_ID,
            "terminal_id": settings.ICICI_UPI_TERMINAL_ID,
            "request_id": request_id,
            "merchant_transaction_id": merchant_transaction_id,
            "bill_number": bill_number,
            "amount": float(self._money(amount)),
            "status": "INITIATED",
            "source": "CUSTOMER_APP",
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }
        await self.db.upi_payments.insert_one(payment)

        try:
            result = await self.client.generate_qr(
                amount=amount,
                bill_number=bill_number,
                expiry_minutes=expiry_minutes,
                merchant_transaction_id=merchant_transaction_id,
                request_id=request_id,
            )
        except Exception as exc:
            await self.db.upi_payments.update_one(
                {"id": payment_id},
                {
                    "$set": {
                        "status": "QR_FAILED",
                        "status_message": str(exc),
                        "updated_at": get_ist_now().isoformat(),
                    }
                },
            )
            raise

        update = {
            "status": "PENDING",
            "ref_id": result["ref_id"],
            "upi_uri": result["upi_uri"],
            "valid_from": result["valid_from"],
            "expires_at": result["expires_at"],
            "updated_at": get_ist_now().isoformat(),
        }
        await self.db.upi_payments.update_one(
            {"id": payment_id}, {"$set": update}
        )
        payment.update(update)
        return self._public_payment(payment)

    async def get_customer_payment(
        self, payment_id: str, shop_id: str, refresh: bool = True
    ) -> dict:
        payment = await self.db.upi_payments.find_one(
            {"id": payment_id, "shop_id": shop_id}, {"_id": 0}
        )
        if not payment:
            raise ICICIUPIPaymentNotFoundError("UPI payment was not found")

        if payment.get("status") == "SUCCESS" and not payment.get("collection_id"):
            await self._ensure_collection(payment)
            payment = await self.db.upi_payments.find_one(
                {"id": payment_id}, {"_id": 0}
            )
        elif refresh and payment.get("status") not in self.TERMINAL_STATUSES:
            payment = await self.refresh_status(payment)
        return self._public_payment(payment)

    async def refresh_status(self, payment: dict) -> dict:
        payload = await self.client.get_transaction_status(
            payment["merchant_transaction_id"]
        )
        return await self._apply_bank_status(payment, payload, "STATUS_API")

    async def process_callback(self, envelope: dict) -> dict:
        payload = self.client.decrypt_callback(envelope)
        merchant_transaction_id = str(
            payload.get("merchantTranId") or payload.get("merchantTransactionId") or ""
        )
        if not merchant_transaction_id:
            raise ICICIUPIPaymentValidationError(
                "ICICI callback has no merchant transaction ID"
            )

        payment = await self.db.upi_payments.find_one(
            {"merchant_transaction_id": merchant_transaction_id}, {"_id": 0}
        )
        if not payment:
            raise ICICIUPIPaymentNotFoundError("UPI payment was not found")

        self._validate_bank_payload(payment, payload)
        if self.normalize_status(payload) == "SUCCESS":
            # Hybrid callback encryption provides confidentiality but does not
            # by itself authenticate the sender. Confirm every claimed success
            # with ICICI's status API before creating a collection.
            now = get_ist_now().isoformat()
            await self.db.upi_payments.update_one(
                {"id": payment["id"]},
                {
                    "$set": {
                        "callback_payload": payload,
                        "callback_claimed_status": "SUCCESS",
                        "callback_received_at": now,
                        "updated_at": now,
                    }
                },
            )
            return await self.refresh_status(payment)
        return await self._apply_bank_status(payment, payload, "CALLBACK")

    def _validate_bank_payload(self, payment: dict, payload: dict) -> None:
        merchant_id = str(payload.get("merchantId") or payload.get("merchantID") or "")
        terminal_id = str(payload.get("terminalId") or "")
        if merchant_id and merchant_id != settings.ICICI_UPI_MERCHANT_ID:
            raise ICICIUPIPaymentValidationError("ICICI merchant ID does not match")
        if terminal_id and terminal_id != settings.ICICI_UPI_TERMINAL_ID:
            raise ICICIUPIPaymentValidationError("ICICI terminal ID does not match")

        bank_amount = payload.get("PayerAmount")
        if bank_amount is None:
            bank_amount = payload.get("amount", payload.get("Amount"))
        if bank_amount is not None and self._money(bank_amount) != self._money(
            payment["amount"]
        ):
            raise ICICIUPIPaymentValidationError("ICICI payment amount does not match")

    async def _apply_bank_status(
        self, payment: dict, payload: dict, source: str
    ) -> dict:
        self._validate_bank_payload(payment, payload)

        status = self.normalize_status(payload)
        current_status = payment.get("status")
        # A confirmed success is irreversible. Likewise, do not move a final
        # failure back to pending if an older notification arrives later.
        if current_status == "SUCCESS":
            status = "SUCCESS"
        elif current_status == "FAILED" and status != "SUCCESS":
            status = "FAILED"
        now = get_ist_now().isoformat()
        update = {
            "status": status,
            "status_source": source,
            "status_message": payload.get("RespCodeDescription")
            or payload.get("respCodeDescription")
            or payload.get("message"),
            "bank_rrn": payload.get("BankRRN")
            or payload.get("OriginalBankRRN"),
            "bank_response_code": payload.get("ResponseCode")
            or payload.get("response"),
            "bank_payload": payload,
            "updated_at": now,
        }
        if source == "CALLBACK":
            update["callback_received_at"] = now
        else:
            update["last_status_checked_at"] = now

        await self.db.upi_payments.update_one(
            {"id": payment["id"]}, {"$set": update}
        )
        payment.update(update)
        if status == "SUCCESS":
            await self._ensure_collection(payment)
            payment = await self.db.upi_payments.find_one(
                {"id": payment["id"]}, {"_id": 0}
            )
        return payment

    async def _ensure_collection(self, payment: dict) -> None:
        if payment.get("collection_id"):
            if payment.get("bank_rrn"):
                await self.db.sales.update_one(
                    {"id": payment["collection_id"]},
                    {"$set": {"upi_bank_rrn": payment["bank_rrn"]}},
                )
            return

        shop = await self.db.shops.find_one({"id": payment["shop_id"]}, {"_id": 0})
        if not shop:
            raise ICICIUPIPaymentValidationError(
                "Customer shop no longer exists for this payment"
            )

        payment_id = payment["id"]
        collection_id = f"upi-{payment_id}"
        amount = float(self._money(payment["amount"]))
        previous_dues = float(shop.get("previous_dues", 0))
        current_dues = previous_dues - amount
        now = get_ist_now()
        salesman = await self.db.salesmen.find_one(
            {"route_id": shop.get("route_id"), "is_active": {"$ne": False}},
            {"_id": 0, "id": 1},
        )
        salesman_id = salesman["id"] if salesman else "customer_app"

        sale = {
            "id": collection_id,
            "salesman_id": salesman_id,
            "shop_id": shop["id"],
            "shop_name": shop.get("name", "Unknown"),
            "crates": 0,
            "price": 0.0,
            "order_amount": 0.0,
            "shop_previous_dues": previous_dues,
            "total_amount": previous_dues,
            "collected_amount": amount,
            "pending_amount": current_dues,
            "payment_type": "Online",
            "return_tray": 0,
            "previous_tray_balance": int(shop.get("tray_balance", 0)),
            "current_tray_balance": int(shop.get("tray_balance", 0)),
            "current_dues": current_dues,
            "transaction_type": "Collection",
            "image_url": None,
            "sale_date": now.strftime("%Y-%m-%d"),
            "sale_time": now.strftime("%H:%M:%S"),
            "created_at": now.isoformat(),
            "report_submitted": False,
            "sale_report_id": None,
            "source": "ICICI_UPI",
            "upi_payment_id": payment_id,
            "upi_merchant_transaction_id": payment["merchant_transaction_id"],
            "upi_bank_rrn": payment.get("bank_rrn"),
        }
        await self.db.sales.update_one(
            {"_id": collection_id}, {"$setOnInsert": sale}, upsert=True
        )

        before = await self.db.shops.find_one_and_update(
            {
                "id": shop["id"],
                "processed_upi_payment_ids": {"$ne": payment_id},
            },
            {
                "$inc": {"previous_dues": -amount},
                "$addToSet": {"processed_upi_payment_ids": payment_id},
                "$set": {"updated_at": now.isoformat()},
            },
            projection={"_id": 0, "previous_dues": 1},
            return_document=ReturnDocument.BEFORE,
        )
        if before is not None:
            exact_previous_dues = float(before.get("previous_dues", 0))
            exact_current_dues = exact_previous_dues - amount
            await self.db.sales.update_one(
                {"_id": collection_id},
                {
                    "$set": {
                        "shop_previous_dues": exact_previous_dues,
                        "total_amount": exact_previous_dues,
                        "pending_amount": exact_current_dues,
                        "current_dues": exact_current_dues,
                    }
                },
            )

        await self.db.upi_payments.update_one(
            {"id": payment_id},
            {
                "$set": {
                    "collection_id": collection_id,
                    "collection_created_at": now.isoformat(),
                    "updated_at": now.isoformat(),
                }
            },
        )

