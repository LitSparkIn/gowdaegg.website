from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
import logging
import os

from core.config import settings
from core.database import database

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Ensure uploads directory exists
UPLOAD_DIR = "/app/backend/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown events"""
    # Startup
    logger.info("Starting up application...")
    await database.connect()
    logger.info("Database connected successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down application...")
    await database.disconnect()
    logger.info("Database disconnected")

# Create the main app
app = FastAPI(
    title=settings.APP_NAME,
    lifespan=lifespan
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Health check endpoint
@api_router.get("/", tags=["Health"])
async def root():
    """API health check endpoint"""
    return {"message": "Gowda Egg Distributors API", "status": "healthy"}

# Import and include routers
from auth.routes import router as auth_router
from modules.route.routes import router as route_router
from modules.shop.routes import router as shop_router
from modules.salesman.routes import router as salesman_router
from modules.supplier.routes import router as supplier_router
from modules.expense.routes import router as expense_router
from modules.salesman_api.routes import router as salesman_api_router
from modules.initial_load.routes import router as initial_load_router
from modules.initial_load.routes import admin_router as initial_load_admin_router
from modules.sales.routes import router as sales_router
from modules.sales.routes import admin_router as sales_admin_router
from modules.purchase.routes import router as purchase_router
from modules.sale_report.routes import router as sale_report_router
from modules.sale_report.routes import admin_router as sale_report_admin_router
from modules.daily_summary.routes import router as daily_summary_router
from modules.dashboard.routes import router as dashboard_router
from modules.settings.routes import router as settings_router
from modules.public.routes import router as public_router
from modules.admin.routes import router as admin_data_router
from modules.admin_users.routes import router as admin_users_router
from modules.transportation_expense.routes import router as transportation_expense_router

api_router.include_router(auth_router)
api_router.include_router(route_router)
api_router.include_router(shop_router)
api_router.include_router(salesman_router)
api_router.include_router(supplier_router)
api_router.include_router(expense_router)
api_router.include_router(salesman_api_router)
api_router.include_router(initial_load_router)
api_router.include_router(initial_load_admin_router)
api_router.include_router(sales_router)
api_router.include_router(sales_admin_router)
api_router.include_router(purchase_router)
api_router.include_router(sale_report_router)
api_router.include_router(sale_report_admin_router)
api_router.include_router(daily_summary_router)
api_router.include_router(dashboard_router)
api_router.include_router(settings_router)
api_router.include_router(public_router)
api_router.include_router(admin_data_router)
api_router.include_router(admin_users_router)
api_router.include_router(transportation_expense_router)

# Include the main api router
app.include_router(api_router)

# Mount static files for uploads
app.mount("/api/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)
