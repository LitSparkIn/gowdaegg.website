# Gowda Egg Distributors - Sales Dashboard PRD

## Original Problem Statement
Build a sales dashboard for "Gowda Egg Distributors" with greenish theme and "Lexend Deca" font. The application manages the entire sales and purchasing lifecycle including admin panel, salesman mobile APIs, and comprehensive reporting.

## User Personas
- **Super Admin**: Full access to manage routes, shops, salesmen, suppliers, purchases, expenses, admin users, and all reports including profit/loss, daily summaries, and configuration settings
- **Admin**: Read-only access to view routes, shops, salesmen, suppliers, purchases, expenses, and basic reports. Cannot add, edit, or delete any data. No access to profit/loss reports, daily summaries, or config settings.
- **Salesman**: Mobile app user who performs daily sales, creates initial loads, records transactions, and submits daily reports

## Core Requirements
1. Admin authentication and dashboard
2. CRUD for: Routes, Shops, Salesmen, Suppliers, Expenses, Purchases
3. Salesman mobile APIs (form-data format)
4. Sales transaction management
5. Comprehensive reporting system
6. WhatsApp integration for transaction receipts

## Tech Stack
- **Backend**: FastAPI, MongoDB (motor), Pydantic, JWT
- **Frontend**: React, React Router, Tailwind CSS, Shadcn/UI, Axios
- **3rd Party**: Facebook Graph API (WhatsApp)

---

## What's Been Implemented

### Admin Panel (Complete)
- ✅ Login with JWT authentication
- ✅ Dashboard layout with sidebar navigation
- ✅ Route management (CRUD)
- ✅ Shop management (CRUD)
- ✅ Salesman management (CRUD)
- ✅ Supplier management (CRUD)
- ✅ Expense management (CRUD)
- ✅ Purchase management (CRUD)

### Reports (Complete)
- ✅ Initial Loading Report
- ✅ Transaction Report (with filters: Date, Salesman, Type, Payment, Route)
- ✅ Daily Submitted Report
- ✅ Daily Summary Page (with weighted average calculations)

### Salesman APIs (Complete)
- ✅ Salesman login (form-data)
- ✅ Salesman home API
- ✅ Initial load creation
- ✅ Sale creation with image upload
- ✅ Sale report submission
- ✅ Daily report submission with blocking logic

### Integrations
- ✅ WhatsApp integration (API returns 200 but delivery needs verification)

---

## Prioritized Backlog

### P0 - Critical (None currently)

### P1 - High Priority
- [ ] Debug WhatsApp message delivery issue
- [ ] Verify Daily Summary calculations accuracy

### P2 - Medium Priority
- [ ] Purchase Report page
- [ ] Profit Loss Report page
- [ ] Change Password functionality
- [ ] Config Settings page
- [ ] Current Active Balance page
- [ ] Submit Summary By Date page

### P3 - Low Priority / Refactoring
- [ ] Move WhatsApp API token to environment variable
- [ ] Standardize admin API responses to `{code, message, data}` format
- [ ] Add formal API authorization refinement
- [ ] Remove unused variables (getAuthHeaders, API) from refactored frontend files

---

## Recent Updates

### December 2025
- ✅ **Search Functionality Added** to all admin pages:
  - ShopPage (by name, phone, address, route)
  - RoutePage (by route name)
  - SupplierPage (by name)
  - PurchasePage (by supplier, payment mode)
  - ExpensePage (by description, category)
  - InitialLoadingReportPage (by salesman, phone, route)
  - TransactionReportPage (by shop, salesman, route)
  - PurchaseReportPage (by supplier, payment mode)
  - DailySubmittedReportPage (by salesman name)
  - DailySubmitHistoryPage (by date)

- ✅ **Export Feature**: Added PDF/Excel/Print export to multiple pages:
  - Transaction Report, Shop, Route, Purchase, Expense, Supplier, Salesman pages
  - Daily Summary Page (PDF/Print for single day summary)
  - Daily Submit History Page (Excel/PDF/Print for list + PDF/Print for individual summary in View Dialog)
- ✅ **Notification System**: WhatsApp/SMS notification settings page for admins
- ✅ **Credit Threshold**: Shop credit limits with highlighting in reports
- ✅ **Global 401 Handler**: Automatic logout on unauthorized API responses
- ✅ **Admin Report Submission**: Admins can submit reports for salesmen
- ✅ **Clear Data Feature**: Dashboard option to clear data from Routes, Shops, Admins, Salesmen, Suppliers, Purchases, Expenses, Daily Summary collections

---

## API Endpoints Summary

### Admin Auth
- `POST /api/auth/login` - Admin login

### Admin CRUD
- `/api/routes` - Routes CRUD
- `/api/shops` - Shops CRUD
- `/api/salesmen` - Salesmen CRUD
- `/api/suppliers` - Suppliers CRUD
- `/api/expenses` - Expenses CRUD
- `/api/purchases` - Purchases CRUD
- `/api/sales` - Sales (GET with filters: from_date, to_date, salesman_id, transaction_type, payment_type, route_id)

