# Feature Research

**Domain:** Custom fabrication studio project management & quoting (kitchens, furniture, cabinetry — made-to-order / job shop)
**Researched:** 2026-03-03
**Confidence:** MEDIUM (web access unavailable; synthesis from domain knowledge of fabrication PM tools + validated business requirements from PROJECT.md; web verification blocked during this session)

---

## Note on Research Method

WebSearch and WebFetch were unavailable during this research session. Findings are synthesized from:
- Validated requirements in PROJECT.md (HIGH confidence — owner-confirmed)
- Domain knowledge of fabrication PM software category: Jobber, Buildertrend, CoConstruct, Houzz Pro, Cabinet Vision, KCD Software, Mozaik, Prodboard, and generic job-shop tools (MEDIUM confidence — well-established patterns in a mature category)
- General SaaS quoting/invoicing patterns (HIGH confidence)

Competitor feature claims are not URL-verified. Flag LOW confidence items before building.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that any project management tool for a fabrication studio must have. Missing these means the tool is not usable as a primary system of record.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Project registry with status pipeline | Without a list of active projects and their stage, nothing else works; every PM tool in this category has this | LOW | W Chaput has 6 stages: Prospecto → Cotizado → Anticipo Recibido → En Producción → Entregado → Cerrado. Enum column in DB, filtered views per stage. |
| Line-item quoting with cost + sale price | Fabrication is project-by-project; users quote before they commit; job costing is the entire business model | MEDIUM | Each line item (partida) stores supplier cost + margin % → computed sale price. 50% default margin editable per line item. IVA 16% applied at quote total. |
| Client-facing PDF quote generation | Clients receive paper/PDF quotes; they never log in; this is how the business communicates price | HIGH | PDF must hide all internal costs, show only line item descriptions, quantities, unit sale price, subtotal, IVA, total. React PDF server-side. Editorial design. |
| Payment status per project | Partners need to know if deposit has been received before starting production; if final payment received before delivering | LOW | Two payment events: deposit (anticipo, ~70%) and final (saldo, ~30%). Boolean flags or dated payment records. |
| Project totals: revenue, cost, profit | Partners need to know if a project is profitable and how much; this is the primary financial visibility need | LOW | Auto-computed from line items: total costo, total venta, margen bruto. Never shown in client-facing outputs. |
| Supplier directory | Every fabrication studio has 2-10 active suppliers; need contact info and balance tracking at minimum | LOW | W Chaput uses Innovika and El Roble primarily. Directory with name, contact, payment history, running balance. |
| Authentication and role separation | Two people + external accountant; roles determine what financial data is visible | MEDIUM | Supabase Auth. Admin: full access. Accountant: read-only, no margins or costs. Row-level security or column-level data filtering. |
| Mobile-responsive UI | Owner checks project status from phone; this is stated explicitly as a constraint | MEDIUM | All dashboard and project views must be usable on 375px viewport. Not a mobile app — just responsive web. |
| Project checklist / task workflow | Made-to-order fabrication has a fixed production sequence; tasks must be trackable per phase | MEDIUM | 28 tasks across 4 phases: Commercial, Design & Specs, Production, Delivery & Close. Per-project task completion state stored in DB. |
| Supplier payment tracking | Partners owe suppliers money; tracking what has been paid vs what is outstanding is critical for cash flow | MEDIUM | Per supplier per project: how much owed, when paid, running balance. Distinct from client payment tracking. |

### Differentiators (Competitive Advantage)

