# Requirements: W Chaput Studio — Project Management App

**Defined:** 2026-03-03
**Core Value:** Partners can see the financial health of every active project and the business as a whole, generate client-facing PDFs that never expose internal costs, and track every payment to and from every stakeholder.

## v1 Requirements

### Authentication & Roles (AUTH)

- [x] **AUTH-01**: User can log in with email and password (Supabase Auth)
- [x] **AUTH-02**: User session persists across browser refresh and page navigation
- [x] **AUTH-03**: Admin role has full access to all features, data, and financial details
- [x] **AUTH-04**: Accountant role has read-only access to cash flow and payment history — margins, supplier costs, and profit splits are never visible (enforced at DB level via RLS, not just UI)
- [x] **AUTH-05**: Unauthenticated users are redirected to login; role-based redirect sends admin to dashboard, accountant to their summary view

### Projects (PROJ)

- [x] **PROJ-01**: User can create a project with: name, client, quote number, date, salesperson, estimated delivery date, internal notes
- [x] **PROJ-02**: Each project has a status that follows the pipeline: Prospecto → Cotizado → Anticipo Recibido → En Producción → Entregado → Cerrado
- [x] **PROJ-03**: User can manually advance or revert a project's status
- [x] **PROJ-04**: User can view a list of all projects with their status, client, quote number, and financial summary (total sale value, collected, owed)
- [x] **PROJ-05**: User can view a project detail page showing all sections: line items, payments, checklist, and documents
- [x] **PROJ-06**: User can edit any project field at any time
- [x] **PROJ-07**: Dates are displayed in DD/MMM/YYYY format throughout

### Partidas / Line Items (PART)

- [x] **PART-01**: User can add a line item to a project with: description, reference, dimensions, quantity, supplier (from supplier directory), unit cost (costo proveedor)
- [x] **PART-02**: Each line item has a margin % that defaults to 50% and is editable per line
- [x] **PART-03**: Sale price per unit is auto-calculated from cost and margin: `precio_venta = costo / (1 - margen)`
- [x] **PART-04**: Line item total (sale) is auto-calculated: `total_venta = precio_venta × cantidad`
- [x] **PART-05**: Line item total (cost) is auto-calculated: `total_costo = costo × cantidad`
- [x] **PART-06**: Project totals auto-calculate from line items: subtotal (sum of sale totals), IVA (16%), grand total
- [x] **PART-07**: Project cost and profit auto-calculate: total cost (sum of cost totals), gross profit (subtotal − total cost)
- [x] **PART-08**: User can edit or delete any line item; all totals recalculate immediately
- [x] **PART-09**: All currency displayed as $#,##0.00 MXN throughout

### Cotización PDF (QUOT)

- [ ] **QUOT-01**: User can generate a PDF quote (cotización) from a project's line items
- [ ] **QUOT-02**: The PDF shows: W Chaput Studio logo (top-right), large "COTIZACIÓN" heading, client info (name, quote number, date), line items table (description, quantity, unit price, total), subtotal, IVA 16%, grand total, payment schedule (70% anticipo / 30% saldo), terms and conditions
- [ ] **QUOT-03**: The PDF never shows: supplier costs, margins, internal notes, profit figures, or any field prefixed "costo" or "margen"
- [ ] **QUOT-04**: The PDF design is clean and editorial: white background, minimal borders, monochrome palette, bottom-border-only on line item rows
- [ ] **QUOT-05**: User can download the PDF from the project detail page

### Seguimiento de Pagos (PAY)

- [ ] **PAY-01**: User can register a client payment with: amount, date, type (anticipo or saldo), notes
- [ ] **PAY-02**: Per-project client payment summary auto-calculates: total collected, anticipo expected (70% of grand total), saldo expected (30%), outstanding balance
- [ ] **PAY-03**: User can register a supplier payment for a line item or for a supplier within a project, with: amount, date, notes
- [ ] **PAY-04**: Per-project supplier summary auto-calculates: total owed to suppliers (sum of line item costs), total paid to suppliers, outstanding supplier balance
- [ ] **PAY-05**: All payment amounts stored and displayed in MXN; no floating-point arithmetic (NUMERIC columns in DB)