### Salesman APIs (form-data)
- `POST /api/auth/salesman/login` - Salesman login
- `GET /api/salesman/home` - Dashboard data
- `POST /api/salesman/initial-load` - Create initial load
- `POST /api/salesman/sales` - Create sale
- `POST /api/salesman/sale-report` - Submit daily report

### Reports
- `GET /api/initial-loads` - Initial loading report
- `GET /api/daily-summary` - Daily summary data
- `POST /api/sales/{sale_id}/send-whatsapp` - Resend WhatsApp

---

## Key Database Collections
- `users` - Admin users
- `salesmen` - Salesman records
- `routes` - Delivery routes
- `shops` - Customer shops
- `suppliers` - Egg suppliers
- `purchases` - Purchase transactions
- `sales` - Sale transactions
- `initial_loads` - Daily initial loads
- `expenses` - Expense records
- `sale_reports` - Daily submitted reports

---

## Test Credentials
- **Admin**: superadmin@gmail.com / LS@Super
- **Salesman**: Create via admin panel, use phone + 4-digit PIN

---

## Last Updated
February 2026 - Admin User Management & Role-Based Access Control

### February 2026 Updates (Latest)

#### Admin User Management
- ✅ **Create Admin Users**: Superadmin can create admin users (Name, Email, Phone, Password)
- ✅ **Edit Admin Users**: Update admin name, email, phone
- ✅ **Change Admin Password**: Superadmin can change any admin's password
- ✅ **Deactivate/Activate Admins**: Soft delete functionality for admin users
- ✅ **Admin Login**: Admin users can login with email + password

#### Role-Based Access Control
- ✅ **Admin Role Restrictions**: Admin users have READ-ONLY access:
  - No Add, Edit, Delete buttons visible on any page
  - Hidden menu items: Profit Loss Report, Daily Summary, Daily Summary History, Change Password, Current Active Balance, Config Setting
  - Admin menu item only visible to superadmin

- ✅ **Pages with Read-Only Mode for Admin**:
  - RoutePage
  - ShopPage
  - SalesmanPage
  - SupplierPage
  - PurchasePage
  - ExpensePage
  - TransactionReportPage

#### New API Endpoints
- `GET /api/admin-users` - List all admin users (superadmin only)
- `POST /api/admin-users` - Create admin user (superadmin only)
- `PUT /api/admin-users/{id}` - Update admin user (superadmin only)
- `POST /api/admin-users/{id}/change-password` - Change admin password (superadmin only)
- `POST /api/admin-users/{id}/activate` - Activate admin (superadmin only)
- `POST /api/admin-users/{id}/deactivate` - Deactivate admin (superadmin only)

#### UI Updates
- ✅ **Logo Update**: Changed to new Gowda Egg Distributors logo
- ✅ **Favicon Added**: Added favicon.ico to the app

### Previous February 2026 Updates
- ✅ **MongoDB Indexes**: Added indexes on frequently queried fields for performance:
  - `sales` collection: `sale_date`, `salesman_id`, `shop_id`, compound indexes
  - `purchases` collection: `purchase_date`, `supplier_id`
  - `initial_loads` collection: `load_date`, `salesman_id`
  - `sale_reports` collection: `report_date`, `salesman_id`
  - `expenses` collection: `expense_date`

- ✅ **Pagination on Transaction Report**: 
  - Added server-side pagination (default 50 records per page)
  - Page navigation controls (first, prev, page numbers, next, last)
  - Configurable page size (25, 50, 100, 200)
  - Shows "Showing X - Y of Z" indicator

- ✅ **Default Date Range**: Transaction Report now defaults to last 30 days instead of loading all records

### API Changes
- `GET /api/sales` now supports:
  - `page` (default: 1) - Page number
  - `limit` (default: 50, max: 200) - Records per page
  - Returns additional fields: `page`, `limit`, `total_pages`



### December 2025 (Latest Session)
- ✅ **Date Filter for Daily Summary History**: Added From/To date picker filter to Daily Summary History page
- ✅ **Admin Quick Links Update**: Hidden Daily Summary and Expense quick links on Dashboard for admin role  
- ✅ **New Menu Items**: Added Transportation Expense and Salary Expense placeholder menu items for superadmin (Coming Soon pages)
- ✅ **Backend API Update**: `/api/daily-summary/submitted` now supports optional `from_date` and `to_date` query parameters
- ✅ **Transaction Edit Cascade Feature**: When editing a transaction that isn't the last one for a shop:
  - Added "Preview Impact on Future Transactions" button in edit dialog
  - Shows all subsequent transactions that will be affected with before/after values
  - Automatically cascades updates to all affected transactions' `shop_previous_dues`, `total_amount`, `pending_amount`, and tray balances
  - New API endpoints: `GET /api/sales/{sale_id}/cascade-preview` and updated `PUT /api/sales/{sale_id}` with cascade logic