These are features that go beyond what generic PM tools provide and are specifically valuable for a high-end custom fabrication studio. Not all competitors have these. This is where W Chaput's tool earns its keep.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Margin-protected financial visibility by role | Partners see full cost/margin/profit data; accountant sees only cash flows and balances — no margin data ever | MEDIUM | This is a deliberate business separation (accountant does not need to know markup strategy). Implement via RLS in Supabase and UI-level column suppression. Not just auth — must be enforced at data layer. |
| Auto-calculated margin + sale price from cost input | Partners enter supplier cost → margin auto-applies → sale price computed; removes manual calculation errors | LOW | Formula: sale_price = cost / (1 - margin%). Default margin 50%. Editable per line item. A subtle UX detail that saves daily friction. |
| Purchase order generator per supplier per project | Auto-filters a project's line items by supplier → generates a supplier-facing PO PDF | HIGH | PO shows what to supply and at what cost to supplier (not client sale price). Avoids manual re-entry. Requires supplier field on each line item. |
| Master dashboard with business-wide KPIs | At-a-glance revenue pipeline, outstanding payments, upcoming cash flow events — not per-project but across all projects | MEDIUM | KPI cards: active projects, total pipeline value, total pending client payments, total pending supplier payments. Chart: revenue vs cost vs profit rolling 30/90 days. |
| 30-day cash flow projection | Knowing what payments are expected and owed in the near term helps partners manage working capital | MEDIUM | Based on project status + expected delivery dates: what client payments are incoming (deposit not yet received, final not yet received) vs supplier payments outstanding. |
| Profit split reporting (50/50) | Two-partner studio needs to see what each partner earns; the split is 50/50 but the visibility is valuable | LOW | Simple: total project profit / 2. Can be a dashboard card. No complex equity accounting needed. |
| Per-project supplier debt view | For each project, what is owed to which supplier? This prevents late payments and lost supplier relationships | LOW | Join on line items + supplier payments. Shows: total owed to Innovika for Project X, amount paid, amount outstanding. |
| Editorial-quality PDF design | Clients are high-end kitchen/furniture buyers; a polished quote PDF builds trust and reinforces brand | HIGH | Not just data export — the PDF is a sales document. W Chaput's brand identity: clean, minimal, editorial. The W geometric logo. React PDF with custom layout templates. |
| IVA handling baked into quote | Mexican fiscal context: all prices shown with IVA breakdown; clients expect IVA-compliant quotes | LOW | IVA = 16%. Subtotal + IVA line + Total. Store pre-IVA prices internally; compute IVA at quote render time. |
| Spanish UI throughout | Partners and suppliers operate in Spanish; forcing English UI creates friction | LOW | All labels, statuses, error messages, PDF content in Spanish. MXN currency formatting. DD/MMM/YYYY dates (e.g., 03/Mar/2026). |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem like good ideas but would create scope creep, maintenance burden, or architectural complexity that outweighs their value for a 2-person studio with 4-8 concurrent projects.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Client-facing portal / login | "Clients could check their project status themselves" | Adds authentication surface, client management, notification systems, and security complexity. Clients of a high-end custom studio expect personal communication, not a portal. This doubles the auth model. | Continue sending PDFs and WhatsApp updates. Keep client interaction personal — that's part of the luxury positioning. |
| Real-time collaboration / WebSockets | "Two partners editing simultaneously" | For 2 people working on 4-8 projects, real-time conflict resolution adds significant architectural complexity (operational transforms or CRDTs) for near-zero practical benefit. Optimistic locking with last-write-wins is sufficient. | Use standard Next.js Server Actions with toast notifications on save. For true conflict, a timestamp-based "last updated" check is enough. |
| Inventory / stock management | "We buy materials and track them" | Full inventory tracking with stock levels, reorder points, stock adjustments, and FIFO costing is a separate domain. For a job shop, materials are project-specific, not stock items. | Track materials at the line-item level within each project. Supplier purchase orders already capture what was ordered per project. |
| Multi-currency support | "Suppliers might invoice in USD" | Adds currency conversion rates, date-of-conversion tracking, and reporting complexity. No functional need stated. | Lock to MXN. If a USD invoice appears, convert at time of entry and store in MXN. |
| Time tracking / hourly billing | "We spend hours on design" | W Chaput bills by project scope, not by hour. Time tracking adds a separate workflow (clocking in/out) that partners won't maintain. | Include design/installation labor as a line item in the quote with a fixed price. No timesheet needed. |
| Payroll / HR features | "We pay people" | Completely different domain. No sub-contractors mentioned in scope. | Out of scope — use dedicated payroll tool if needed in future. |
| Full accounting / double-entry bookkeeping | "The accountant needs this" | The accountant role in this system is READ-ONLY for cash flow monitoring, not for journal entries. Full double-entry accounting is a separate tool (e.g., Contpaqi, CONTPAQi, QuickBooks). | Export data to CSV for accountant. The accountant role gives visibility without replacing an accounting system. |
| Client e-signature on quotes | "Digital approval workflow" | Adds legal liability, e-signature vendor integration (Docusign, Hellosign), and quote-locking workflow. High-end custom studios close deals by phone/email with PDFs as supporting docs. | Client approves via WhatsApp/email. Partners mark project as "Cotizado → Anticipo Recibido" upon deposit receipt. The deposit itself is the approval. |
| Automated invoice generation / CFDI | "Tax compliance for Mexico" | CFDI (Mexican digital invoice) generation requires SAT certification, digital stamp (PAC), and legal compliance. Completely different scope. | The accountant handles CFDI using a certified tool. This app generates internal quotes and POs, not fiscal invoices. Document this boundary clearly. |
| Gantt chart / scheduling | "When will each project finish?" | For 4-8 custom projects with bespoke supplier timelines, Gantt charts are hard to maintain accurately and add PM burden. The production checklist already captures phases. | Use the 28-task checklist to track phase progress. Partners know their own schedules without a Gantt. |
| Mobile app (native iOS/Android) | "Easier on phone" | Native app requires separate build pipeline, App Store deployment, push notification infrastructure. Paul's use case is checking status on phone, which responsive web handles. | Fully responsive web app. PWA if needed later. |

