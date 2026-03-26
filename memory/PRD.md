# MRB Listing Platform - PRD

## Problem Statement
B2B RFQ platform for scaffolding industry with 3 roles: Buyer (no login), Supplier (login required), Admin. Lead verification and distribution system with supplier performance tracking.

## Architecture
- **Frontend**: React + Tailwind + Shadcn UI (Swiss Brutalist design)
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Auth**: JWT-based (admin + supplier)
- **Notifications**: Mock (email + WhatsApp logged)

## User Personas
1. **Buyer**: Posts scaffolding requirements (no login required)
2. **Supplier**: Receives leads, manages pipeline, sends quotations
3. **Admin**: Verifies leads, assigns to suppliers, manages catalog

## Core Requirements
- Cart-style RFQ form with multi-product selection
- Lead verification (Verified/Not Reachable/Fake)
- Lead distribution to 5-7 suppliers (city match + performance)
- Supplier lead pipeline (New → Contacted → Quotation Sent → Won → Lost)
- Badge system (First Responder, Top Supplier)
- 48-hour lead expiry with auto-reassignment
- Repeat buyer tracking
- Service providers CRUD (Labor/Transport)
- Admin dashboard with metrics

## What's Been Implemented (March 2026)
- [x] Full backend API (21 endpoints, 100% tested)
- [x] Buyer RFQ form with product catalog (12 seeded products)
- [x] JWT authentication for Supplier/Admin
- [x] Admin dashboard with 5 tabs (Overview, Leads, Suppliers, Products, Services)
- [x] Lead verification and assignment workflow
- [x] Supplier dashboard with lead pipeline and badges
- [x] Response time tracking (open time, contact time)
- [x] Lead expiry background job (48-hour check)
- [x] Service providers CRUD
- [x] Repeat buyer detection
- [x] Mock notifications system
- [x] Cities list (25 Indian cities)
- [x] Performance score calculation

## Prioritized Backlog
### P0 (Critical)
- All core features implemented ✅

### P1 (Important)
- OTP-based login for suppliers
- External lead source integration (IndiaMART, Justdial, Facebook, Google APIs)
- Real email/WhatsApp notification integration

### P2 (Nice to Have)
- Lead credits system
- Subscription plans for suppliers
- Advanced supplier search/filter
- Export leads to CSV
- Supplier profile editing from dashboard
- Mobile-optimized PWA

## Next Tasks
1. Integrate real notification service (SendGrid/WhatsApp API)
2. Build external lead ingestion endpoints (IndiaMART, Justdial)
3. Add lead credits + subscription billing
4. Enhanced supplier profile management
