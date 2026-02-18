from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
import json
import logging

from core.database import get_database
from core.response import success_response
from core.uploads import save_upload_file
from core.exceptions import BadRequestException
from auth.security import get_current_user
from modules.sales.service import SaleService
from modules.sales.schemas import SaleCreateRequest, SaleUpdateRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/salesman/sales", tags=["Sales"])

def verify_salesman(current_user: dict = Depends(get_current_user)) -> dict:
    """Verify that the current user is a salesman"""
    if current_user.get("role") != "salesman":
        raise HTTPException(status_code=403, detail="Access denied. Salesman only.")
    return current_user

def get_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> SaleService:
    return SaleService(db)

@router.post("")
async def create_sale(
    shop_id: str = Form(...),
    crates: int = Form(...),
    price: float = Form(...),
    order_amount: float = Form(...),
    shop_previous_dues: float = Form(...),
    total_amount: float = Form(...),
    collected_amount: float = Form(...),
    pending_amount: float = Form(...),
    payment_type: str = Form(...),
    return_tray: int = Form(0),
    image: Optional[UploadFile] = File(default=None),
    service: SaleService = Depends(get_service),
    current_user: dict = Depends(verify_salesman)
):
    """
    Create a new sale with optional image upload.
    Salesman is identified by JWT token.
    Image is optional - can be omitted entirely from the request.
    """
    try:
        salesman_id = current_user["sub"]
        
        # Save image if provided and has a valid filename
        image_url = None
        if image is not None and image.filename and image.filename.strip():
            try:
                image_url = await save_upload_file(image, "sale")
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))
        
        # Create request object
        request = SaleCreateRequest(
            shop_id=shop_id,
            crates=crates,
            price=price,
            order_amount=order_amount,
            shop_previous_dues=shop_previous_dues,
            total_amount=total_amount,
            collected_amount=collected_amount,
            pending_amount=pending_amount,
            payment_type=payment_type,
            return_tray=return_tray
        )
        
        sale = await service.create_sale(salesman_id, request, image_url)
        
        return success_response(
            data=sale.model_dump(),
            message="Sale created successfully"
        )
    except BadRequestException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating sale: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error creating sale: {str(e)}")

@router.get("")
async def get_sales_today(
    service: SaleService = Depends(get_service),
    current_user: dict = Depends(verify_salesman)
):
    """
    Get all sales for today for the current salesman.
    """
    salesman_id = current_user["sub"]
    
    result = await service.get_salesman_sales_today(salesman_id)
    
    return success_response(
        data=result,
        message="Sales fetched successfully"
    )

@router.get("/report")
async def get_sale_report(
    date: Optional[str] = Query(None, description="Report date (YYYY-MM-DD). Defaults to today."),
    service: SaleService = Depends(get_service),
    current_user: dict = Depends(verify_salesman)
):
    """
    Get sale report for the current salesman.
    Returns: Total Initial Load, Total Sold, Remaining Crates, Return Trays,
             Total Cash, Cheque, Online, Bill for the specified date.
    """
    salesman_id = current_user["sub"]
    
    result = await service.get_sale_report(salesman_id, date)
    
    return success_response(
        data=result,
        message="Sale report generated successfully"
    )


# ============ Admin Routes ============

admin_router = APIRouter(prefix="/sales", tags=["Sales - Admin"])

def verify_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Verify that the current user is an admin"""
    if current_user.get("role") not in ["superadmin", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Admin only.")
    return current_user

@admin_router.get("")
async def get_all_sales_admin(
    from_date: Optional[str] = Query(None, description="Filter from date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="Filter to date (YYYY-MM-DD)"),
    salesman_id: Optional[str] = Query(None, description="Filter by salesman ID"),
    shop_id: Optional[str] = Query(None, description="Filter by shop ID"),
    transaction_type: Optional[str] = Query(None, description="Filter by transaction type (Sale/Collection)"),
    payment_type: Optional[str] = Query(None, description="Filter by payment type (Cash/Cheque/Online/Bill)"),
    route_id: Optional[str] = Query(None, description="Filter by route ID"),
    has_image: Optional[str] = Query(None, description="Filter by image (with/without)"),
    service: SaleService = Depends(get_service),
    current_user: dict = Depends(verify_admin)
):
    """
    Get all sales for admin panel with filters.
    """
    result = await service.get_all_sales_admin(
        from_date=from_date,
        to_date=to_date,
        salesman_id=salesman_id,
        shop_id=shop_id,
        transaction_type=transaction_type,
        payment_type=payment_type,
        route_id=route_id,
        has_image=has_image
    )
    
    return success_response(
        data=result,
        message="Sales fetched successfully"
    )

@admin_router.post("/{sale_id}/send-whatsapp")
async def send_whatsapp_for_sale(
    sale_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_admin)
):
    """
    Send/Resend WhatsApp message for a specific sale transaction.
    """
    from core.whatsapp import send_transaction_whatsapp
    from datetime import datetime
    
    # Get the sale
    sale = await db.sales.find_one({"id": sale_id}, {"_id": 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    # Get the shop details
    shop = await db.shops.find_one({"id": sale["shop_id"]}, {"_id": 0})
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    
    shop_phone = shop.get("phone", "")
    if not shop_phone:
        raise HTTPException(status_code=400, detail="Shop does not have a phone number")
    
    # Format transaction datetime
    sale_date = sale.get("sale_date", "")
    sale_time = sale.get("sale_time", "")
    if sale_date and sale_time:
        try:
            dt = datetime.strptime(f"{sale_date} {sale_time}", "%Y-%m-%d %H:%M:%S")
            transaction_datetime = dt.strftime("%d-%m-%Y %I:%M %p")
        except:
            transaction_datetime = f"{sale_date} {sale_time}"
    else:
        transaction_datetime = datetime.now().strftime("%d-%m-%Y %I:%M %p")
    
    # Send WhatsApp message
    result = await send_transaction_whatsapp(
        phone=shop_phone,
        crates=sale.get("crates", 0),
        price=sale.get("price", 0),
        order_amount=sale.get("order_amount", 0),
        previous_dues=sale.get("shop_previous_dues", 0),
        total_amount=sale.get("total_amount", 0),
        amount_collected=sale.get("collected_amount", 0),
        pending_amount=sale.get("pending_amount", 0),
        payment_mode=sale.get("payment_type", ""),
        tray_balance=sale.get("current_tray_balance", 0),
        transaction_datetime=transaction_datetime
    )
    
    if result.get("success"):
        return success_response(
            data={"phone": shop_phone, "whatsapp_response": result.get("response")},
            message=f"WhatsApp message sent successfully to {shop_phone}"
        )
    else:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to send WhatsApp: {result.get('error') or result.get('response')}"
        )