---

## Feature Dependencies

```
[Project Registry]
    └──required by──> [Line-Item Quoting]
                          └──required by──> [PDF Quote Generator]
                          └──required by──> [Project Totals: cost/revenue/profit]
                          └──required by──> [Purchase Order Generator]
                                                └──requires──> [Supplier Directory]

[Supplier Directory]
    └──required by──> [Supplier Payment Tracking]
    └──required by──> [Per-Project Supplier Debt View]
    └──required by──> [Purchase Order Generator]

[Authentication + Roles]
    └──required by──> [Margin-Protected Financial Visibility]
    └──gates──> [Master Dashboard] (admins see full data, accountant sees filtered)

[Payment Tracking: Client]
    └──enhances──> [30-Day Cash Flow Projection]

[Supplier Payment Tracking]
    └──enhances──> [30-Day Cash Flow Projection]

[Project Checklist]
    └──requires──> [Project Registry] (checklist is per-project)

[IVA Handling]
    └──required by──> [PDF Quote Generator] (legal compliance)
    └──enhances──> [Project Totals]

[Profit Split Reporting]
    └──requires──> [Project Totals: revenue/cost/profit]
```

### Dependency Notes

- **Line-Item Quoting requires Project Registry:** You cannot quote without a project to attach the quote to. Projects must exist first.
- **PDF Quote Generator requires Line-Item Quoting:** The PDF renders line items. No line items = no quote to generate.
- **Purchase Order Generator requires Supplier Directory:** Each line item must be assigned to a supplier. The supplier directory must exist before POs can be generated.
- **Margin-Protected Visibility requires Authentication + Roles:** Role enforcement is the mechanism. Must implement auth before enforcing column/row visibility rules.
- **30-Day Cash Flow requires both payment tracking flows:** Cash flow projection is only meaningful when both incoming (client) and outgoing (supplier) payment states are tracked.
- **Checklist requires Project Registry:** Checklists are per-project instances — the project must exist before its checklist can be tracked.

---

## MVP Definition

### Launch With (v1)

Minimum viable product for W Chaput Studio to retire their current spreadsheet/manual process. Every feature below is in PROJECT.md as a validated requirement.

- [ ] **Project registry with 6-stage pipeline** — Core system of record; without this nothing else anchors
- [ ] **Line-item quoting with cost/margin/price auto-calculation** — The daily work: entering a project's scope and pricing it
- [ ] **PDF quote generator (client-facing, no costs)** — The primary client deliverable; immediate business value
- [ ] **Client payment tracking (deposit + final)** — Partners need to know if anticipo has been received before starting production
- [ ] **Supplier directory with payment tracking** — Supplier debt visibility prevents missed payments
- [ ] **Per-project supplier balance view** — Which suppliers are owed what, per project
- [ ] **Master dashboard with KPI cards** — Business health at a glance; the "homepage" value prop
- [ ] **Project checklist (28 tasks, 4 phases)** — Production workflow tracking, prevents missed steps
- [ ] **Purchase order generator (per supplier per project)** — Eliminates manual PO creation; high ROI for daily use
- [ ] **Authentication: admin + accountant roles** — Required before accountant can be given access
- [ ] **Accountant role: read-only cash flow view, no margins** — Hard business requirement
- [ ] **Mobile-responsive UI** — Paul checks from phone; non-negotiable
- [ ] **Spanish UI + MXN currency + DD/MMM/YYYY dates** — The studio operates in Mexico

