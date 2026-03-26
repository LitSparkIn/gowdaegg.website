# Egg Distribution ERP - Product Requirements Document

## Original Problem Statement
Build an egg distribution management application that evolved into a comprehensive ERP system with sales/expense tracking, user management, daily financial snapshots, and reporting.

## Core Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI + Axios + jsPDF
- **Backend**: FastAPI + Pydantic + Motor (async MongoDB)
- **Pattern**: Service/Repository pattern with daily "snapshot" locking

## Completed Features
- Daily Summary with crate carryover, COGS, profit/loss, expense tracking
- Salesman management (active/exited), attendance tracking, automated salary credits
- Sale Reports with denominations and categorized expenses (Food, Diesel, Other)
- Daily Cash Summary with CRUD, denomination modal, daily snapshots
- Profit & Expense Summary with gross/net profit, expense breakdowns, date-range support, snapshots
- Salary History with month-wise attendance calendar, balance history, PDF statements
- Transportation Expense management
- Shop management with margin/rate editing
- Transaction Report with image replace
- Exited salesman logic (separated UI, auto-absent, login blocked)
- Tray Balance editing for salesmen
- Per Day Salary column and Days in Month card in Salary Setup

## Recently Completed (March 2026)
- Fixed COGS calculation in Profit & Expense Summary to match Daily Summary logic (uses yesterday's submitted summary for carryover)
- Added Damage Loss display on Profit & Expense Summary page (amber card, deducted from Net Profit)
- Frontend now uses backend-calculated `gross_profit` and `net_profit` directly

## Pending Issues
- P2: Recharts rendering error on Route Page (width/height -1)
- P3: React Hook useEffect missing dependencies in new pages

## Upcoming Tasks
- P1: Implement "Light Damage Summary" Page (currently Coming Soon placeholder)
- P1: Refactor export logic (jsPDF/Excel) into reusable hook
- P1: Refactor read-only logic into centralized HOC/hook

## Future/Backlog
- P2: Implement "Undo Recalculate" feature for transactions

## Key Technical Notes
- Snapshots lock end-of-day data to prevent historical changes
- Use "Rs. " not "₹" in jsPDF (symbol breaks standard fonts)
- Daily Summary submit auto-credits salary, saves cash + profit_expense snapshots
