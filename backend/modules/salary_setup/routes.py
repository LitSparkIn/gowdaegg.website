from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid

from core.database import get_database
from core.response import success_response
from core.timezone import get_ist_date, get_ist_now
from auth.security import get_current_user
from modules.salary_setup.schemas import (
    SalarySetupCreateRequest,
    SalarySetupUpdateRequest,
    SalaryBalanceUpdateRequest,
)

router = APIRouter(prefix="/salary-setup", tags=["Salary Setup"])


def verify_superadmin(current_user: dict = Depends(get_current_user)) -> dict:
    """Verify that the current user is a superadmin"""
    if current_user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Access denied. Superadmin only.")
    return current_user


def verify_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Verify that the current user is an admin"""
    if current_user.get("role") not in ["superadmin", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Admin only.")
    return current_user


@router.post("")
async def create_salary_setup(
    request: SalarySetupCreateRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_superadmin)
):
    """Create a new salary setup for a salesman"""
    
    # Check if salesman exists
    salesman = await db.salesmen.find_one({"id": request.salesman_id}, {"_id": 0})
    if not salesman:
        raise HTTPException(status_code=404, detail="Salesman not found")
    
    # Check if salary setup already exists for this salesman
    existing = await db.salary_setups.find_one({"salesman_id": request.salesman_id})
    if existing:
        raise HTTPException(status_code=400, detail="Salary setup already exists for this salesman")
    
    now = get_ist_now()
    
    salary_setup = {
        "id": str(uuid.uuid4()),
        "salesman_id": request.salesman_id,
        "salesman_name": salesman.get("name", "Unknown"),
        "joining_date": request.joining_date,
        "monthly_salary": request.monthly_salary,
        "current_balance": request.current_balance,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.salary_setups.insert_one(salary_setup)
    salary_setup.pop("_id", None)
    
    # Create initial activity if there's an initial balance
    if request.current_balance > 0:
        activity = {
            "id": str(uuid.uuid4()),
            "salary_setup_id": salary_setup["id"],
            "salesman_id": request.salesman_id,
            "salesman_name": salesman.get("name", "Unknown"),
            "activity_type": "credit",
            "amount": request.current_balance,
            "balance_before": 0,
            "balance_after": request.current_balance,
            "remarks": "Initial balance setup",
            "activity_date": get_ist_date(),
            "created_at": now.isoformat()
        }
        await db.salary_activities.insert_one(activity)
    
    return success_response(
        data=salary_setup,
        message="Salary setup created successfully"
    )


@router.get("")
async def get_all_salary_setups(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_admin)
):
    """Get all salary setups"""
    
    cursor = db.salary_setups.find({}, {"_id": 0}).sort("salesman_name", 1)
    setups = await cursor.to_list(1000)
    
    # Update salesman names in case they changed
    for setup in setups:
        salesman = await db.salesmen.find_one({"id": setup["salesman_id"]}, {"_id": 0, "name": 1})
        if salesman:
            setup["salesman_name"] = salesman.get("name", setup.get("salesman_name", "Unknown"))
    
    return success_response(
        data={
            "setups": setups,
            "total": len(setups)
        },
        message="Salary setups fetched successfully"
    )


@router.get("/activities")
async def get_all_salary_activities(
    salesman_id: Optional[str] = Query(None, description="Filter by salesman ID"),
    from_date: Optional[str] = Query(None, description="Filter from date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="Filter to date (YYYY-MM-DD)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_admin)
):
    """Get all salary activities with filters"""
    
    query = {}
    
    if salesman_id:
        query["salesman_id"] = salesman_id
    
    if from_date or to_date:
        date_filter = {}
        if from_date:
            date_filter["$gte"] = from_date
        if to_date:
            date_filter["$lte"] = to_date
        if date_filter:
            query["activity_date"] = date_filter
    
    cursor = db.salary_activities.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    activities = await cursor.to_list(limit)
    total = await db.salary_activities.count_documents(query)
    
    return success_response(
        data={
            "activities": activities,
            "total": total
        },
        message="Salary activities fetched successfully"
    )


@router.get("/{setup_id}")
async def get_salary_setup(
    setup_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_admin)
):
    """Get a single salary setup by ID"""
    
    setup = await db.salary_setups.find_one({"id": setup_id}, {"_id": 0})
    if not setup:
        raise HTTPException(status_code=404, detail="Salary setup not found")
    
    return success_response(
        data=setup,
        message="Salary setup fetched successfully"
    )


@router.get("/{setup_id}/activities")
async def get_salary_setup_activities(
    setup_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_admin)
):
    """Get all activities for a specific salary setup"""
    
    setup = await db.salary_setups.find_one({"id": setup_id}, {"_id": 0})
    if not setup:
        raise HTTPException(status_code=404, detail="Salary setup not found")
    
    cursor = db.salary_activities.find(
        {"salary_setup_id": setup_id}, 
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit)
    
    activities = await cursor.to_list(limit)
    total = await db.salary_activities.count_documents({"salary_setup_id": setup_id})
    
    return success_response(
        data={
            "setup": setup,
            "activities": activities,
            "total": total
        },
        message="Salary setup activities fetched successfully"
    )


@router.put("/{setup_id}")
async def update_salary_setup(
    setup_id: str,
    request: SalarySetupUpdateRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_superadmin)
):
    """Update a salary setup (joining date and monthly salary)"""
    
    setup = await db.salary_setups.find_one({"id": setup_id}, {"_id": 0})
    if not setup:
        raise HTTPException(status_code=404, detail="Salary setup not found")
    
    update_data = {"updated_at": get_ist_now().isoformat()}
    
    if request.joining_date is not None:
        update_data["joining_date"] = request.joining_date
    
    if request.monthly_salary is not None:
        update_data["monthly_salary"] = request.monthly_salary
    
    await db.salary_setups.update_one(
        {"id": setup_id},
        {"$set": update_data}
    )
    
    updated_setup = await db.salary_setups.find_one({"id": setup_id}, {"_id": 0})
    
    return success_response(
        data=updated_setup,
        message="Salary setup updated successfully"
    )


@router.post("/{setup_id}/update-balance")
async def update_salary_balance(
    setup_id: str,
    request: SalaryBalanceUpdateRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_superadmin)
):
    """Add amount to salary balance (for monthly salary credit)"""
    
    setup = await db.salary_setups.find_one({"id": setup_id}, {"_id": 0})
    if not setup:
        raise HTTPException(status_code=404, detail="Salary setup not found")
    
    now = get_ist_now()
    balance_before = setup.get("current_balance", 0)
    balance_after = balance_before + request.amount
    
    # Update balance
    await db.salary_setups.update_one(
        {"id": setup_id},
        {"$set": {
            "current_balance": balance_after,
            "updated_at": now.isoformat()
        }}
    )
    
    # Create activity record
    activity_type = "credit" if request.amount > 0 else "debit"
    activity = {
        "id": str(uuid.uuid4()),
        "salary_setup_id": setup_id,
        "salesman_id": setup["salesman_id"],
        "salesman_name": setup.get("salesman_name", "Unknown"),
        "activity_type": activity_type,
        "amount": abs(request.amount),
        "balance_before": balance_before,
        "balance_after": balance_after,
        "remarks": request.remarks or "Monthly salary credit",
        "activity_date": get_ist_date(),
        "created_at": now.isoformat()
    }
    
    await db.salary_activities.insert_one(activity)
    activity.pop("_id", None)
    
    # Get updated setup
    updated_setup = await db.salary_setups.find_one({"id": setup_id}, {"_id": 0})
    
    return success_response(
        data={
            "setup": updated_setup,
            "activity": activity
        },
        message="Salary balance updated successfully"
    )


@router.delete("/{setup_id}")
async def delete_salary_setup(
    setup_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_superadmin)
):
    """Delete a salary setup and all its activities"""
    
    setup = await db.salary_setups.find_one({"id": setup_id})
    if not setup:
        raise HTTPException(status_code=404, detail="Salary setup not found")
    
    # Delete all activities for this setup
    await db.salary_activities.delete_many({"salary_setup_id": setup_id})
    
    # Delete the setup
    await db.salary_setups.delete_one({"id": setup_id})
    
    return success_response(
        data=None,
        message="Salary setup and activities deleted successfully"
    )
