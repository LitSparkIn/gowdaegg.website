from fastapi import APIRouter, Depends, Query, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid

from core.database import get_database
from core.response import success_response
from core.timezone import get_ist_date, get_ist_now
from auth.security import get_current_user

router = APIRouter(prefix="/attendance", tags=["Attendance"])


def verify_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") not in ["superadmin", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Admin only.")
    return current_user


@router.get("")
async def get_attendance(
    date: str = Query(None, description="Date in YYYY-MM-DD format. Defaults to today IST."),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_admin)
):
    """
    Get attendance for all salesmen for a given date.
    Returns all salesmen with their attendance status.
    If no attendance record exists for the date, all are considered present by default.
    """
    target_date = date or get_ist_date()

    # Get all active salesmen
    salesmen = await db.salesmen.find(
        {"is_active": {"$ne": False}},
        {"_id": 0, "id": 1, "name": 1, "phone": 1}
    ).sort("name", 1).to_list(1000)

    # Get existing attendance records for this date
    records = await db.attendance.find(
        {"date": target_date},
        {"_id": 0}
    ).to_list(1000)

    record_map = {r["salesman_id"]: r for r in records}

    result = []
    present_count = 0
    absent_count = 0

    for s in salesmen:
        rec = record_map.get(s["id"])
        # Default is present if no record exists
        status = rec["status"] if rec else "present"
        if status == "present":
            present_count += 1
        else:
            absent_count += 1
        result.append({
            "salesman_id": s["id"],
            "salesman_name": s["name"],
            "phone": s.get("phone", ""),
            "status": status
        })

    return success_response(
        data={
            "date": target_date,
            "salesmen": result,
            "total": len(result),
            "present_count": present_count,
            "absent_count": absent_count
        },
        message="Attendance fetched successfully"
    )


@router.put("/toggle")
async def toggle_attendance(
    salesman_id: str = Query(...),
    date: str = Query(None, description="Date in YYYY-MM-DD format. Defaults to today IST."),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_admin)
):
    """
    Toggle attendance for a salesman on a given date.
    If currently present (or no record), marks absent. If absent, marks present.
    """
    target_date = date or get_ist_date()

    # Verify salesman exists
    salesman = await db.salesmen.find_one({"id": salesman_id}, {"_id": 0, "id": 1, "name": 1})
    if not salesman:
        raise HTTPException(status_code=404, detail="Salesman not found")

    existing = await db.attendance.find_one(
        {"salesman_id": salesman_id, "date": target_date},
        {"_id": 0}
    )

    now = get_ist_now().isoformat()

    if existing:
        new_status = "absent" if existing["status"] == "present" else "present"
        await db.attendance.update_one(
            {"salesman_id": salesman_id, "date": target_date},
            {"$set": {"status": new_status, "updated_at": now}}
        )
    else:
        # No record means was present by default, so toggle to absent
        new_status = "absent"
        await db.attendance.insert_one({
            "id": str(uuid.uuid4()),
            "salesman_id": salesman_id,
            "salesman_name": salesman["name"],
            "date": target_date,
            "status": new_status,
            "created_at": now,
            "updated_at": now
        })

    return success_response(
        data={
            "salesman_id": salesman_id,
            "salesman_name": salesman["name"],
            "date": target_date,
            "status": new_status
        },
        message=f"Attendance marked as {new_status}"
    )
