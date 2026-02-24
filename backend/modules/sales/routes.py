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
    page: int = Query(1, ge=1, description="Page number (starting from 1)"),
    limit: int = Query(500, ge=1, le=1000, description="Number of records per page"),
    service: SaleService = Depends(get_service),
    current_user: dict = Depends(verify_admin)
):
    """
    Get all sales for admin panel with filters and pagination.
    """
    result = await service.get_all_sales_admin(
        from_date=from_date,
        to_date=to_date,
        salesman_id=salesman_id,
        shop_id=shop_id,
        transaction_type=transaction_type,
        payment_type=payment_type,
        route_id=route_id,
        has_image=has_image,
        page=page,
        limit=limit
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
        except ValueError:
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

@admin_router.put("/{sale_id}")
async def update_sale(
    sale_id: str,
    crates: int = Form(...),
    price: float = Form(...),
    collected_amount: float = Form(...),
    payment_type: str = Form(...),
    return_tray: int = Form(0),
    image: Optional[UploadFile] = File(default=None),
    service: SaleService = Depends(get_service),
    current_user: dict = Depends(verify_admin)
):
    """
    Update a sale transaction.
    Only crates, price, collected_amount, payment_type, return_tray and image can be updated.
    Order amount, total, and pending are auto-calculated.
    This also cascades updates to all subsequent transactions for the same shop.
    """
    try:
        # Save image if provided
        image_url = None
        if image is not None and image.filename and image.filename.strip():
            try:
                image_url = await save_upload_file(image, "sale")
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))
        
        request = SaleUpdateRequest(
            crates=crates,
            price=price,
            collected_amount=collected_amount,
            payment_type=payment_type,
            return_tray=return_tray
        )
        
        result = await service.update_sale_with_cascade(sale_id, request, image_url)
        
        return success_response(
            data=result,
            message="Sale updated successfully with cascading updates"
        )
    except Exception as e:
        logger.error(f"Error updating sale: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error updating sale: {str(e)}")


@admin_router.get("/{sale_id}/cascade-preview")
async def get_cascade_preview(
    sale_id: str,
    crates: int = Query(...),
    price: float = Query(...),
    collected_amount: float = Query(...),
    return_tray: int = Query(0),
    service: SaleService = Depends(get_service),
    current_user: dict = Depends(verify_admin)
):
    """
    Get a preview of how editing this transaction would affect subsequent transactions for the same shop.
    Returns the list of transactions that would be affected and their new values.
    """
    try:
        preview = await service.get_cascade_preview(
            sale_id=sale_id,
            new_crates=crates,
            new_price=price,
            new_collected=collected_amount,
            new_return_tray=return_tray
        )
        
        return success_response(
            data=preview,
            message="Cascade preview generated"
        )
    except Exception as e:
        logger.error(f"Error generating cascade preview: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating preview: {str(e)}")


def verify_superadmin(current_user: dict = Depends(get_current_user)) -> dict:
    """Verify that the current user is a superadmin"""
    if current_user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Access denied. Superadmin only.")
    return current_user


@admin_router.post("/shop/{shop_id}/recalculate-dues")
async def recalculate_shop_dues(
    shop_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_superadmin)
):
    """
    Recalculate all transaction dues for a shop from the beginning.
    This fixes any inconsistencies caused by network issues or concurrent transactions.
    Only accessible by superadmin.
    """
    try:
        # Get the shop
        shop = await db.shops.find_one({"id": shop_id}, {"_id": 0})
        if not shop:
            raise HTTPException(status_code=404, detail="Shop not found")
        
        # Get all transactions for this shop, sorted by date and time ascending
        transactions = await db.sales.find(
            {"shop_id": shop_id},
            {"_id": 0}
        ).sort([("sale_date", 1), ("sale_time", 1), ("created_at", 1)]).to_list(100000)
        
        if not transactions:
            return success_response(
                data={"shop_id": shop_id, "updated_count": 0},
                message="No transactions found for this shop"
            )
        
        # Get the shop's initial previous_dues (before any transactions)
        # We'll use the first transaction's shop_previous_dues as the starting point
        # OR we need to calculate backwards from current state
        
        # Strategy: Recalculate from the first transaction
        # The first transaction's shop_previous_dues should be the "original" dues
        initial_dues = transactions[0].get("shop_previous_dues", 0)
        initial_tray_balance = transactions[0].get("previous_tray_balance", 0)
        
        running_dues = initial_dues
        running_tray = initial_tray_balance
        updated_count = 0
        
        for txn in transactions:
            txn_id = txn["id"]
            crates = txn.get("crates", 0)
            price = txn.get("price", 0)
            collected = txn.get("collected_amount", 0)
            return_tray = txn.get("return_tray", 0)
            
            # Calculate order amount
            order_amount = crates * price * 30  # 30 eggs per crate
            
            # Calculate total and pending
            total_amount = running_dues + order_amount
            pending_amount = total_amount - collected
            
            # Calculate tray balance
            new_tray = running_tray + crates - return_tray
            
            # Determine transaction type
            transaction_type = "Collection" if crates == 0 else "Sale"
            
            # Update the transaction
            update_result = await db.sales.update_one(
                {"id": txn_id},
                {"$set": {
                    "shop_previous_dues": running_dues,
                    "order_amount": order_amount,
                    "total_amount": total_amount,
                    "pending_amount": pending_amount,
                    "current_dues": pending_amount,
                    "previous_tray_balance": running_tray,
                    "current_tray_balance": new_tray,
                    "transaction_type": transaction_type
                }}
            )
            
            if update_result.modified_count > 0:
                updated_count += 1
            
            # Update running values for next transaction
            running_dues = pending_amount
            running_tray = new_tray
        
        # Update the shop's current dues and tray balance
        await db.shops.update_one(
            {"id": shop_id},
            {"$set": {
                "previous_dues": running_dues,
                "tray_balance": running_tray
            }}
        )
        
        return success_response(
            data={
                "shop_id": shop_id,
                "shop_name": shop.get("name"),
                "total_transactions": len(transactions),
                "updated_count": updated_count,
                "final_dues": running_dues,
                "final_tray_balance": running_tray
            },
            message=f"Successfully recalculated {updated_count} transactions for {shop.get('name')}"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recalculating shop dues: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error recalculating dues: {str(e)}")
