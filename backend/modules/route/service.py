from datetime import datetime, timezone
from typing import Optional
import uuid
from motor.motor_asyncio import AsyncIOMotorDatabase

from modules.route.repository import RouteRepository
from modules.route.models import RouteModel
from modules.route.schemas import (
    RouteCreateRequest, 
    RouteUpdateRequest, 
    RouteResponse,
    RouteListResponse
)
from core.exceptions import NotFoundException, ConflictException
from core.timezone import get_ist_now

class RouteService:
    """
    Service layer for Route business logic.
    Handles all business rules and orchestrates repository operations.
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.repository = RouteRepository(db)
    
    async def create_route(self, request: RouteCreateRequest) -> RouteResponse:
        """
        Create a new route
        
        Args:
            request: RouteCreateRequest with route data
            
        Returns:
            RouteResponse with created route
            
        Raises:
            ConflictException: If route with same name exists
        """
        # Check for duplicate name (optional business rule)
        existing = await self.repository.get_by_name(request.route_name)
        if existing:
            raise ConflictException(f"Route with name '{request.route_name}' already exists")
        
        # Create route model
        now = get_ist_now().isoformat()
        route = RouteModel(
            id=str(uuid.uuid4()),
            route_name=request.route_name,
            created_at=now,
            updated_at=now
        )
        
        # Save to database
        created_route = await self.repository.create(route)
        
        return RouteResponse(
            id=created_route.id,
            route_name=created_route.route_name,
            created_at=created_route.created_at,
            updated_at=created_route.updated_at
        )
    
    async def get_route(self, route_id: str) -> RouteResponse:
        """
        Get a single route by ID
        
        Args:
            route_id: ID of the route to retrieve
            
        Returns:
            RouteResponse with route data
            
        Raises:
            NotFoundException: If route not found
        """
        route = await self.repository.get_by_id(route_id)
        
        if not route:
            raise NotFoundException("Route", route_id)
        
        return RouteResponse(**route)
    
    async def get_all_routes(self, skip: int = 0, limit: int = 1000) -> RouteListResponse:
        """
        Get all routes with pagination (active and inactive)
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            RouteListResponse with list of active routes, inactive routes, and total count
        """
        routes = await self.repository.get_all(skip=skip, limit=limit)
        inactive_routes = await self.repository.get_inactive(skip=0, limit=1000)
        total = await self.repository.get_count()
        
        return RouteListResponse(
            routes=[RouteResponse(**route) for route in routes],
            inactive_routes=[RouteResponse(**route) for route in inactive_routes],
            total=total
        )
    
    async def update_route(self, route_id: str, request: RouteUpdateRequest) -> RouteResponse:
        """
        Update an existing route
        
        Args:
            route_id: ID of the route to update
            request: RouteUpdateRequest with update data
            
        Returns:
            RouteResponse with updated route
            
        Raises:
            NotFoundException: If route not found
            ConflictException: If new name conflicts with existing route
        """
        # Check if route exists
        existing = await self.repository.get_by_id(route_id)
        if not existing:
            raise NotFoundException("Route", route_id)
        
        # Build update data
        update_data = {"updated_at": get_ist_now().isoformat()}
        
        if request.route_name is not None:
            # Check for duplicate name
            name_check = await self.repository.get_by_name(request.route_name)
            if name_check and name_check["id"] != route_id:
                raise ConflictException(f"Route with name '{request.route_name}' already exists")
            update_data["route_name"] = request.route_name
        
        # Update in database
        updated_route = await self.repository.update(route_id, update_data)
        
        return RouteResponse(**updated_route)
    
    async def delete_route(self, route_id: str) -> bool:
        """
        Soft delete a route (mark as inactive)
        
        Args:
            route_id: ID of the route to deactivate
            
        Returns:
            True if deactivated
            
        Raises:
            NotFoundException: If route not found
        """
        # Check if route exists
        exists = await self.repository.exists(route_id)
        if not exists:
            raise NotFoundException("Route", route_id)
        
        # Soft delete (mark as inactive)
        await self.repository.delete(route_id)
        return True

    async def activate_route(self, route_id: str) -> bool:
        """Activate an inactive route"""
        exists = await self.repository.exists(route_id)
        if not exists:
            raise NotFoundException("Route", route_id)
        
        await self.repository.activate(route_id)
        return True
