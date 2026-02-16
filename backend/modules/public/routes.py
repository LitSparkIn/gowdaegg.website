from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from core.database import get_database
from core.response import success_response

router = APIRouter(prefix="/public", tags=["Public API"])

@router.get("/transactions")
async def get_transactions_by_phone(
    phone: str = Query(..., description="Phone number to fetch transactions for"),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Public API to get last 3 transactions for each shop associated with a phone number.
    No authentication required.
    
    Returns transactions grouped by shop if the phone is registered.
    Returns error message if phone is not found.
    """
    # Clean phone number (remove spaces, dashes, country code)
    cleaned_phone = phone.strip().replace(" ", "").replace("-", "")
    if cleaned_phone.startswith("+91"):
        cleaned_phone = cleaned_phone[3:]
    elif cleaned_phone.startswith("91") and len(cleaned_phone) > 10:
        cleaned_phone = cleaned_phone[2:]
    
    # Find all shops with this phone number
    shops = await db.shops.find(
        {"phone": cleaned_phone},
        {"_id": 0, "id": 1, "name": 1, "phone": 1, "address": 1}
    ).to_list(100)
    
    if not shops:
        return success_response(
            data={
                "registered": False,
                "message": "Unable to fetch your recent transactions right now. If you are not sending the message from your registered number, please send the message from registered number. Or else please try later.",
                "shops": []
            },
            message="Phone number not registered"
        )
    
    # Get last 3 transactions for each shop
    result_shops = []
    
    for shop in shops:
        shop_id = shop["id"]
        
        # Fetch last 3 transactions for this shop
        transactions_cursor = db.sales.find(
            {"shop_id": shop_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(3)
        
        transactions = []
        async for txn in transactions_cursor:
            # Format transaction for response
            transactions.append({
                "id": txn.get("id"),
                "date": txn.get("sale_date"),
                "time": txn.get("sale_time"),
                "crates": txn.get("crates", 0),
                "price": txn.get("price", 0),
                "order_amount": txn.get("order_amount", 0),
                "previous_dues": txn.get("shop_previous_dues", 0),
                "total_amount": txn.get("total_amount", 0),
                "collected_amount": txn.get("collected_amount", 0),
                "pending_amount": txn.get("pending_amount", 0),
                "payment_type": txn.get("payment_type", ""),
                "return_tray": txn.get("return_tray", 0),
                "tray_balance": txn.get("current_tray_balance", 0),
                "transaction_type": txn.get("transaction_type", "Sale" if txn.get("crates", 0) > 0 else "Collection")
            })
        
        result_shops.append({
            "shop_name": shop["name"],
            "shop_address": shop.get("address", ""),
            "transactions": transactions,
            "transaction_count": len(transactions)
        })
    
    return success_response(
        data={
            "registered": True,
            "message": "Transactions fetched successfully",
            "shops": result_shops,
            "total_shops": len(result_shops)
        },
        message="Transactions fetched successfully"
    )
