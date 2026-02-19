from datetime import datetime, timezone
from typing import Optional
import uuid
import hashlib
from motor.motor_asyncio import AsyncIOMotorDatabase

from modules.salesman.repository import SalesmanRepository
from modules.salesman.models import SalesmanModel
from modules.salesman.schemas import (
    SalesmanCreateRequest, 
    SalesmanUpdateRequest, 
    SalesmanResponse,
    SalesmanListResponse,
    RouteInfo
)
from modules.route.repository import RouteRepository
from core.exceptions import NotFoundException, BadRequestException, ConflictException
from core.timezone import get_ist_now

class SalesmanService:
    """
    Service layer for Salesman business logic.
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.repository = SalesmanRepository(db)
        self.route_repository = RouteRepository(db)
    
    def _hash_pin(self, pin: str) -> str:
        """Hash PIN for secure storage"""
        return hashlib.sha256(pin.encode()).hexdigest()
    
    async def _get_route_info(self, route_id: str) -> Optional[RouteInfo]:
        """Get route info for embedding in response"""
        route = await self.route_repository.get_by_id(route_id)
        if route:
            return RouteInfo(id=route["id"], route_name=route["route_name"])
        return None
    
    async def _build_response(self, salesman_data: dict) -> SalesmanResponse:
        """Build SalesmanResponse with embedded route info"""
        route_info = await self._get_route_info(salesman_data["route_id"])
        return SalesmanResponse(
            id=salesman_data["id"],
            route_id=salesman_data["route_id"],
            route=route_info,
            name=salesman_data["name"],
            phone=salesman_data["phone"],
            email=salesman_data["email"],
            created_at=salesman_data["created_at"],
            updated_at=salesman_data["updated_at"]
        )
    
    async def create_salesman(self, request: SalesmanCreateRequest) -> SalesmanResponse:
        """Create a new salesman"""
        # Validate route exists
        route_exists = await self.route_repository.exists(request.route_id)
        if not route_exists:
            raise BadRequestException(f"Route with id '{request.route_id}' does not exist")
        
        # Check for duplicate email
        existing_email = await self.repository.get_by_email(request.email)
        if existing_email:
            raise ConflictException(f"Salesman with email '{request.email}' already exists")
        
        # Check for duplicate phone
        existing_phone = await self.repository.get_by_phone(request.phone)
        if existing_phone:
            raise ConflictException(f"Salesman with phone '{request.phone}' already exists")
        
        # Create salesman model
        now = get_ist_now().isoformat()
        salesman = SalesmanModel(
            id=str(uuid.uuid4()),
            route_id=request.route_id,
            name=request.name,
            phone=request.phone,
            email=request.email,
            pin_hash=self._hash_pin(request.pin),
            created_at=now,
            updated_at=now
        )
        
        await self.repository.create(salesman)
        return await self._build_response(salesman.model_dump())
    
    async def get_salesman(self, salesman_id: str) -> SalesmanResponse:
        """Get a single salesman by ID"""
        salesman = await self.repository.get_by_id(salesman_id)
        if not salesman:
            raise NotFoundException("Salesman", salesman_id)
        return await self._build_response(salesman)
    
    async def get_all_salesmen(
        self, 
        skip: int = 0, 
        limit: int = 1000,
        route_id: Optional[str] = None
    ) -> SalesmanListResponse:
        """Get all salesmen with pagination and optional route filter (active and inactive)"""
        salesmen = await self.repository.get_all(skip=skip, limit=limit, route_id=route_id)
        inactive_salesmen = await self.repository.get_inactive(skip=0, limit=1000)
        total = await self.repository.get_count(route_id=route_id)
        
        responses = []
        for salesman in salesmen:
            response = await self._build_response(salesman)
            responses.append(response)
        
        inactive_responses = []
        for salesman in inactive_salesmen:
            response = await self._build_response(salesman)
            inactive_responses.append(response)
        
        return SalesmanListResponse(salesmen=responses, inactive_salesmen=inactive_responses, total=total)
    
    async def update_salesman(self, salesman_id: str, request: SalesmanUpdateRequest) -> SalesmanResponse:
        """Update an existing salesman"""
        existing = await self.repository.get_by_id(salesman_id)
        if not existing:
            raise NotFoundException("Salesman", salesman_id)
        
        update_data = {"updated_at": get_ist_now().isoformat()}
        
        if request.route_id is not None:
            route_exists = await self.route_repository.exists(request.route_id)
            if not route_exists:
                raise BadRequestException(f"Route with id '{request.route_id}' does not exist")
            update_data["route_id"] = request.route_id
            
        if request.name is not None:
            update_data["name"] = request.name
            
        if request.phone is not None:
            existing_phone = await self.repository.get_by_phone(request.phone)
            if existing_phone and existing_phone["id"] != salesman_id:
                raise ConflictException(f"Salesman with phone '{request.phone}' already exists")
            update_data["phone"] = request.phone
            
        if request.email is not None:
            existing_email = await self.repository.get_by_email(request.email)
            if existing_email and existing_email["id"] != salesman_id:
                raise ConflictException(f"Salesman with email '{request.email}' already exists")
            update_data["email"] = request.email
            
        if request.pin is not None:
            update_data["pin_hash"] = self._hash_pin(request.pin)
        
        updated = await self.repository.update(salesman_id, update_data)
        return await self._build_response(updated)
    
    async def delete_salesman(self, salesman_id: str) -> bool:
        """Soft delete a salesman (mark as inactive)"""
        exists = await self.repository.exists(salesman_id)
        if not exists:
            raise NotFoundException("Salesman", salesman_id)
        
        await self.repository.delete(salesman_id)
        return True
