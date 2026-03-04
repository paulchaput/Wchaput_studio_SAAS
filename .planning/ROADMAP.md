# Roadmap: W Chaput Studio — Project Management App

## Overview

Six phases deliver a complete internal management tool for W Chaput Studio. The sequence is dependency-driven: security infrastructure and schema decisions come first because they cannot be retrofitted, core project data comes second because every other feature attaches to it, then payments and suppliers, then the production checklist, then PDF generation, and finally the dashboard and accountant views that aggregate across all built entities. Nothing is built before its foundation is stable.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Fundacion** - Supabase schema, auth infrastructure, RLS, two-role login flow, and app shell layout
- [ ] **Phase 2: Proyectos y Partidas** - Project registry with 6-stage pipeline, line items with auto-calculated margins and totals
- [ ] **Phase 3: Pagos y Proveedores** - Client payment tracking, supplier directory, and supplier payment management
- [ ] **Phase 4: Checklist de Produccion** - 28-task production checklist seeded at project creation across 4 operational phases
- [ ] **Phase 5: Generacion de PDFs** - Client-facing quote PDF and admin-only purchase order PDF
- [ ] **Phase 6: Dashboard y Vista Contador** - Admin KPI dashboard with charts and read-only accountant financial view

## Phase Details

### Phase 1: Fundacion
**Goal**: Partners can securely log in with role-based access and see the app shell — the financial data infrastructure is correctly architected and cannot produce incorrect results
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, UX-03, UX-04
**Success Criteria** (what must be TRUE):
  1. Admin user can log in with email and password and the session persists across browser refresh and navigation
  2. Accountant user can log in and is immediately redirected to their accountant summary view — admin dashboard is inaccessible
  3. Unauthenticated users attempting to access any protected route are redirected to the login page
  4. The app renders with a dark sidebar navigation and white content area, using a monochrome palette, on both desktop and mobile
  5. The Supabase schema uses NUMERIC(12,2) columns for all money — no FLOAT or DECIMAL — and RLS policies are active on every table
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Supabase schema, migrations, RLS policies, profiles table with role trigger and get_user_role() helper
- [x] 01-02-PLAN.md — Next.js 15 app scaffold, Supabase client factories (getAll/setAll), middleware, route groups, Tailwind v4 + Shadcn Zinc theme, TypeScript types
- [ ] 01-03-PLAN.md — Login form + Server Action, role-based redirect, logout, AppSidebar + SidebarNav components, admin/accountant layout wiring

### Phase 2: Proyectos y Partidas
**Goal**: Partners can create projects, track them through the 6-stage pipeline, and build line-item quotes with auto-calculated margins, IVA, and totals — all displayed in Spanish with MXN formatting
**Depends on**: Phase 1
**Requirements**: PROJ-01, PROJ-02, PROJ-03, PROJ-04, PROJ-05, PROJ-06, PROJ-07, PART-01, PART-02, PART-03, PART-04, PART-05, PART-06, PART-07, PART-08, PART-09, UX-01, UX-02, UX-05
**Success Criteria** (what must be TRUE):
  1. Partner can create a project with all required fields (name, client, quote number, date, salesperson, estimated delivery, internal notes) and see it in the project list
  2. Partner can advance or revert a project's status through all 6 stages (Prospecto through Cerrado) from the project detail page
  3. Partner can add, edit, and delete line items — the sale price, IVA, subtotal, grand total, total cost, and gross profit all recalculate automatically on every change
  4. All currency values display as $#,##0.00 MXN and all dates display in DD/MMM/YYYY format throughout the UI
  5. The full app is usable on a 375px-wide mobile screen with Spanish UI labels on every field, status, and navigation element
**Plans**: TBD

Plans:
- [ ] 02-01: lib/calculations.ts and lib/formatters.ts — all financial formulas and MXN/date formatting as pure functions
- [ ] 02-02: Project list and create/edit flow — Server Components + Server Actions; 6-stage pipeline status
- [ ] 02-03: Project detail page with line item table — editable rows, auto-recalculating totals; mobile-responsive layout

### Phase 3: Pagos y Proveedores
**Goal**: Partners can track every peso paid to them by clients and every peso owed to and paid to suppliers — with running balances that are always formula-driven
**Depends on**: Phase 2
**Requirements**: PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, PROV-01, PROV-02, PROV-03, PROV-04
**Success Criteria** (what must be TRUE):
  1. Partner can register a client anticipo and saldo payment against a project — the per-project summary shows total collected, expected anticipo and saldo amounts, and outstanding balance
  2. Partner can register supplier payments against a project — the per-project supplier summary shows total owed (from line item costs), total paid, and outstanding balance
  3. Supplier directory lists Innovika and El Roble pre-seeded; partner can add new suppliers with contact details
  4. Supplier detail page shows all projects with line items from that supplier, total owed across all projects, total paid, and current outstanding balance — all calculated from live data, never manually entered
