from datetime import datetime, timezone
from typing import Optional
import uuid
import asyncio
import logging
from motor.motor_asyncio import AsyncIOMotorDatabase

from modules.sales.repository import SaleRepository
from modules.sales.models import SaleModel
from modules.sales.schemas import SaleCreateRequest, SaleResponse, SaleWithDetailsResponse
from core.exceptions import NotFoundException, BadRequestException
from core.timezone import get_ist_date, get_ist_time, get_ist_now
from modules.settings.notification_service import NotificationService

logger = logging.getLogger(__name__)

class SaleService:
    """Service layer for Sale business logic."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.repository = SaleRepository(db)
    
    def _get_today_date(self) -> str:
        """Get today's date in YYYY-MM-DD format (IST)"""
        return get_ist_date()
    
    async def _check_sale_report_submitted(self, salesman_id: str, date: str) -> bool:
        """Check if sale report has been submitted for the given date"""
        report = await self.db.sale_reports.find_one(
            {"salesman_id": salesman_id, "report_date": date},
            {"_id": 0, "id": 1}
        )
        return report is not None
    
    async def _get_salesman_remaining_crates(self, salesman_id: str, today_date: str) -> int:
        """Get the remaining crates for a salesman for today"""
        # Get total crates loaded today
        load_pipeline = [
            {"$match": {"salesman_id": salesman_id, "load_date": today_date}},
            {"$group": {"_id": None, "total": {"$sum": "$initial_crates"}}}
        ]
        load_result = await self.db.initial_loads.aggregate(load_pipeline).to_list(1)
        total_loaded = load_result[0]["total"] if load_result else 0
        
        # Get total crates sold today
        sale_pipeline = [
            {"$match": {"salesman_id": salesman_id, "sale_date": today_date}},
            {"$group": {"_id": None, "total": {"$sum": "$crates"}}}
        ]
        sale_result = await self.db.sales.aggregate(sale_pipeline).to_list(1)
        total_sold = sale_result[0]["total"] if sale_result else 0
        
        return total_loaded - total_sold
    
    async def create_sale(self, salesman_id: str, request: SaleCreateRequest, image_url: str = None) -> SaleResponse:
        """Create a new sale and update shop's dues and tray balance"""
        today_date = self._get_today_date()
        
        # Check if sale report already submitted for today
        if await self._check_sale_report_submitted(salesman_id, today_date):
            raise BadRequestException("Cannot add sale. Sale report has already been submitted for today.")
        
        # Check if salesman has enough crates remaining
        remaining_crates = await self._get_salesman_remaining_crates(salesman_id, today_date)
        if remaining_crates < request.crates:
            raise BadRequestException(
                f"Not enough crates left for sale. Available: {remaining_crates}, Requested: {request.crates}"
            )
        
        # Verify shop exists and get current data
        shop = await self.db.shops.find_one({"id": request.shop_id}, {"_id": 0})
        if not shop:
            raise BadRequestException(f"Shop with id '{request.shop_id}' does not exist")
        
        # Get shop's current tray balance and dues
        previous_tray_balance = shop.get("tray_balance", 0)
        
        # Calculate new tray balance: (old balance + crates) - return_tray
        new_tray_balance = (previous_tray_balance + request.crates) - request.return_tray
        
        # Current dues after this transaction = pending_amount
        current_dues = request.pending_amount
        
        now = get_ist_now()
        sale_date = now.strftime("%Y-%m-%d")
        sale_time = now.strftime("%H:%M:%S")
        
        # Determine transaction type: Sale if crates > 0, else Collection
        transaction_type = "Sale" if request.crates > 0 else "Collection"
        
        sale = SaleModel(
            id=str(uuid.uuid4()),
            salesman_id=salesman_id,
            shop_id=request.shop_id,
            crates=request.crates,
            price=request.price,
            order_amount=request.order_amount,
            shop_previous_dues=request.shop_previous_dues,
            total_amount=request.total_amount,
            collected_amount=request.collected_amount,
            pending_amount=request.pending_amount,
            payment_type=request.payment_type,
            return_tray=request.return_tray,
            previous_tray_balance=previous_tray_balance,
            current_tray_balance=new_tray_balance,
            current_dues=current_dues,
            transaction_type=transaction_type,
            image_url=image_url,
            sale_date=sale_date,
            sale_time=sale_time,
            created_at=now.isoformat()
        )
        
        # Save the sale
        await self.repository.create(sale)
        
        # Update shop's tray balance and previous_dues
        await self.db.shops.update_one(
            {"id": request.shop_id},
            {
                "$set": {
                    "tray_balance": new_tray_balance,
                    "previous_dues": current_dues,
                    "updated_at": now.isoformat()
                }
            }
        )
        
        # Send notifications based on settings (non-blocking)
        shop_phone = shop.get("phone", "")
        if shop_phone:
            # Get route info for WhatsApp button
            route = await self.db.routes.find_one({"id": shop.get("route_id")}, {"_id": 0, "route_name": 1})
            route_slug = route.get("route_name", "").lower().replace(" ", "-") if route else "default"
            
            # Format datetime for notifications
            transaction_datetime = now.isoformat()
            order_date = now.strftime("%d %b %Y %I:%M %p")
            
            # Run notifications in background (don't block the response)
            asyncio.create_task(
                self._send_notifications(
                    phone=shop_phone,
                    crates=request.crates,
                    price=request.price,
                    order_amount=request.order_amount,
                    previous_dues=request.shop_previous_dues,
                    total_amount=request.total_amount,
                    collected_amount=request.collected_amount,
                    pending_amount=request.pending_amount,
                    payment_type=request.payment_type,
                    tray_balance=new_tray_balance,
                    transaction_datetime=transaction_datetime,
                    order_date=order_date,
                    route_slug=route_slug
                )
            )
        
        return SaleResponse(**sale.model_dump())
    
    async def _send_notifications(
        self,
        phone: str,
        crates: int,
        price: float,
        order_amount: float,
        previous_dues: float,
        total_amount: float,
        collected_amount: float,
        pending_amount: float,
        payment_type: str,
        tray_balance: int,
        transaction_datetime: str,
        order_date: str,
        route_slug: str
    ):
        """Send WhatsApp and/or SMS notifications based on settings"""
        try:
            # Get settings
            settings = await self.db.settings.find_one({"id": "global_settings"}, {"_id": 0})
            
            if not settings:
                logger.info("No settings found, skipping notifications")
                return
            
            whatsapp_enabled = settings.get("whatsapp_enabled", False)
            sms_enabled = settings.get("sms_enabled", False)
            
            if not whatsapp_enabled and not sms_enabled:
                logger.info("Both WhatsApp and SMS are disabled, skipping notifications")
                return
            
            # Send WhatsApp if enabled
            if whatsapp_enabled:
                whatsapp_token = settings.get("whatsapp_api_token")
                if whatsapp_token:
                    whatsapp_template = settings.get("whatsapp_template_id", "gowda_egg_wa_template")
                    phone_number_id = settings.get("whatsapp_phone_number_id", "937349779458170")
                    image_url = settings.get("whatsapp_header_image_url", "https://litspark.solutions/litspark-logo.png")
                    
                    result = await NotificationService.send_whatsapp(
                        phone=phone,
                        crates=crates,
                        price=price,
                        order_amount=order_amount,
                        previous_dues=previous_dues,
                        total_amount=total_amount,
                        collected_amount=collected_amount,
                        pending_amount=pending_amount,
                        payment_type=payment_type,
                        tray_balance=tray_balance,
                        sale_datetime=transaction_datetime,
                        template_id=whatsapp_template,
                        api_token=whatsapp_token,
                        phone_number_id=phone_number_id,
                        image_url=image_url
                    )
                    logger.info(f"WhatsApp result: {result}")
                else:
                    logger.warning("WhatsApp enabled but no API token configured")
            
            # Send SMS if enabled
            if sms_enabled:
                msg91_auth_key = settings.get("msg91_auth_key")
                msg91_template_id = settings.get("msg91_template_id")
                
                if msg91_auth_key and msg91_template_id:
                    result = await NotificationService.send_sms(
                        phone=phone,
                        order_date=order_date,
                        crates=crates,
                        price=price,
                        order_amount=order_amount,
                        previous_dues=previous_dues,
                        total_amount=total_amount,
                        collected_amount=collected_amount,
                        pending_amount=pending_amount,
                        payment_type=payment_type,
                        tray_balance=tray_balance,
                        auth_key=msg91_auth_key,
                        template_id=msg91_template_id
                    )
                    logger.info(f"SMS result: {result}")
                else:
                    logger.warning("SMS enabled but MSG91 credentials not configured")
                    
        except Exception as e:
            logger.error(f"Error sending notifications: {str(e)}")
    
    async def get_salesman_sales_today(self, salesman_id: str) -> dict:
        """Get all sales for a salesman for today"""
        today_date = self._get_today_date()
        
        sales = await self.repository.get_by_salesman_today(salesman_id, today_date)
        
        # Calculate totals
        total_crates = sum(s["crates"] for s in sales)
        total_collected = sum(s["collected_amount"] for s in sales)
        total_pending = sum(s["pending_amount"] for s in sales)
        total_return_tray = sum(s["return_tray"] for s in sales)
        
        # Add transaction_type for backward compatibility
        enriched_sales = []
        for s in sales:
            sale_data = dict(s)
            if "transaction_type" not in sale_data:
                sale_data["transaction_type"] = "Sale" if sale_data["crates"] > 0 else "Collection"
            enriched_sales.append(SaleResponse(**sale_data).model_dump())
        
        return {
            "total": {
                "date": today_date,
                "sale_count": len(sales),
                "total_crates": total_crates,
                "total_collected": total_collected,
                "total_pending": total_pending,
                "total_return_tray": total_return_tray
            },
            "sales": enriched_sales
        }
    
    async def get_sale_report(self, salesman_id: str, report_date: Optional[str] = None) -> dict:
        """
        Get sale report for a salesman for a specific date.
        Returns: Total Initial Load, Total Sold, Remaining Crates, Return Trays,
                 Total Cash, Cheque, Online, Bill, and whether report is submitted
        """
        target_date = report_date or self._get_today_date()
        
        # Check if sale report already submitted for the target date
        is_report_submitted = await self._check_sale_report_submitted(salesman_id, target_date)
        
        # Get total initial load for the date
        load_pipeline = [
            {"$match": {"salesman_id": salesman_id, "load_date": target_date}},
            {"$group": {"_id": None, "total": {"$sum": "$initial_crates"}}}
        ]
        load_result = await self.db.initial_loads.aggregate(load_pipeline).to_list(1)
        total_initial_load = load_result[0]["total"] if load_result else 0
        
        # Get sales data for the date with payment breakdown
        sales_pipeline = [
            {"$match": {"salesman_id": salesman_id, "sale_date": target_date}},
            {"$group": {
                "_id": None,
                "total_sold": {"$sum": "$crates"},
                "total_return_tray": {"$sum": "$return_tray"},
                "total_cash": {"$sum": {"$cond": [{"$eq": ["$payment_type", "Cash"]}, "$collected_amount", 0]}},
                "total_cheque": {"$sum": {"$cond": [{"$eq": ["$payment_type", "Cheque"]}, "$collected_amount", 0]}},
                "total_online": {"$sum": {"$cond": [{"$in": ["$payment_type", ["UPI", "Online"]]}, "$collected_amount", 0]}},
                "total_bill": {"$sum": {"$cond": [{"$eq": ["$payment_type", "Bill"]}, "$collected_amount", 0]}}
            }}
        ]
        sales_result = await self.db.sales.aggregate(sales_pipeline).to_list(1)
        
        if sales_result:
            total_sold = sales_result[0].get("total_sold", 0)
            total_return_tray = sales_result[0].get("total_return_tray", 0)
            total_cash = sales_result[0].get("total_cash", 0)
            total_cheque = sales_result[0].get("total_cheque", 0)
            total_online = sales_result[0].get("total_online", 0)
            total_bill = sales_result[0].get("total_bill", 0)
        else:
            total_sold = 0
            total_return_tray = 0
            total_cash = 0
            total_cheque = 0
            total_online = 0
            total_bill = 0
        
        remaining_crates = total_initial_load - total_sold
        
        return {
            "date": target_date,
            "total_initial_load": total_initial_load,
            "total_sold": total_sold,
            "remaining_crates": remaining_crates,
            "return_trays": total_return_tray,
            "total_cash": total_cash,
            "total_cheque": total_cheque,
            "total_online": total_online,
            "total_bill": total_bill,
            "is_report_submitted": is_report_submitted
        }
    
    async def get_all_sales_admin(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        salesman_id: Optional[str] = None,
        shop_id: Optional[str] = None,
        transaction_type: Optional[str] = None,
        payment_type: Optional[str] = None,
        route_id: Optional[str] = None,
        has_image: Optional[str] = None
    ) -> dict:
        """Get all sales for admin with details"""
        # If route_id is provided, first get all salesman IDs for that route
        filtered_salesman_ids = None
        if route_id:
            salesmen_cursor = self.db.salesmen.find({"route_id": route_id}, {"id": 1, "_id": 0})
            salesmen_list = await salesmen_cursor.to_list(1000)
            filtered_salesman_ids = [s["id"] for s in salesmen_list]
            if not filtered_salesman_ids:
                # No salesmen found for this route, return empty result
                return {
                    "sales": [],
                    "total_records": 0,
                    "total_crates": 0,
                    "total_order_amount": 0,
                    "total_collected": 0,
                    "total_pending": 0,
                    "total_return_tray": 0
                }
        
        sales = await self.repository.get_all(
            from_date=from_date,
            to_date=to_date,
            salesman_id=salesman_id,
            shop_id=shop_id,
            transaction_type=transaction_type,
            payment_type=payment_type,
            has_image=has_image
        )
        
        # Filter by route_id if provided (via salesman's route)
        if filtered_salesman_ids is not None:
            sales = [s for s in sales if s["salesman_id"] in filtered_salesman_ids]
            # Recalculate totals from filtered sales
            count = len(sales)
            totals = {
                "total_crates": sum(s.get("crates", 0) for s in sales),
                "total_order_amount": sum(s.get("order_amount", 0) for s in sales),
                "total_collected": sum(s.get("collected_amount", 0) for s in sales),
                "total_pending": sum(s.get("pending_amount", 0) for s in sales),
                "total_return_tray": sum(s.get("return_tray", 0) for s in sales)
            }
        else:
            totals = await self.repository.get_totals(
                from_date=from_date,
                to_date=to_date,
                salesman_id=salesman_id,
                shop_id=shop_id,
                transaction_type=transaction_type,
                payment_type=payment_type,
                has_image=has_image
            )
            count = await self.repository.get_count(
                from_date=from_date,
                to_date=to_date,
                salesman_id=salesman_id,
                shop_id=shop_id,
                transaction_type=transaction_type,
                payment_type=payment_type,
                has_image=has_image
            )
        
        # Enrich with details
        enriched_sales = []
        for sale in sales:
            salesman = await self.db.salesmen.find_one({"id": sale["salesman_id"]}, {"_id": 0})
            shop = await self.db.shops.find_one({"id": sale["shop_id"]}, {"_id": 0})
            
            salesman_name = salesman.get("name", "Unknown") if salesman else "Unknown"
            shop_name = shop.get("name", "Unknown") if shop else "Unknown"
            shop_phone = shop.get("phone", "") if shop else ""
            credit_threshold = shop.get("credit_threshold", 0.0) if shop else 0.0
            
            route_name = ""
            if salesman and salesman.get("route_id"):
                route = await self.db.routes.find_one({"id": salesman["route_id"]}, {"_id": 0})
                if route:
                    route_name = route.get("route_name", "")
            
            enriched_sales.append(SaleWithDetailsResponse(
                id=sale["id"],
                salesman_id=sale["salesman_id"],
                salesman_name=salesman_name,
                shop_id=sale["shop_id"],
                shop_name=shop_name,
                shop_phone=shop_phone,
                route_name=route_name,
                crates=sale["crates"],
                price=sale["price"],
                order_amount=sale["order_amount"],
                shop_previous_dues=sale["shop_previous_dues"],
                total_amount=sale["total_amount"],
                collected_amount=sale["collected_amount"],
                pending_amount=sale["pending_amount"],
                payment_type=sale["payment_type"],
                return_tray=sale["return_tray"],
                previous_tray_balance=sale.get("previous_tray_balance", 0),
                current_tray_balance=sale.get("current_tray_balance", 0),
                current_dues=sale.get("current_dues", sale["pending_amount"]),
                transaction_type=sale.get("transaction_type", "Sale" if sale["crates"] > 0 else "Collection"),
                image_url=sale.get("image_url"),
                sale_date=sale["sale_date"],
                sale_time=sale.get("sale_time", "00:00:00"),
                created_at=sale["created_at"],
                credit_threshold=credit_threshold
            ))
        
        return {
            "total_records": count,
            "total_crates": totals.get("total_crates", 0),
            "total_order_amount": totals.get("total_order_amount", 0),
            "total_collected": totals.get("total_collected", 0),
            "total_pending": totals.get("total_pending", 0),
            "total_return_tray": totals.get("total_return_tray", 0),
            "sales": [s.model_dump() for s in enriched_sales]
        }
