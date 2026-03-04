# W Chaput Studio — Project Management App

## What This Is

A full-stack internal web application for W Chaput Studio, a high-end custom kitchen and furniture fabrication studio in Mexico. It centralizes project management, quoting, payment tracking, supplier management, and financial reporting for a two-partner operation handling 4–8 simultaneous custom fabrication projects. The UI is in Spanish, all currency in MXN.

## Core Value

Partners can see — at a glance — the financial health of every active project and the business as a whole, generate client-facing PDFs that never expose internal costs, and track every payment to and from every stakeholder.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Project registry with status pipeline (Prospecto → Cotizado → Anticipo Recibido → En Producción → Entregado → Cerrado)
- [ ] Line items (partidas) per project: supplier cost input → auto-calculated margin, sale price, totals
- [ ] PDF quote generator — clean editorial style, no costs/margins visible to client
- [ ] Master dashboard: KPI cards, revenue/cost/profit chart, pipeline, supplier debt, 30-day cash flow
- [ ] Payment tracking: client payments (deposit + final) and supplier payments per project
- [ ] Supplier directory with per-supplier balance view and payment history
- [ ] Accountant read-only role: sees cash flow and balances, never sees margins/costs/profit splits
- [ ] Project checklist: 28 tasks across 4 phases (Commercial, Design & Specs, Production, Delivery & Close)
- [ ] Purchase order generator: per supplier per project, auto-filtered by supplier
- [ ] Authentication with two roles: admin and accountant (Supabase Auth)
- [ ] Mobile-responsive UI (Paul checks from phone)
- [ ] Spanish UI labels throughout

### Out of Scope

- Client-facing portal — clients only receive PDFs, no login
- Multi-currency — MXN only
- Inventory management — not in scope for v1
- Payroll / HR features — not relevant
- Real-time collaboration / WebSockets — not needed for 2-person team

## Context

- **Business:** W Chaput Studio, Mexico. Two partners: Paul and Chris. 50/50 profit split.
- **Volume:** 4–8 simultaneous custom projects (kitchens, cabinetry, custom furniture)
- **Suppliers:** Innovika and El Roble (primary). Others possible.
- **Financials:** Standard 50% margin (editable per line item). 70% deposit / 30% on delivery. IVA 16%. All MXN.
- **Quotes:** Sent as PDF. Clients never see costs or margins.
- **Design language:** Clean, minimal, editorial — inspired by high-end design studio aesthetics. Dark sidebar, white content, monochrome palette.
- **Logo:** "W Chaput Studio" — the W is a custom geometric mark.

## Constraints

- **Tech Stack:** Next.js 14 (App Router) + TypeScript, Supabase (Postgres + Auth), Tailwind CSS, Shadcn/ui, Recharts, React PDF, deployed on Vercel — non-negotiable
- **Currency:** MXN format: $#,##0.00
- **Dates:** DD/MMM/YYYY format
- **Calculations:** Always formula-driven, never hardcoded
- **Data privacy:** Margins and costs never appear in any client-facing output (quotes, POs visible to clients)
- **Mobile:** Fully responsive — Paul reviews project status from his phone

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase for auth + DB | Integrated solution, easy row-level security for accountant role | — Pending |
| Two roles only (admin / accountant) | Simple access model for a 2-person team + 1 external accountant | — Pending |
| React PDF for quote generation | Server-side PDF rendering without browser dependency | — Pending |
| Margin editable per line item, default 50% | Flexibility for negotiated projects while maintaining business standard | — Pending |
| Spanish UI throughout | The studio operates in Mexico; Paul and Chris are bilingual but clients/suppliers are Spanish-speaking | — Pending |

---
*Last updated: 2026-03-03 after initialization*
