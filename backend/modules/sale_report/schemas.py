from pydantic import BaseModel, Field
from typing import Optional

# ============ Request Schemas ============

class SaleReportSubmitRequest(BaseModel):
    """Schema for submitting a sale report"""
    initial_crates: int = Field(..., ge=0, description="Total Initial Load")
    crates_sold: int = Field(..., ge=0, description="Total Sold")
    crates_damaged: int = Field(default=0, ge=0, description="Damaged Crates")
    cash_collected: float = Field(..., ge=0, description="Cash Collected")
    expense: float = Field(default=0, ge=0, description="Expense")
    cheque: float = Field(default=0, ge=0, description="Cheque Amount")
    online: float = Field(default=0, ge=0, description="Online Amount")
    return_tray: int = Field(default=0, ge=0, description="Return Trays")
    comments: str = Field(default="", description="Comments")

class AdminSaleReportSubmitRequest(BaseModel):
    """Schema for admin submitting a sale report on behalf of a salesman"""
    crates_damaged: int = Field(default=0, ge=0, description="Damaged Crates")
    expense: float = Field(default=0, ge=0, description="Expense")
    empty_crates_returned: int = Field(default=0, ge=0, description="Empty Crates Returned")
    comments: str = Field(default="", description="Comments")
    date: Optional[str] = Field(default=None, description="Date for the report (YYYY-MM-DD)")

class SaleReportUpdateRequest(BaseModel):
    """Schema for updating a sale report"""
    crates_damaged: int = Field(..., ge=0, description="Damaged Crates")
    expense: float = Field(..., ge=0, description="Expense")
    comments: str = Field(default="", description="Comments")

# ============ Response Schemas ============

class SaleReportResponse(BaseModel):
    """Schema for sale report response"""
    id: str
    salesman_id: str
    salesman_name: str
    report_date: str
    initial_crates: int
    crates_sold: int
    crates_damaged: int
    remaining_crates: int
    cash_collected: float
    expense: float
    remaining_cash: float
    cheque: float
    online: float
    return_tray: int
    comments: str
    image_url: Optional[str] = None
    submitted_at: str

class SaleReportListResponse(BaseModel):
    """Schema for list of sale reports response"""
    reports: list[SaleReportResponse]
    total_records: int