**Plans**: TBD

Plans:
- [ ] 03-01: Supplier directory — create, list, detail page with running balance (JOIN query, not per-row fetch)
- [ ] 03-02: Client payment forms — anticipo + saldo registration; per-project payment summary calculations
- [ ] 03-03: Supplier payment forms — per-project supplier payment registration; running balance view

### Phase 4: Checklist de Produccion
**Goal**: Every project automatically has a 28-task production checklist across 4 operational phases that the admin can track to completion
**Depends on**: Phase 2
**Requirements**: CHEC-01, CHEC-02, CHEC-03, CHEC-04, CHEC-05
**Success Criteria** (what must be TRUE):
  1. When a project is created, 28 tasks are automatically seeded across the 4 phases (Comercial 7, Diseno y Especificaciones 6, Produccion 9, Entrega y Cierre 8) — visible immediately on the project detail page
  2. Admin can update the status, assignee, and due date of any task; changes save immediately
  3. Checklist displays grouped by phase with a visual progress indicator per phase (e.g., 3/7 completed)
  4. The checklist section is not visible to accountant-role users
**Plans**: TBD

Plans:
- [ ] 04-01: Checklist schema, seeding on project creation, and RLS (admin-only)
- [ ] 04-02: ChecklistPanel client component — phase grouping, status toggle, assignee/due date editing, phase progress indicator

### Phase 5: Generacion de PDFs
**Goal**: Partners can download a client-facing quote PDF that never shows costs, and admin can generate a supplier purchase order PDF that shows supplier costs — both with W Chaput Studio branding
**Depends on**: Phase 3
**Requirements**: QUOT-01, QUOT-02, QUOT-03, QUOT-04, QUOT-05, OC-01, OC-02, OC-03
**Success Criteria** (what must be TRUE):
  1. Partner can download a quote PDF from the project detail page — it shows the W Chaput Studio logo, client info, line items with sale prices, subtotal, IVA 16%, grand total, payment schedule (70/30), and terms; it contains zero cost or margin figures
  2. The quote PDF has an editorial design: white background, minimal borders, monochrome palette, bottom-border-only rows — consistent with the W Chaput Studio brand identity
  3. Admin can generate a purchase order PDF for a specific supplier on a specific project — it shows only that supplier's line items with unit costs and totals
  4. Purchase order PDFs are inaccessible to accountant-role users; attempting to access the endpoint returns an authorization error
**Plans**: TBD

Plans:
- [ ] 05-01: Quote PDF — API route, CotizacionTemplate (React PDF), getProjectForQuote() query selecting zero cost columns; download button
- [ ] 05-02: Purchase order PDF — API route (admin-only), OrdenCompraTemplate, supplier-filtered line items with costs; download button

### Phase 6: Dashboard y Vista Contador
**Goal**: Admin sees the financial health of the entire business at a glance; the accountant sees cash flow and payment totals without ever seeing margins, costs, or profit
**Depends on**: Phase 3
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, CONT-01, CONT-02, CONT-03, CONT-04
**Success Criteria** (what must be TRUE):
  1. Admin dashboard shows KPI cards: active project count, total pipeline value (non-Cerrado projects), total pending client payments, total pending supplier payments
  2. Dashboard shows a project status pipeline summary (count per stage) and a supplier debt breakdown by Innovika, El Roble, and Others
  3. Dashboard shows a monthly revenue vs. cost vs. profit bar chart (Recharts) and a 30-day cash flow projection
  4. Accountant view shows project payment summaries (name, client, grand total, collected, outstanding) and supplier payment totals — no cost columns, no margin figures, no profit data
  5. Accountant view is fully read-only — no create, edit, or delete controls are rendered for accountant-role users
**Plans**: TBD

Plans:
- [ ] 06-01: Admin dashboard — KPI cards, pipeline summary, supplier debt breakdown; single aggregated JOIN query for all KPI data
- [ ] 06-02: Revenue/cost/profit chart and 30-day cash flow projection — Recharts with dynamic({ ssr: false })
- [ ] 06-03: Accountant views — /resumen and /flujo-efectivo pages; project_financials_accountant view; read-only enforcement

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

Note: Phases 3 and 4 both depend on Phase 2 and are independent of each other. Phase 5 depends on Phase 3 (supplier assignment on line items needed for POs). Phase 6 depends on Phase 3 (payments must exist to aggregate).

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Fundacion | 1/3 | In Progress|  |
| 2. Proyectos y Partidas | 0/3 | Not started | - |
| 3. Pagos y Proveedores | 0/3 | Not started | - |
| 4. Checklist de Produccion | 0/2 | Not started | - |
| 5. Generacion de PDFs | 0/2 | Not started | - |
| 6. Dashboard y Vista Contador | 0/3 | Not started | - |
