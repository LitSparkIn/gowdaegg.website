# Egg Distribution Management App - PRD

## Original Problem Statement
Build a comprehensive egg distribution management application with sales/expense tracking, user management, and reporting.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI + Recharts
- **Backend**: FastAPI + Pydantic + Motor (async MongoDB)
- **Database**: MongoDB
- **Pattern**: Modular service/repository pattern with RBAC

## What's Been Implemented

### Core Features
- Sales & transaction management with cascading edits
- Shop management (with profit margin, allow rate edit, credit threshold)
- Salesman management with tray balance tracking
- Route management
- Daily summaries with locked carryover rates
- Transportation & salary expense tracking
- WhatsApp notification integration
- Export (PDF, Excel, Print) across modules

### Admin Tools
- Recalculate Shop Dues (today's transactions)
- Full Edit for transactions (superadmin)
- Clear Today's Data
- Critical Section on Config Settings page
- Shop Details page with transaction history

### Recent (2026-03-20)
- **Replace Image**: Backend `PUT /api/sales/{sale_id}/replace-image` + Frontend dialog on Transaction Report page
- "All" pagination option on Transaction Report
- Hidden Recalculate button (per user request)

## Pending Issues
- P1: `/salesman/sale-report` API may fail without image (recurring, user verification pending)
- P2: Recharts rendering error on Route page (`ResponsiveContainer` parent dimensions)
- P3: Lint warning in `TransportationExpensePage.jsx` (missing useEffect dependency)

## Upcoming Tasks
- P1: Refactor Export Logic into reusable `useExport` hook
- P1: Refactor Read-Only Logic into centralized HOC/hook

## Backlog
- P2: History/details pages for Salary Setup & Salary Expense
- P2: Undo Recalculate feature (database-backed)