### Proveedores / Suppliers (PROV)

- [x] **PROV-01**: User can create and manage a supplier directory with: name, contact name, phone, email, notes
- [x] **PROV-02**: Default suppliers Innovika and El Roble are pre-seeded
- [x] **PROV-03**: User can view a supplier detail page showing: all projects with line items from that supplier, total owed across all projects, total paid, outstanding balance
- [x] **PROV-04**: Supplier balance is always formula-driven (sum of costs across projects minus payments), never manually entered

### Checklist de Proyecto (CHEC)

- [ ] **CHEC-01**: When a project is created, 28 checklist tasks are automatically seeded across 4 phases: Comercial (7), Diseño y Especificaciones (6), Producción (9), Entrega y Cierre (8)
- [ ] **CHEC-02**: Each task has: phase, name, assignee (text field), due date, status (Pendiente / En Proceso / Completado / Bloqueado / N/A)
- [ ] **CHEC-03**: User can update the status, assignee, and due date of any task
- [ ] **CHEC-04**: Checklist displays grouped by phase with visual progress per phase
- [ ] **CHEC-05**: Checklist is visible only to admin role (not accountant)

### Órdenes de Compra (OC)

- [ ] **OC-01**: User can generate a Purchase Order (orden de compra) PDF for a specific supplier on a specific project
- [ ] **OC-02**: The PO PDF shows: W Chaput Studio header, supplier name and contact, project name, line items filtered to that supplier (description, quantity, unit cost, total cost)
- [ ] **OC-03**: Purchase Order PDFs are accessible only to admin role; they contain supplier costs and are never client-facing

### Dashboard Principal (DASH)

- [ ] **DASH-01**: Admin dashboard shows KPI cards: number of active projects, total pipeline value (sum of grand totals for non-Cerrado projects), total pending client payments, total pending supplier payments
- [ ] **DASH-02**: Dashboard shows a project status pipeline summary (count per status stage)
- [ ] **DASH-03**: Dashboard shows a supplier debt breakdown: amount owed to Innovika, El Roble, and Others across all active projects
- [ ] **DASH-04**: Dashboard shows a monthly revenue vs. cost vs. profit bar chart (Recharts)
- [ ] **DASH-05**: Dashboard shows a 30-day cash flow projection: confirmed incoming client payments vs. scheduled supplier payments

### Vista Contador (CONT)

- [ ] **CONT-01**: Accountant view shows project payment summaries: project name, client, grand total, collected, outstanding — no costs or margins
- [ ] **CONT-02**: Accountant view shows supplier payment totals across all projects: total owed, total paid, outstanding — based on payment records only, not on cost columns from line items
- [ ] **CONT-03**: Accountant view shows cash flow: list of all client payments received and supplier payments made, with dates and amounts
- [ ] **CONT-04**: Accountant view is read-only — no create, edit, or delete actions

### UX & Platform (UX)

- [x] **UX-01**: All UI labels, field names, status values, and navigation are in Spanish
- [x] **UX-02**: App is fully responsive and usable on mobile (minimum 375px width)
- [x] **UX-03**: Layout uses a dark sidebar for navigation and white content areas
- [x] **UX-04**: Palette is monochrome with subtle grays; no color accent beyond black/white/gray
- [x] **UX-05**: Every financial calculation is formula-driven — no hardcoded values anywhere in the codebase

## v2 Requirements

### Reportes

- **REP-01**: CSV/Excel export for accountant (cash flow, payment history)
- **REP-02**: Profit split summary card per partner (Paul 50% / Chris 50%)
- **REP-03**: Per-project timeline / Gantt view

### Notificaciones

- **NOTF-01**: Email delivery of PDF quotes and purchase orders directly from the app
- **NOTF-02**: Reminder alerts for overdue checklist tasks

### Integraciones

- **INT-01**: Additional user roles (production manager, estimator) if team grows

## Out of Scope

