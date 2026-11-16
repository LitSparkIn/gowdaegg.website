from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from auth.security import get_current_user
from core.database import get_database
from core.response import success_response
from modules.customer.schemas import (
    CustomerLoginRequest,
    GenerateUPIQRRequest,
    LogoutRequest,
    RefreshRequest,
    SendOTPRequest,
)
from modules.customer.service import CustomerService
from modules.icici_upi.client import (
    ICICIUPIClient,
    ICICIUPIConfigurationError,
    ICICIUPIRequestError,
)
from core.config import settings

router = APIRouter(prefix="/customer", tags=["Customer App"])


def get_customer_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> CustomerService:
    return CustomerService(db)


def verify_customer(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "customer":
        raise HTTPException(status_code=403, detail="Access denied. Customer only.")
    return current_user


@router.post("/send-otp")
async def send_otp(request: SendOTPRequest, service: CustomerService = Depends(get_customer_service)):
    data = await service.send_otp(request.phone, request.mode)
    return success_response(data=data, message="OTP sent successfully")


@router.post("/login")
async def login(request: CustomerLoginRequest, service: CustomerService = Depends(get_customer_service)):
    data = await service.login(request.phone, request.otp, request.fcm_token)
    return success_response(data=data, message="Login successful")


@router.post("/refresh")
async def refresh(request: RefreshRequest, service: CustomerService = Depends(get_customer_service)):
    data = await service.refresh(request.refresh_token, request.fcm_token)
    return success_response(data=data, message="Session refreshed successfully")


@router.post("/logout")
async def logout(request: LogoutRequest, service: CustomerService = Depends(get_customer_service)):
    await service.logout(request.refresh_token)
    return success_response(message="Logged out successfully")


@router.get("/get-home")
async def get_home(
    service: CustomerService = Depends(get_customer_service),
    current_user: dict = Depends(verify_customer),
):
    shop = await service.get_shop_for_customer(current_user["sub"])
    customer = await service._customer_payload(shop)
    transactions = await service.get_transactions(shop["id"], collection=False, limit=5)
    return success_response(
        data={
            "balance": shop.get("previous_dues", 0),
            "tray_balance": shop.get("tray_balance", 0),
            "shop": customer,
            "last_transactions": transactions,
        },
        message="Customer home fetched successfully",
    )


@router.get("/transactions")
async def get_transactions(
    service: CustomerService = Depends(get_customer_service),
    current_user: dict = Depends(verify_customer),
):
    shop = await service.get_shop_for_customer(current_user["sub"])
    transactions = await service.get_transactions(shop["id"], collection=False)
    return success_response(
        data={"transactions": transactions, "count": len(transactions)},
        message="Transactions fetched successfully",
    )


@router.get("/payments")
async def get_payments(
    service: CustomerService = Depends(get_customer_service),
    current_user: dict = Depends(verify_customer),
):
    shop = await service.get_shop_for_customer(current_user["sub"])
    payments = await service.get_transactions(shop["id"], collection=True)
    return success_response(
        data={"payments": payments, "count": len(payments)},
        message="Payments fetched successfully",
    )


@router.get("/all-transactions")
async def get_all_transactions(
    page: int = Query(1, ge=1, description="Page number"),
    service: CustomerService = Depends(get_customer_service),
    current_user: dict = Depends(verify_customer),
):
    """Return the customer's sales and collections, 15 records per page."""
    shop = await service.get_shop_for_customer(current_user["sub"])
    result = await service.get_all_transactions(shop["id"], page=page, limit=15)
    return success_response(
        data=result,
        message="Transactions and collections fetched successfully",
    )


@router.post("/payments/upi/qr")
async def generate_upi_qr(
    request: GenerateUPIQRRequest,
    service: CustomerService = Depends(get_customer_service),
    current_user: dict = Depends(verify_customer),
):
    """Generate a stateless ICICI UAT QR for the authenticated customer."""
    if not settings.ICICI_UPI_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="UPI payments are not enabled",
        )

    # Confirm the token still belongs to an active shop before calling the bank.
    await service.get_shop_for_customer(current_user["sub"])

    try:
        client = ICICIUPIClient()
        result = await client.generate_qr(
            amount=request.amount,
            bill_number=request.bill_number,
            expiry_minutes=request.expiry_minutes,
        )
    except ICICIUPIConfigurationError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="UPI payment service is not configured",
        )
    except ICICIUPIRequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        )

    return success_response(data=result, message="UPI QR generated successfully")