### Add After Validation (v1.x)

Features to add once v1 is running and the team has identified real pain points.

- [ ] **30-day cash flow projection** — Requires 2-3 months of payment data to be meaningful; add once historical data accumulates
- [ ] **Profit split dashboard card (50/50)** — Low effort, but requires validated profit data first; confirm calculation with partners
- [ ] **Revenue/cost/profit chart (Recharts)** — Dashboard enhancement; needs data history to be useful; add in v1.x
- [ ] **Pipeline value summary** — Total MXN value of all active projects by stage; useful once pipeline has multiple concurrent projects

### Future Consideration (v2+)

Features to defer until the tool has proven its value and the studio has grown.

- [ ] **Additional user roles (e.g., production manager, estimator)** — Only needed if team grows beyond 2 partners + 1 accountant
- [ ] **CSV/Excel export for accountant** — Useful if accountant wants raw data; defer until accountant requests it
- [ ] **Email delivery of quotes directly from app** — Low friction for partners, but adds email service dependency; PDF download and manual send works for v1
- [ ] **Recurring supplier contacts / preferred supplier per item type** — Useful at higher volume; not needed for 2 primary suppliers
- [ ] **Project photo attachments** — Design studios collect reference photos, render images; add only if partners request it for record-keeping

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Project registry + pipeline | HIGH | LOW | P1 |
| Line-item quoting with auto-margin | HIGH | MEDIUM | P1 |
| PDF quote generator | HIGH | HIGH | P1 |
| Client payment tracking (deposit/final) | HIGH | LOW | P1 |
| Authentication + roles | HIGH | MEDIUM | P1 |
| Accountant role: no margins | HIGH | MEDIUM | P1 |
| Supplier directory | HIGH | LOW | P1 |
| Supplier payment tracking | HIGH | MEDIUM | P1 |
| Project checklist (28 tasks) | HIGH | MEDIUM | P1 |
| Purchase order generator | HIGH | HIGH | P1 |
| Mobile-responsive UI | HIGH | MEDIUM | P1 |
| Spanish UI + MXN + date format | HIGH | LOW | P1 |
| Master dashboard KPI cards | HIGH | MEDIUM | P1 |
| IVA calculation | HIGH | LOW | P1 |
| Revenue/cost/profit chart (Recharts) | MEDIUM | MEDIUM | P2 |
| 30-day cash flow projection | MEDIUM | MEDIUM | P2 |
| Profit split reporting (50/50) | MEDIUM | LOW | P2 |
| Pipeline value by stage | MEDIUM | LOW | P2 |
| Per-project supplier debt view | HIGH | LOW | P1 |
| Editorial-quality PDF design | HIGH | HIGH | P1 |

**Priority key:**
- P1: Must have for launch — tool is not usable without this
- P2: Should have — add in v1.x when core is stable
- P3: Nice to have — future consideration

---

## Competitor Feature Analysis

Note: Web access was blocked during this research. The following is based on domain knowledge of the fabrication PM software category (MEDIUM confidence). Verify against current competitor feature sets if needed.

| Feature | Jobber / generic field service PM | CoConstruct / Buildertrend (construction) | Cabinet Vision / KCD (cabinet-specific) | W Chaput Approach |
|---------|-----------------------------------|-------------------------------------------|-----------------------------------------|-------------------|
| Job costing (cost vs sale price) | Yes, but client-visible by default | Yes, with markup tools | Yes, built into cut list | Per-line-item, never client-visible |
| PDF quote/proposal generation | Yes, template-based | Yes, with client portal option | Yes, but design-focused not business | Editorial design, fully branded, no cost data |
| Client portal | Yes (table stakes for them) | Yes (core feature) | No | Deliberately NOT built — PDFs only |
| Payment deposit + final tracking | Yes | Yes | No (CAD tool, not PM) | Yes, per project, explicit deposit + saldo |
| Role-based financial hiding | Partial (some tools) | Partial | No | Hard requirement — enforced at DB layer |
| Supplier payment tracking | No (client-focused tools) | Partial | No | Full supplier balance per project |
| Fabrication-phase task checklist | Generic tasks only | Generic tasks / phase templates | No | 28 fixed tasks across 4 fabrication phases |
| Purchase order generation | Generic PO tools | Yes | No | Auto-filtered by supplier from line items |
| Mobile-responsive | Yes | Yes | No (desktop CAD) | Yes — required |
| Spanish / MXN localization | No (English-first) | No (English-first) | No | Native Spanish UI, MXN, Mexican date format |