| Feature | Reason |
|---------|--------|
| Portal para clientes | Luxury clients expect personal communication, not a self-serve portal; adds auth complexity |
| Facturación CFDI | Different legal/technical domain; accountant handles fiscal invoices separately |
| Inventario / stock | Materials are project-specific, not warehouse stock |
| Control de tiempo / hora | Studio bills by project scope, not hourly |
| Colaboración en tiempo real | 2-person team; last-write-wins is sufficient; adds WebSocket complexity |
| App móvil nativa | Web is fully responsive; native app deferred to v2+ |
| Multi-moneda | MXN only; no USD or international billing in scope |
| Multi-empresa | Single studio; no multi-tenant architecture needed |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete (01-02) |
| AUTH-03 | Phase 1 | Complete (01-01) |
| AUTH-04 | Phase 1 | Complete (01-01) |
| AUTH-05 | Phase 1 | Complete (01-02) |
| UX-03 | Phase 1 | Complete (01-02) |
| UX-04 | Phase 1 | Complete (01-02) |
| PROJ-01 | Phase 2 | Complete |
| PROJ-02 | Phase 2 | Complete |
| PROJ-03 | Phase 2 | Complete |
| PROJ-04 | Phase 2 | Complete |
| PROJ-05 | Phase 2 | Complete |
| PROJ-06 | Phase 2 | Complete |
| PROJ-07 | Phase 2 | Complete |
| PART-01 | Phase 2 | Complete |
| PART-02 | Phase 2 | Complete |
| PART-03 | Phase 2 | Complete |
| PART-04 | Phase 2 | Complete |
| PART-05 | Phase 2 | Complete |
| PART-06 | Phase 2 | Complete |
| PART-07 | Phase 2 | Complete |
| PART-08 | Phase 2 | Complete |
| PART-09 | Phase 2 | Complete |
| UX-01 | Phase 2 | Complete |
| UX-02 | Phase 2 | Complete |
| UX-05 | Phase 2 | Complete |
| PAY-01 | Phase 3 | Pending |
| PAY-02 | Phase 3 | Pending |
| PAY-03 | Phase 3 | Pending |
| PAY-04 | Phase 3 | Pending |
| PAY-05 | Phase 3 | Pending |
| PROV-01 | Phase 3 | Complete |
| PROV-02 | Phase 3 | Complete |
| PROV-03 | Phase 3 | Complete |
| PROV-04 | Phase 3 | Complete |
| CHEC-01 | Phase 4 | Pending |
| CHEC-02 | Phase 4 | Pending |
| CHEC-03 | Phase 4 | Pending |
| CHEC-04 | Phase 4 | Pending |
| CHEC-05 | Phase 4 | Pending |
| QUOT-01 | Phase 5 | Pending |
| QUOT-02 | Phase 5 | Pending |
| QUOT-03 | Phase 5 | Pending |
| QUOT-04 | Phase 5 | Pending |
| QUOT-05 | Phase 5 | Pending |
| OC-01 | Phase 5 | Pending |
| OC-02 | Phase 5 | Pending |
| OC-03 | Phase 5 | Pending |
| DASH-01 | Phase 6 | Pending |
| DASH-02 | Phase 6 | Pending |
| DASH-03 | Phase 6 | Pending |
| DASH-04 | Phase 6 | Pending |
| DASH-05 | Phase 6 | Pending |
| CONT-01 | Phase 6 | Pending |
| CONT-02 | Phase 6 | Pending |
| CONT-03 | Phase 6 | Pending |
| CONT-04 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 57 total
- Mapped to phases: 57
- Unmapped: 0 ✓

**Phase distribution:**
- Phase 1 (Fundacion): AUTH-01–05, UX-03, UX-04 = 7 requirements
- Phase 2 (Proyectos y Partidas): PROJ-01–07, PART-01–09, UX-01, UX-02, UX-05 = 19 requirements
- Phase 3 (Pagos y Proveedores): PAY-01–05, PROV-01–04 = 9 requirements
- Phase 4 (Checklist de Produccion): CHEC-01–05 = 5 requirements
- Phase 5 (Generacion de PDFs): QUOT-01–05, OC-01–03 = 8 requirements
- Phase 6 (Dashboard y Vista Contador): DASH-01–05, CONT-01–04 = 9 requirements

---
*Requirements defined: 2026-03-03*
*Last updated: 2026-03-04 after 01-02 completion — AUTH-02, AUTH-03, AUTH-05, UX-03, UX-04 marked complete*
