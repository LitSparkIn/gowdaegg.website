# Gowda Egg Distributors - Sales Dashboard PRD

## Original Problem Statement
Build a sales dashboard for "Gowda Egg Distributors" with greenish theme and "Lexend Deca" font. The application manages the entire sales and purchasing lifecycle including admin panel, salesman mobile APIs, and comprehensive reporting.

## User Personas
- **Super Admin**: Full access to manage routes, shops, salesmen, suppliers, purchases, expenses, and all reports
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

- ✅ **Export Feature**: Added PDF/Excel export to transaction report page
- ✅ **Notification System**: WhatsApp/SMS notification settings page for admins
- ✅ **Credit Threshold**: Shop credit limits with highlighting in reports
- ✅ **Global 401 Handler**: Automatic logout on unauthorized API responses
- ✅ **Admin Report Submission**: Admins can submit reports for salesmen

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
December 2025 - Completed search functionality on all admin pages
