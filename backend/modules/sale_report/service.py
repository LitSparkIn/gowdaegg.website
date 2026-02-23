from datetime import datetime, timezone
from typing import Optional
import uuid
from motor.motor_asyncio import AsyncIOMotorDatabase

from modules.sale_report.repository import SaleReportRepository
from modules.sale_report.models import SaleReportModel
from modules.sale_report.schemas import SaleReportSubmitRequest, SaleReportResponse
from core.exceptions import NotFoundException, BadRequestException
from core.timezone import get_ist_date, get_ist_now

class SaleReportService:
    """Service layer for Sale Report business logic."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.repository = SaleReportRepository(db)
    
    def _get_today_date(self) -> str:
        """Get today's date in YYYY-MM-DD format (IST)"""
        return get_ist_date()
    
    async def submit_sale_report(self, salesman_id: str, request: SaleReportSubmitRequest, image_url: str = None) -> SaleReportResponse:
        """Submit a sale report for today"""
        today_date = self._get_today_date()
        
        # Check if multiple reports are allowed
        settings = await self.db.settings.find_one({"id": "global_settings"}, {"_id": 0, "allow_multiple_reports": 1})
        allow_multiple_reports = settings.get("allow_multiple_reports", False) if settings else False
        
        if not allow_multiple_reports:
            # Check if report already submitted for today (single report mode)
            existing_report = await self.repository.get_by_salesman_and_date(salesman_id, today_date)
            if existing_report:
                raise BadRequestException(f"Sale report already submitted for {today_date}. You can only submit one report per day.")
        
        # Get salesman details
        salesman = await self.db.salesmen.find_one({"id": salesman_id}, {"_id": 0})
        if not salesman:
            raise BadRequestException("Salesman not found")
        
        salesman_name = salesman.get("name", "Unknown")
        
        # Calculate derived fields
        remaining_crates = request.initial_crates - request.crates_sold - request.crates_damaged
        remaining_cash = request.cash_collected - request.expense
        
        now = get_ist_now()
        report_id = str(uuid.uuid4())
        
        report = SaleReportModel(
            id=report_id,
            salesman_id=salesman_id,
            salesman_name=salesman_name,
            report_date=today_date,
            initial_crates=request.initial_crates,
            crates_sold=request.crates_sold,
            crates_damaged=request.crates_damaged,
            remaining_crates=remaining_crates,
            cash_collected=request.cash_collected,
            expense=request.expense,
            remaining_cash=remaining_cash,
            cheque=request.cheque,
            online=request.online,
            return_tray=request.return_tray,
            comments=request.comments,
            image_url=image_url,
            submitted_at=now.isoformat()
        )
        
        await self.repository.create(report)
        
        # Mark all non-submitted initial_loads and sales for this salesman today as submitted
        # This is the key part for "allow_multiple_reports" to work correctly
        await self.db.initial_loads.update_many(
            {
                "salesman_id": salesman_id,
                "load_date": today_date,
                "$or": [
                    {"report_submitted": False},
                    {"report_submitted": {"$exists": False}}
                ]
            },
            {
                "$set": {
                    "report_submitted": True,
                    "sale_report_id": report_id
                }
            }
        )
        
        await self.db.sales.update_many(
            {
                "salesman_id": salesman_id,
                "sale_date": today_date,
                "$or": [
                    {"report_submitted": False},
                    {"report_submitted": {"$exists": False}}
                ]
            },
            {
                "$set": {
                    "report_submitted": True,
                    "sale_report_id": report_id
                }
            }
        )
        
        return SaleReportResponse(**report.model_dump())
    
    async def get_salesman_reports(self, salesman_id: str) -> dict:
        """Get all sale reports for a salesman"""
        reports = await self.repository.get_all(salesman_id=salesman_id)
        count = await self.repository.get_count(salesman_id=salesman_id)
        
        return {
            "reports": [SaleReportResponse(**r).model_dump() for r in reports],
            "total_records": count
        }
    
    async def get_today_report(self, salesman_id: str) -> Optional[SaleReportResponse]:
        """Get today's sale report for a salesman"""
        today_date = self._get_today_date()
        report = await self.repository.get_by_salesman_and_date(salesman_id, today_date)
        if report:
            return SaleReportResponse(**report)
        return None
    
    async def get_all_reports_admin(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        salesman_id: Optional[str] = None
    ) -> dict:
        """Get all sale reports for admin"""
        reports = await self.repository.get_all(
            from_date=from_date,
            to_date=to_date,
            salesman_id=salesman_id
        )
        count = await self.repository.get_count(
            from_date=from_date,
            to_date=to_date,
            salesman_id=salesman_id
        )
        
        return {
            "reports": [SaleReportResponse(**r).model_dump() for r in reports],
            "total_records": count
        }
    
    async def delete_report(self, report_id: str) -> bool:
        """Delete a sale report (admin only)"""
        report = await self.repository.get_by_id(report_id)
        if not report:
            raise NotFoundException(f"Sale report with id '{report_id}' not found")
        return await self.repository.delete(report_id)