**Key insight (MEDIUM confidence):** No single competitor tool in this category handles the combination of (1) margin-hiding from clients AND role-based margin-hiding from accountants, (2) supplier-level payment tracking per project, and (3) fabrication-phase task management. Generic field service tools handle client-facing quoting well but not supplier-side cost isolation. Cabinet software handles CNC and cut lists but not business financials. The W Chaput app fills a specific gap for a high-end, financially-aware fabrication studio.

---

## Domain-Specific Patterns for Custom Fabrication Studios

These are patterns observed across the job shop / made-to-order manufacturing category (MEDIUM confidence — domain knowledge, not verified via current web sources):

### Quote Structure Pattern
Custom fabrication studios universally organize quotes as line items (partidas) rather than by phase or deliverable. Each line item represents a discrete component or work package (e.g., "Armario superior cocina 90cm x 70cm — melamina blanca"). The line item is the unit of cost, pricing, and supplier assignment.

Pattern: `line_item { description, quantity, unit, supplier_cost, margin_pct, unit_sale_price, total_sale_price, supplier_id }`

### Payment Structure Pattern
Made-to-order fabrication universally uses a deposit-at-start / balance-at-delivery model because:
- Suppliers must be paid before materials are ordered
- Work begins only after deposit secures commitment
- Final payment before delivery protects the studio from abandonment

Standard Mexico/Latin America split: 70% deposit (anticipo) + 30% on delivery (saldo). W Chaput's structure matches this exactly.

### Phase-Gate Production Pattern
Fabrication projects follow a strict sequential phase structure where each phase has exit criteria (checklist items) before the next phase begins:
1. Commercial (signed/accepted quote, deposit received)
2. Design & Technical Specs (drawings approved, materials specified)
3. Production (manufacturing complete, QC passed)
4. Delivery & Close (installed, final payment received, project closed)

Skipping phases causes delivery failures. The 28-task checklist enforces these gates.

### Margin Separation Pattern
In custom fabrication, the client price is always higher than supplier cost. The studio's margin is proprietary. Client-facing documents show sale prices; internal documents show costs. This separation must be enforced in the data model — not just the UI — because PDFs are generated programmatically and must never accidentally include cost fields.

Pattern: Two document types —
- Quote PDF: `{ description, quantity, unit_sale_price, subtotal, IVA, total }` — NO cost fields
- Purchase Order: `{ description, quantity, unit_cost, supplier_total }` — NO sale price fields

### Supplier Debt Lifecycle Pattern
The supplier relationship creates a parallel payment lifecycle:
1. Quote accepted → materials needed → supplier order placed
2. Supplier invoices studio → studio owes supplier
3. Studio pays supplier (may be partial or milestone-based)
4. Project delivered → supplier balance cleared

Tracking supplier debt per project prevents cash flow surprises and maintains supplier relationships.

---

## Sources

- PROJECT.md — W Chaput Studio validated requirements (HIGH confidence — owner-confirmed)
- Domain knowledge: Jobber, CoConstruct/Buildertrend, Cabinet Vision, KCD Software, Mozaik (MEDIUM confidence — knowledge cutoff August 2025, no live web verification)
- General SaaS quoting/invoicing patterns (HIGH confidence — well-established domain)
- Mexican business context: IVA 16%, MXN, SAT CFDI regulations (HIGH confidence)
- WebSearch and WebFetch unavailable during this session — flag for verification against current competitor feature sets before finalizing roadmap

---

*Feature research for: Custom fabrication studio project management + quoting app (W Chaput Studio)*
*Researched: 2026-03-03*
