from datetime import datetime, timezone
from typing import Optional
import uuid
from motor.motor_asyncio import AsyncIOMotorDatabase

from modules.shop.repository import ShopRepository
from modules.shop.models import ShopModel
from modules.shop.schemas import (
    ShopCreateRequest, 
    ShopUpdateRequest, 
    ShopResponse,
    ShopListResponse,
    RouteInfo
)
from modules.route.repository import RouteRepository
from core.exceptions import NotFoundException, BadRequestException
from core.timezone import get_ist_now

class ShopService:
    """
    Service layer for Shop business logic.
    Handles all business rules and orchestrates repository operations.
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.repository = ShopRepository(db)
        self.route_repository = RouteRepository(db)
    
    async def _get_route_info(self, route_id: str) -> Optional[RouteInfo]:
        """Get route info for embedding in shop response"""
        route = await self.route_repository.get_by_id(route_id)
        if route:
            return RouteInfo(id=route["id"], route_name=route["route_name"])
        return None
    
    async def _build_shop_response(self, shop_data: dict) -> ShopResponse:
        """Build ShopResponse with embedded route info"""
        route_info = await self._get_route_info(shop_data["route_id"])
        return ShopResponse(
            id=shop_data["id"],
            name=shop_data["name"],
            phone=shop_data["phone"],
            address=shop_data["address"],
            previous_dues=shop_data["previous_dues"],
            route_id=shop_data["route_id"],
            route=route_info,
            tray_balance=shop_data["tray_balance"],
            created_at=shop_data["created_at"],
            updated_at=shop_data["updated_at"]
        )
    
    async def create_shop(self, request: ShopCreateRequest) -> ShopResponse:
        """Create a new shop"""
        # Validate route exists
        route_exists = await self.route_repository.exists(request.route_id)
        if not route_exists:
            raise BadRequestException(f"Route with id '{request.route_id}' does not exist")
        
        # Create shop model
        now = get_ist_now().isoformat()
        shop = ShopModel(
            id=str(uuid.uuid4()),
            name=request.name,
            phone=request.phone,
            address=request.address,
            previous_dues=request.previous_dues,
            route_id=request.route_id,
            tray_balance=request.tray_balance,
            created_at=now,
            updated_at=now
        )
        
        # Save to database
        await self.repository.create(shop)
        
        # Return with route info
        return await self._build_shop_response(shop.model_dump())
    
    async def get_shop(self, shop_id: str) -> ShopResponse:
        """Get a single shop by ID"""
        shop = await self.repository.get_by_id(shop_id)
        
        if not shop:
            raise NotFoundException("Shop", shop_id)
        
        return await self._build_shop_response(shop)
    
    async def get_all_shops(
        self, 
        skip: int = 0, 
        limit: int = 1000,
        route_id: Optional[str] = None
    ) -> ShopListResponse:
        """Get all shops with pagination and optional route filter"""
        shops = await self.repository.get_all(skip=skip, limit=limit, route_id=route_id)
        total = await self.repository.get_count(route_id=route_id)
        
        # Build responses with route info
        shop_responses = []
        for shop in shops:
            shop_response = await self._build_shop_response(shop)
            shop_responses.append(shop_response)
        
        return ShopListResponse(shops=shop_responses, total=total)
    
    async def update_shop(self, shop_id: str, request: ShopUpdateRequest) -> ShopResponse:
        """Update an existing shop"""
        # Check if shop exists
        existing = await self.repository.get_by_id(shop_id)
        if not existing:
            raise NotFoundException("Shop", shop_id)
        
        # Build update data
        update_data = {"updated_at": get_ist_now().isoformat()}
        
        if request.name is not None:
            update_data["name"] = request.name
        if request.phone is not None:
            update_data["phone"] = request.phone
        if request.address is not None:
            update_data["address"] = request.address
        if request.previous_dues is not None:
            update_data["previous_dues"] = request.previous_dues
        if request.route_id is not None:
            # Validate route exists
            route_exists = await self.route_repository.exists(request.route_id)
            if not route_exists:
                raise BadRequestException(f"Route with id '{request.route_id}' does not exist")
            update_data["route_id"] = request.route_id
        if request.tray_balance is not None:
            update_data["tray_balance"] = request.tray_balance
        
        # Update in database
        updated_shop = await self.repository.update(shop_id, update_data)
        
        return await self._build_shop_response(updated_shop)
    
    async def delete_shop(self, shop_id: str) -> bool:
        """Delete a shop"""
        exists = await self.repository.exists(shop_id)
        if not exists:
            raise NotFoundException("Shop", shop_id)
        
        await self.repository.delete(shop_id)
        return True
