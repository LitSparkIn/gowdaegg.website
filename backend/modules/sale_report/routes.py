from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from core.database import get_database
from core.response import success_response
from core.uploads import save_upload_file
from auth.security import get_current_user
from modules.sale_report.service import SaleReportService
from modules.sale_report.schemas import SaleReportSubmitRequest

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
    image: Optional[UploadFile] = File(None),
    service: SaleReportService = Depends(get_service),
    current_user: dict = Depends(verify_salesman)
):
    """
    Submit a daily sale report with optional image upload.
    Only one report can be submitted per day per salesman.
    """
    salesman_id = current_user["sub"]
    
    # Save image if provided
    image_url = None
    if image and image.filename:
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
