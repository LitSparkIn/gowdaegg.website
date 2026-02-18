from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from core.database import get_database
from core.response import success_response
from core.uploads import save_upload_file
from auth.security import get_current_user
from modules.sale_report.service import SaleReportService
from modules.sale_report.schemas import SaleReportSubmitRequest, AdminSaleReportSubmitRequest

router = APIRouter(prefix="/salesman/sale-report", tags=["Sale Report"])

def verify_salesman(current_user: dict = Depends(get_current_user)) -> dict:
    """Verify that the current user is a salesman"""
    if current_user.get("role") != "salesman":
        raise HTTPException(status_code=403, detail="Access denied. Salesman only.")
    return current_user

def get_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> SaleReportService:
    return SaleReportService(db)

@router.post("")
async def submit_sale_report(
    initial_crates: int = Form(...),
    crates_sold: int = Form(...),
    crates_damaged: int = Form(0),
    cash_collected: float = Form(...),
    expense: float = Form(0),
    cheque: float = Form(0),
    online: float = Form(0),
    return_tray: int = Form(0),
    comments: str = Form(""),
    image: Optional[UploadFile] = File(default=None),
    service: SaleReportService = Depends(get_service),
    current_user: dict = Depends(verify_salesman)
):
    """
    Submit a daily sale report with optional image upload.
    Only one report can be submitted per day per salesman.
    """
    salesman_id = current_user["sub"]
    
    # Save image if provided and has a valid filename
    image_url = None
    if image is not None and image.filename and image.filename.strip():
        try:
            image_url = await save_upload_file(image, "report")
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    
    # Create request object
    request = SaleReportSubmitRequest(
        initial_crates=initial_crates,
        crates_sold=crates_sold,
        crates_damaged=crates_damaged,
        cash_collected=cash_collected,
        expense=expense,
        cheque=cheque,
        online=online,
        return_tray=return_tray,
        comments=comments
    )
    
    report = await service.submit_sale_report(salesman_id, request, image_url)
    
    return success_response(
        data=report.model_dump(),
        message="Sale report submitted successfully"
    )

@router.get("")
async def get_my_reports(
    service: SaleReportService = Depends(get_service),
    current_user: dict = Depends(verify_salesman)
):
    """
    Get all sale reports for the current salesman.
    """
    salesman_id = current_user["sub"]
    
    result = await service.get_salesman_reports(salesman_id)
    
    return success_response(
        data=result,
        message="Sale reports fetched successfully"
    )

@router.get("/today")
async def get_today_report(
    service: SaleReportService = Depends(get_service),
    current_user: dict = Depends(verify_salesman)
):
    """
    Get today's sale report for the current salesman.
    Returns null if no report submitted yet.
    """
    salesman_id = current_user["sub"]
    
    report = await service.get_today_report(salesman_id)
    
    return success_response(
        data=report.model_dump() if report else None,
        message="Today's report fetched" if report else "No report submitted for today"
    )


# ============ Admin Routes ============

admin_router = APIRouter(prefix="/sale-reports", tags=["Sale Reports - Admin"])

