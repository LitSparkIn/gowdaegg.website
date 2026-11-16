import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from core.database import get_database
from modules.icici_upi.client import (
    ICICICallbackDecryptionError,
    ICICIUPIConfigurationError,
    ICICIUPIRequestError,
)
from modules.icici_upi.service import (
    ICICIUPIPaymentNotFoundError,
    ICICIUPIPaymentService,
    ICICIUPIPaymentValidationError,
)


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payments/icici", tags=["ICICI UPI"])


@router.post("/callback")
async def icici_payment_callback(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Receive ICICI's encrypted final payment notification."""
    try:
        envelope = await request.json()
        if not isinstance(envelope, dict):
            raise ValueError("Callback body must be a JSON object")
        payment_service = ICICIUPIPaymentService(db)
        payment = await payment_service.process_callback(envelope)
    except (ValueError, ICICIUPIPaymentValidationError) as exc:
        logger.warning("Rejected invalid ICICI callback: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc))
    except ICICIUPIPaymentNotFoundError as exc:
        logger.warning("ICICI callback references an unknown payment")
        raise HTTPException(status_code=404, detail=str(exc))
    except ICICIUPIConfigurationError:
        logger.exception("ICICI callback configuration is invalid")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="UPI payment service is not configured",
        )
    except ICICICallbackDecryptionError as exc:
        logger.warning("Unable to decrypt ICICI callback: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc))
    except ICICIUPIRequestError as exc:
        logger.warning("Unable to verify ICICI callback status: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc))

    return {
        "success": True,
        "merchantTranId": payment["merchant_transaction_id"],
        "status": payment["status"],
    }
