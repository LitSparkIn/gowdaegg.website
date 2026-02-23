from datetime import datetime, timezone
from typing import Optional
import uuid
from motor.motor_asyncio import AsyncIOMotorDatabase

from modules.initial_load.repository import InitialLoadRepository
from modules.initial_load.models import InitialLoadModel
from modules.initial_load.schemas import InitialLoadCreateRequest, InitialLoadUpdateRequest, InitialLoadResponse, InitialLoadWithSalesmanResponse
from core.exceptions import BadRequestException
from core.timezone import get_ist_date, get_ist_now

class InitialLoadService:
    """Service layer for Initial Load business logic."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.repository = InitialLoadRepository(db)
    
    def _get_today_date(self) -> str:
        """Get today's date in YYYY-MM-DD format (IST)"""
        return get_ist_date()
    
    async def _check_sale_report_submitted(self, salesman_id: str, date: str) -> bool:
        """Check if sale report has been submitted for the given date"""
        # First check if multiple reports are allowed
        settings = await self.db.settings.find_one({"id": "global_settings"}, {"_id": 0, "allow_multiple_reports": 1})
        if settings and settings.get("allow_multiple_reports", False):
            return False  # Allow initial load even if report submitted
        
        report = await self.db.sale_reports.find_one(
            {"salesman_id": salesman_id, "report_date": date},
            {"_id": 0, "id": 1}
        )
        return report is not None
    
    async def create_initial_load(self, salesman_id: str, request: InitialLoadCreateRequest) -> InitialLoadResponse:
        """Create a new initial load for salesman"""
        now = get_ist_now()
        load_date = now.strftime("%Y-%m-%d")
        
        # Check if sale report already submitted for today
        if await self._check_sale_report_submitted(salesman_id, load_date):
            raise BadRequestException("Cannot add initial load. Sale report has already been submitted for today.")
        
        initial_load = InitialLoadModel(
            id=str(uuid.uuid4()),
            salesman_id=salesman_id,
            initial_crates=request.initial_crates,
            load_date=load_date,
            created_at=now.isoformat(),
            report_submitted=False  # Flag to track if this load is part of a submitted report
        )
        
        await self.repository.create(initial_load)
        return InitialLoadResponse(**initial_load.model_dump())
    
    async def get_salesman_loads_today(self, salesman_id: str) -> dict:
        """Get all initial loads for a salesman for today with total"""
        today_date = self._get_today_date()
        
        loads = await self.repository.get_by_salesman_today(salesman_id, today_date, only_non_submitted=True)
        total_crates = await self.repository.get_total_crates_today(salesman_id, today_date, only_non_submitted=True)
        
        return {
            "total": {
                "date": today_date,
                "total_crates": total_crates,
                "load_count": len(loads)
            },
            "initial_loads": [InitialLoadResponse(**load).model_dump() for load in loads]
        }
    
    async def get_all_loads_admin(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        salesman_id: Optional[str] = None
    ) -> dict:
        """Get all initial loads for admin panel with salesman details"""
        loads = await self.repository.get_all(
            from_date=from_date,
            to_date=to_date,
            salesman_id=salesman_id
        )
        total_crates = await self.repository.get_total_crates(
            from_date=from_date,
            to_date=to_date,
            salesman_id=salesman_id
        )
        total_records = await self.repository.get_count(
            from_date=from_date,
            to_date=to_date,
            salesman_id=salesman_id
        )
        
        # Enrich with salesman details
        enriched_loads = []
        for load in loads:
            # Include inactive salesmen for historical data
            salesman = await self.db.salesmen.find_one({"id": load["salesman_id"]}, {"_id": 0})
            route_name = ""
            salesman_name = "Unknown"
            salesman_phone = ""
            
            if salesman:
                salesman_name = salesman.get("name", "Unknown")
                salesman_phone = salesman.get("phone", "")
                if salesman.get("route_id"):
                    # Include inactive routes for historical data
                    route = await self.db.routes.find_one({"id": salesman.get("route_id")}, {"_id": 0})
                    if route:
                        route_name = route.get("route_name", "")
            
            enriched_loads.append(InitialLoadWithSalesmanResponse(
                id=load["id"],
                salesman_id=load["salesman_id"],
                salesman_name=salesman_name,
                salesman_phone=salesman_phone,
                route_name=route_name,
                initial_crates=load["initial_crates"],
                load_date=load["load_date"],
                created_at=load["created_at"]
            ))
        
        return {
            "total_crates": total_crates,
            "total_records": total_records,
            "initial_loads": [load.model_dump() for load in enriched_loads]
        }

    async def update_initial_load(self, load_id: str, request: InitialLoadUpdateRequest) -> InitialLoadWithSalesmanResponse:
        """Update an initial load's crates"""
        # Get existing load
        load = await self.db.initial_loads.find_one({"id": load_id}, {"_id": 0})
        if not load:
            raise BadRequestException(f"Initial load with id '{load_id}' not found")
        
        now = get_ist_now()
        
        # Update the load
        await self.db.initial_loads.update_one(
            {"id": load_id},
            {"$set": {"initial_crates": request.initial_crates, "updated_at": now.isoformat()}}
        )
        
        # Get updated load with salesman details
        updated_load = await self.db.initial_loads.find_one({"id": load_id}, {"_id": 0})
        
        salesman = await self.db.salesmen.find_one({"id": updated_load["salesman_id"]}, {"_id": 0})
        route_name = ""
        salesman_name = "Unknown"
        salesman_phone = ""
        
        if salesman:
            salesman_name = salesman.get("name", "Unknown")
            salesman_phone = salesman.get("phone", "")
            if salesman.get("route_id"):
                # Include inactive routes for historical data
                route = await self.db.routes.find_one({"id": salesman.get("route_id")}, {"_id": 0})
                if route:
                    route_name = route.get("route_name", "")
        
        return InitialLoadWithSalesmanResponse(
            id=updated_load["id"],
            salesman_id=updated_load["salesman_id"],
            salesman_name=salesman_name,
            salesman_phone=salesman_phone,
            route_name=route_name,
            initial_crates=updated_load["initial_crates"],
            load_date=updated_load["load_date"],
            created_at=updated_load["created_at"]
        )