def verify_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Verify that the current user is an admin"""
    if current_user.get("role") not in ["superadmin", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Admin only.")
    return current_user

@admin_router.get("")
async def get_all_sale_reports_admin(
    from_date: Optional[str] = Query(None, description="Filter from date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="Filter to date (YYYY-MM-DD)"),
    salesman_id: Optional[str] = Query(None, description="Filter by salesman ID"),
    service: SaleReportService = Depends(get_service),
    current_user: dict = Depends(verify_admin)
):
    """
    Get all submitted sale reports with filters.
    """
    result = await service.get_all_reports_admin(
        from_date=from_date,
        to_date=to_date,
        salesman_id=salesman_id
    )
    
    return success_response(
        data=result,
        message="Sale reports fetched successfully"
    )

@admin_router.delete("/{report_id}")
async def delete_sale_report(
    report_id: str,
    service: SaleReportService = Depends(get_service),
    current_user: dict = Depends(verify_admin)
):
    """Delete a sale report"""
    await service.delete_report(report_id)
    return success_response(
        data=None,
        message="Sale report deleted successfully"
    )

@admin_router.post("/submit-for-salesman/{salesman_id}")
async def admin_submit_sale_report(
    salesman_id: str,
    request: AdminSaleReportSubmitRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(verify_admin)
):
    """
    Admin submits sale report on behalf of a salesman.
    Auto-calculates initial_crates, crates_sold, cash/cheque/online from the day's transactions.
    """
    from core.timezone import get_ist_date
    
    target_date = request.date or get_ist_date()
    crates_damaged = request.crates_damaged
    expense = request.expense
    empty_crates_returned = request.empty_crates_returned
    comments = request.comments
    
    # Check if already submitted
    existing = await db.sale_reports.find_one({
        "salesman_id": salesman_id,
        "report_date": target_date
    })
    if existing:
        raise HTTPException(status_code=400, detail="Report already submitted for this date")
    
    # Get salesman info
    salesman = await db.salesmen.find_one({"id": salesman_id}, {"_id": 0})
    if not salesman:
        raise HTTPException(status_code=404, detail="Salesman not found")
    
    # Get initial load for the day
    load_pipeline = [
        {"$match": {"salesman_id": salesman_id, "load_date": target_date}},
        {"$group": {"_id": None, "total": {"$sum": "$initial_crates"}}}
    ]
    load_result = await db.initial_loads.aggregate(load_pipeline).to_list(1)
    initial_crates = load_result[0]["total"] if load_result else 0
    
    # Get sales data for the day
    sales_pipeline = [
        {"$match": {"salesman_id": salesman_id, "sale_date": target_date}},
        {"$group": {
            "_id": None,
            "total_sold": {"$sum": "$crates"},
            "total_return_tray": {"$sum": "$return_tray"},
            "total_cash": {"$sum": {"$cond": [{"$eq": ["$payment_type", "Cash"]}, "$collected_amount", 0]}},
            "total_cheque": {"$sum": {"$cond": [{"$eq": ["$payment_type", "Cheque"]}, "$collected_amount", 0]}},
            "total_online": {"$sum": {"$cond": [{"$in": ["$payment_type", ["UPI", "Online"]]}, "$collected_amount", 0]}}
        }}
    ]
    sales_result = await db.sales.aggregate(sales_pipeline).to_list(1)
    
    if sales_result:
        crates_sold = sales_result[0].get("total_sold", 0)
        return_tray = sales_result[0].get("total_return_tray", 0)
        cash_collected = sales_result[0].get("total_cash", 0)
        cheque = sales_result[0].get("total_cheque", 0)
        online = sales_result[0].get("total_online", 0)
    else:
        crates_sold = 0
        return_tray = 0
        cash_collected = 0
        cheque = 0
        online = 0
    
    # Calculate remaining
    remaining_crates = initial_crates - crates_sold - crates_damaged
    remaining_cash = cash_collected - expense
    
    # Create report
    from core.timezone import get_ist_now
    import uuid
    
    report = {
        "id": str(uuid.uuid4()),
        "salesman_id": salesman_id,
        "salesman_name": salesman.get("name", "Unknown"),
        "report_date": target_date,
        "initial_crates": initial_crates,
        "crates_sold": crates_sold,
        "crates_damaged": crates_damaged,
        "remaining_crates": remaining_crates,
        "cash_collected": cash_collected,
        "expense": expense,
        "remaining_cash": remaining_cash,
        "cheque": cheque,
        "online": online,
        "return_tray": return_tray + empty_crates_returned,
        "empty_crates_returned": empty_crates_returned,
        "comments": comments,
        "image_url": None,
        "submitted_at": get_ist_now().isoformat(),
        "submitted_by_admin": True
    }
    
    await db.sale_reports.insert_one(report)
    
    # Remove _id for JSON serialization
    report.pop("_id", None)
    
    return success_response(
        data=report,
        message=f"Sale report submitted for {salesman.get('name', 'Unknown')}"
    )
