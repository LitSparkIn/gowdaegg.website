from datetime import datetime, timezone
from typing import Optional
import uuid
from motor.motor_asyncio import AsyncIOMotorDatabase

from modules.purchase.repository import PurchaseRepository
from modules.purchase.models import PurchaseModel
from modules.purchase.schemas import PurchaseCreateRequest, PurchaseUpdateRequest, PurchaseResponse
from core.exceptions import NotFoundException, BadRequestException
from core.timezone import get_ist_now

class PurchaseService:
    """Service layer for Purchase business logic."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.repository = PurchaseRepository(db)
    
    async def create_purchase(self, request: PurchaseCreateRequest) -> PurchaseResponse:
        """Create a new purchase and update supplier's dues"""
        # Verify supplier exists and get current data
        supplier = await self.db.suppliers.find_one({"id": request.supplier_id}, {"_id": 0})
        if not supplier:
            raise BadRequestException(f"Supplier with id '{request.supplier_id}' does not exist")
        
        supplier_name = supplier.get("name", "Unknown")
        previous_dues = supplier.get("previous_dues", 0.0)
        
        # Calculate totals
        # Total = Crates * 30 eggs * Price per egg
        total = request.crates * 30 * request.price
        grand_total = total + previous_dues
        pending_amount = grand_total - request.amount_paid
        
        now = get_ist_now()
        purchase_date = now.strftime("%Y-%m-%d")
        purchase_time = now.strftime("%H:%M:%S")
        
        purchase = PurchaseModel(
            id=str(uuid.uuid4()),
            supplier_id=request.supplier_id,
            supplier_name=supplier_name,
            crates=request.crates,
            price=request.price,
            total=total,
            previous_dues=previous_dues,
            grand_total=grand_total,
            amount_paid=request.amount_paid,
            pending_amount=pending_amount,
            payment_mode=request.payment_mode,
            purchase_date=purchase_date,
            purchase_time=purchase_time,
            created_at=now.isoformat()
        )
        
        # Save the purchase
        await self.repository.create(purchase)
        
        # Update supplier's previous_dues to the pending amount
        await self.db.suppliers.update_one(
            {"id": request.supplier_id},
            {
                "$set": {
                    "previous_dues": pending_amount,
                    "updated_at": now.isoformat()
                }
            }
        )
        
        return PurchaseResponse(**purchase.model_dump())
    
    async def get_all_purchases(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        supplier_id: Optional[str] = None
    ) -> dict:
        """Get all purchases with filters"""
        purchases = await self.repository.get_all(
            from_date=from_date,
            to_date=to_date,
            supplier_id=supplier_id
        )
        count = await self.repository.get_count(
            from_date=from_date,
            to_date=to_date,
            supplier_id=supplier_id
        )
        totals = await self.repository.get_totals(
            from_date=from_date,
            to_date=to_date,
            supplier_id=supplier_id
        )
        
        return {
            "purchases": [PurchaseResponse(**p).model_dump() for p in purchases],
            "total_records": count,
            "total_amount": totals.get("total_amount", 0),
            "total_paid": totals.get("total_paid", 0),
            "total_pending": totals.get("total_pending", 0)
        }
    
    async def get_purchase_by_id(self, purchase_id: str) -> PurchaseResponse:
        """Get a purchase by ID"""
        purchase = await self.repository.get_by_id(purchase_id)
        if not purchase:
            raise NotFoundException(f"Purchase with id '{purchase_id}' not found")
        return PurchaseResponse(**purchase)
    
    async def delete_purchase(self, purchase_id: str) -> bool:
        """Delete a purchase"""
        purchase = await self.repository.get_by_id(purchase_id)
        if not purchase:
            raise NotFoundException(f"Purchase with id '{purchase_id}' not found")
        return await self.repository.delete(purchase_id)

    async def update_purchase(self, purchase_id: str, request: PurchaseUpdateRequest) -> PurchaseResponse:
        """Update a purchase and recalculate supplier's dues"""
        # Get existing purchase
        purchase = await self.repository.get_by_id(purchase_id)
        if not purchase:
            raise NotFoundException(f"Purchase with id '{purchase_id}' not found")
        
        # Get supplier
        supplier = await self.db.suppliers.find_one({"id": purchase["supplier_id"]}, {"_id": 0})
        if not supplier:
            raise BadRequestException("Supplier not found")
        
        # Get the old pending amount to adjust supplier's dues
        old_pending = purchase.get("pending_amount", 0)
        
        # Recalculate totals with new values
        total = request.crates * 30 * request.price
        # Use the original previous_dues from the purchase record
        previous_dues = purchase.get("previous_dues", 0)
        grand_total = total + previous_dues
        pending_amount = grand_total - request.amount_paid
        
        now = get_ist_now()
        
        # Update purchase record
        update_data = {
            "crates": request.crates,
            "price": request.price,
            "total": total,
            "grand_total": grand_total,
            "amount_paid": request.amount_paid,
            "pending_amount": pending_amount,
            "payment_mode": request.payment_mode,
            "updated_at": now.isoformat()
        }
        
        await self.db.purchases.update_one(
            {"id": purchase_id},
            {"$set": update_data}
        )
        
        # Update supplier's previous_dues: adjust by the difference
        current_supplier_dues = supplier.get("previous_dues", 0)
        new_supplier_dues = current_supplier_dues - old_pending + pending_amount
        
        await self.db.suppliers.update_one(
            {"id": purchase["supplier_id"]},
            {
                "$set": {
                    "previous_dues": new_supplier_dues,
                    "updated_at": now.isoformat()
                }
            }
        )
        
        # Return updated purchase
        updated_purchase = await self.repository.get_by_id(purchase_id)
        return PurchaseResponse(**updated_purchase)
