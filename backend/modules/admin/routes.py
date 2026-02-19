from fastapi import APIRouter, Depends, HTTPException
from typing import List
from pydantic import BaseModel
from core.database import database
from auth.security import get_current_user
from core.response import success_response
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/admin", tags=["Admin"])

class ClearDataRequest(BaseModel):
    collections: List[str]

ALLOWED_COLLECTIONS = {
    "routes": "routes",
    "shops": "shops",
    "admins": "users",
    "salesmen": "salesmen",
    "suppliers": "suppliers",
    "purchases": "purchases",
    "expenses": "expenses",
    "daily_summaries": "daily_summaries",
    "sales": "sales",
    "initial_loads": "initial_loads",
    "sale_reports": "sale_reports"
}

EXPORT_COLLECTIONS = [
    "routes", "shops", "salesmen", "suppliers", "purchases", 
    "expenses", "sales", "initial_loads", "sale_reports", "daily_summaries"
]

def get_ist_now():
    return datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)

@router.get("/export-data")
async def export_data(
    current_user: dict = Depends(get_current_user)
):
    """
    Export all data from the database for backup.
    Only accessible by admin users.
    """
    if current_user.get("role") not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Only admins can export data")
    
    export = {
        "export_date": get_ist_now().isoformat(),
        "exported_by": current_user.get("email", "unknown"),
        "collections": {}
    }
    
    for collection_name in EXPORT_COLLECTIONS:
        try:
            cursor = database.db[collection_name].find({}, {"_id": 0})
            documents = await cursor.to_list(length=100000)
            export["collections"][collection_name] = {
                "count": len(documents),
                "data": documents
            }
        except Exception as e:
            export["collections"][collection_name] = {
                "count": 0,
                "data": [],
                "error": str(e)
            }
    
    return success_response(
        data=export,
        message="Data exported successfully"
    )

@router.post("/clear-data")
async def clear_data(
    request: ClearDataRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Clear data from selected collections.
    Only accessible by admin users.
    """
    if current_user.get("role") not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Only admins can clear data")
    
    cleared = []
    errors = []
    
    for collection_key in request.collections:
        if collection_key not in ALLOWED_COLLECTIONS:
            errors.append(f"Invalid collection: {collection_key}")
            continue
        
        collection_name = ALLOWED_COLLECTIONS[collection_key]
        
        try:
            # Special handling for users collection - don't delete the superadmin
            if collection_name == "users":
                result = await database.db[collection_name].delete_many({
                    "email": {"$ne": "superadmin@gmail.com"}
                })
            else:
                result = await database.db[collection_name].delete_many({})
            
            cleared.append({
                "collection": collection_key,
                "deleted_count": result.deleted_count
            })
        except Exception as e:
            errors.append(f"Error clearing {collection_key}: {str(e)}")
    
    return success_response(
        data={
            "cleared": cleared,
            "errors": errors
        },
        message="Data cleared successfully" if not errors else "Data cleared with some errors"
    )

@router.get("/collection-counts")
async def get_collection_counts(
    current_user: dict = Depends(get_current_user)
):
    """
    Get count of records in each collection.
    """
    if current_user.get("role") not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Only admins can view this")
    
    counts = {}
    for key, collection_name in ALLOWED_COLLECTIONS.items():
        try:
            count = await database.db[collection_name].count_documents({})
            counts[key] = count
        except Exception:
            counts[key] = 0
    
    return success_response(data=counts)
