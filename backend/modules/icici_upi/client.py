import logging
import uuid
from datetime import timedelta
from decimal import Decimal
from typing import Optional
from urllib.parse import urlencode

import httpx

from core.config import settings
from core.timezone import get_ist_now
from modules.icici_upi.crypto import ICICICryptoError, ICICIHybridCrypto

logger = logging.getLogger(__name__)


class ICICIUPIConfigurationError(RuntimeError):
    pass


class ICICIUPIRequestError(RuntimeError):
    pass


class ICICICallbackDecryptionError(ICICIUPIRequestError):
    pass


class ICICIUPIClient:
    def __init__(self, http_transport: Optional[httpx.AsyncBaseTransport] = None):
        self.http_transport = http_transport

        required_settings = {
            "ICICI_UPI_API_KEY": settings.ICICI_UPI_API_KEY,
            "ICICI_UPI_STATUS_URL": settings.ICICI_UPI_STATUS_URL,
            "ICICI_UPI_BANK_CERT_PATH": settings.ICICI_UPI_BANK_CERT_PATH,
            "ICICI_UPI_PRIVATE_KEY_PATH": settings.ICICI_UPI_PRIVATE_KEY_PATH,
        }
        missing = [name for name, value in required_settings.items() if not value]
        if missing:
            raise ICICIUPIConfigurationError(
                f"Missing ICICI UPI configuration: {', '.join(missing)}"
            )

        try:
            self.crypto = ICICIHybridCrypto(
                bank_certificate_path=settings.ICICI_UPI_BANK_CERT_PATH,
                merchant_private_key_path=settings.ICICI_UPI_PRIVATE_KEY_PATH,
                merchant_private_key_password=(
                    settings.ICICI_UPI_PRIVATE_KEY_PASSWORD or None
                ),
                merchant_certificate_path=(
                    settings.ICICI_UPI_MERCHANT_CERT_PATH or None
                ),
            )
        except (OSError, ICICICryptoError) as exc:
            raise ICICIUPIConfigurationError(
                "ICICI UPI certificate or private-key configuration is invalid"
            ) from exc

    @staticmethod
    def _money(amount: Decimal) -> str:
        return f"{amount.quantize(Decimal('0.01')):.2f}"

    async def generate_qr(
        self,
        amount: Decimal,
        bill_number: Optional[str] = None,
        expiry_minutes: int = 15,
        merchant_transaction_id: Optional[str] = None,
        request_id: Optional[str] = None,
    ) -> dict:
        now = get_ist_now()
        validity_start = now + timedelta(seconds=10)
        validity_end = validity_start + timedelta(minutes=expiry_minutes)
        merchant_transaction_id = merchant_transaction_id or uuid.uuid4().hex[:35]
        bill_number = bill_number or f"GE{uuid.uuid4().hex[:20].upper()}"
        request_id = request_id or uuid.uuid4().hex
        amount_text = self._money(amount)

        payload = {
            "amount": amount_text,
            "merchantId": settings.ICICI_UPI_MERCHANT_ID,
            "terminalId": settings.ICICI_UPI_TERMINAL_ID,
            "merchantTranId": merchant_transaction_id,
            "billNumber": bill_number,
            "validatePayerAccFlag": "N",
            "payerAccount": "",
            "payerIFSC": "",
            "refId": "",
            "validityStartDateTime": validity_start.strftime("%d/%m/%Y %H:%M:%S"),
            "validityEndDateTime": validity_end.strftime("%d/%m/%Y %H:%M:%S"),
            "update": "N",
        }
        envelope = self.crypto.encrypt_request(payload, request_id=request_id)

        headers = {
            "apikey": settings.ICICI_UPI_API_KEY,
            "Accept": "*/*",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(
                timeout=settings.ICICI_UPI_TIMEOUT_SECONDS,
                transport=self.http_transport,
            ) as client:
                response = await client.post(
                    settings.ICICI_UPI_QR_URL,
                    json=envelope,
                    headers=headers,
                )
        except httpx.RequestError as exc:
            logger.exception("ICICI QR request failed before receiving a response")
            raise ICICIUPIRequestError("ICICI UPI service could not be reached") from exc

        if response.status_code >= 400:
            logger.error(
                "ICICI QR request failed: request_id=%s status=%s",
                request_id,
                response.status_code,
            )
            raise ICICIUPIRequestError(
                f"ICICI UPI service returned HTTP {response.status_code}"
            )

        try:
            response_envelope = response.json()
            decrypted = self.crypto.decrypt_response(response_envelope)
        except (ValueError, ICICICryptoError) as exc:
            logger.exception(
                "Unable to decode ICICI QR response: request_id=%s", request_id
            )
            raise ICICIUPIRequestError("ICICI returned an unreadable response") from exc

        ref_id = decrypted.get("refId") or decrypted.get("refid")
        success = str(decrypted.get("success", "")).lower() == "true"
        if not success or not ref_id:
            message = decrypted.get("message") or "ICICI rejected the QR request"
            logger.warning(
                "ICICI QR request rejected: request_id=%s response=%s message=%s",
                request_id,
                decrypted.get("response"),
                message,
            )
            raise ICICIUPIRequestError(str(message))

        query = urlencode(
            {
                "pa": settings.ICICI_UPI_VPA,
                "pn": settings.ICICI_UPI_MERCHANT_NAME,
                "tr": ref_id,
                "am": amount_text,
                "cu": "INR",
                "mc": settings.ICICI_UPI_TERMINAL_ID,
            },
            safe="@",
        )
        return {
            "request_id": request_id,
            "merchant_transaction_id": merchant_transaction_id,
            "bill_number": bill_number,
            "ref_id": ref_id,
            "amount": amount_text,
            "upi_uri": f"upi://pay?{query}",
            "valid_from": validity_start.isoformat(),
            "expires_at": validity_end.isoformat(),
        }

    async def get_transaction_status(self, merchant_transaction_id: str) -> dict:
        request_id = uuid.uuid4().hex
        payload = {
            "merchantId": settings.ICICI_UPI_MERCHANT_ID,
            "subMerchantId": settings.ICICI_UPI_MERCHANT_ID,
            "terminalId": settings.ICICI_UPI_TERMINAL_ID,
            "merchantTranId": merchant_transaction_id,
        }
        envelope = self.crypto.encrypt_request(payload, request_id=request_id)
        headers = {
            "apikey": settings.ICICI_UPI_API_KEY,
            "Accept": "*/*",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(
                timeout=settings.ICICI_UPI_TIMEOUT_SECONDS,
                transport=self.http_transport,
            ) as client:
                response = await client.post(
                    settings.ICICI_UPI_STATUS_URL,
                    json=envelope,
                    headers=headers,
                )
        except httpx.RequestError as exc:
            logger.exception(
                "ICICI status request failed before receiving a response"
            )
            raise ICICIUPIRequestError(
                "ICICI UPI status service could not be reached"
            ) from exc

        if response.status_code >= 400:
            logger.error(
                "ICICI status request failed: request_id=%s status=%s",
                request_id,
                response.status_code,
            )
            raise ICICIUPIRequestError(
                f"ICICI UPI status service returned HTTP {response.status_code}"
            )

        try:
            return self.crypto.decrypt_response(response.json())
        except (ValueError, ICICICryptoError) as exc:
            logger.exception(
                "Unable to decode ICICI status response: request_id=%s", request_id
            )
            raise ICICIUPIRequestError(
                "ICICI returned an unreadable status response"
            ) from exc

    def decrypt_callback(self, envelope: dict) -> dict:
        try:
            return self.crypto.decrypt_response(envelope)
        except ICICICryptoError as exc:
            raise ICICICallbackDecryptionError(
                "ICICI callback could not be decrypted"
            ) from exc
