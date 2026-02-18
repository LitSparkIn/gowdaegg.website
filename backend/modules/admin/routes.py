from fastapi import APIRouter, Depends, HTTPException
from typing import List
from pydantic import BaseModel
from core.database import database
from auth.security import get_current_user
from core.response import success_response

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

@router.post("/clear-data")
async def clear_data(
    request: ClearDataRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Clear data from selected collections.
    Only accessible by admin users.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can clear data")
    
    cleared = []
    errors = []
    
    for collection_key in request.collections:
        if collection_key not in ALLOWED_COLLECTIONS:
            errors.append(f"Invalid collection: {collection_key}")
            continue
        
        collection_name = ALLOWED_COLLECTIONS[collection_key]
        
        try:
            # Special handling for users collection - don't delete the current admin
            if collection_name == "users":
                result = await database.db[collection_name].delete_many({
                    "_id": {"$ne": current_user.get("_id")}
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
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view this")
    
    counts = {}
    for key, collection_name in ALLOWED_COLLECTIONS.items():
        try:
            count = await database.db[collection_name].count_documents({})
            counts[key] = count
        except Exception:
            counts[key] = 0
    
    return success_response(data=counts)
