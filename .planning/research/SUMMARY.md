# Project Research Summary

**Project:** W Chaput Studio — Internal Project Management & Quoting App
**Domain:** Custom fabrication studio business management (kitchens, furniture, cabinetry — made-to-order / job shop)
**Researched:** 2026-03-03
**Confidence:** MEDIUM

## Executive Summary

W Chaput Studio requires a purpose-built internal tool for a 2-partner custom fabrication studio operating in Mexico. The product covers the full lifecycle of a bespoke project: quoting with cost/margin isolation, client-facing PDF generation, production checklist tracking, supplier debt management, and role-separated financial reporting. No off-the-shelf tool covers the specific combination of (1) client-price vs. supplier-cost separation, (2) accountant role that sees cash flow but never margins, and (3) fabrication-phase task management with a fixed 28-task checklist. This is a gap-filler for a financially-aware high-end studio, not a generic PM tool.

The recommended approach is a Next.js 15 App Router monolith deployed on Vercel, backed by Supabase (Postgres + Auth). All sensitive financial data is protected at the database level via Row Level Security — not just the UI layer. Server Components handle data fetching with automatic RLS enforcement; Server Actions handle mutations; API Routes handle PDF generation exclusively (the only binary streaming need). This pattern minimizes surface area, keeps the codebase cohesive, and makes the role-separation guarantees architecturally sound rather than cosmetic.

The dominant risk class is security and financial data integrity. Three issues require resolution in the very first phase before any feature is built: (1) the two-Supabase-client pattern (server vs. browser) must be established to prevent service role key exposure, (2) session middleware must be implemented with `getUser()` rather than `getSession()` to prevent auth desync, and (3) all money must be stored as `NUMERIC` or integer centavos — never floating-point — to prevent compounding rounding errors across financial aggregates. These are not retrofittable; they are schema and infrastructure decisions.

---

## Key Findings

### Recommended Stack

The stack is non-negotiable per project constraints. Research confirms the combination is well-suited for this use case. Next.js 15 with App Router and Turbopack is the correct foundation — Server Components provide the data-fetching-with-RLS pattern that makes role separation architecturally enforced. Supabase (Postgres + Auth) provides managed relational storage, built-in JWT auth, and database-level RLS. Tailwind 4 + Shadcn/ui provides the accessible component primitives. Recharts handles client-side charts; `@react-pdf/renderer` handles server-side PDF generation. The critical version distinction: `@supabase/ssr` (current) vs. `@supabase/auth-helpers-nextjs` (deprecated) — only use the former.

**Core technologies:**
- **Next.js 15 (App Router):** Full-stack framework — Server Components enforce RLS context automatically; Server Actions replace API routes for mutations
- **Supabase (Postgres + Auth):** Primary database with built-in RLS and JWT auth; `@supabase/ssr` for cookie-based SSR sessions
- **Tailwind CSS 4:** Utility-first CSS — v4 uses CSS-native config (no `tailwind.config.js`); breaking change from v3
- **Shadcn/ui (latest CLI):** Component primitives via CLI — not a package, copied into codebase; aligns with Zinc/monochrome design system
- **`@react-pdf/renderer` 3.x:** Server-side PDF generation — not `react-pdf` (the viewer); renders via Yoga layout engine with `StyleSheet.create()`, not Tailwind
- **Recharts 2.x:** Client-side charts — must be wrapped in `'use client'` and loaded with `dynamic({ ssr: false })`
- **Zod + react-hook-form:** Form validation at the boundary — Zod for schema, `@hookform/resolvers` for integration
- **date-fns 3.x:** Date formatting for DD/MMM/YYYY — never moment.js
- **`Intl.NumberFormat('es-MX', { currency: 'MXN' })`:** MXN formatting — native browser API, no library needed

See `/Users/paulchaput/primer_proyecto_claudecode/.planning/research/STACK.md` for full installation sequence, integration patterns, and version compatibility table.

---

### Expected Features

The feature set is fully defined in PROJECT.md (owner-validated, HIGH confidence). Research confirms this is the correct scope for a 2-person, 4-8 concurrent project studio. No competitors combine all required capabilities; this tool fills a specific gap.

**Must have (v1 launch — tool is not usable without these):**
- Project registry with 6-stage pipeline (Prospecto → Cotizado → Anticipo Recibido → En Producción → Entregado → Cerrado)
- Line-item quoting with auto-calculated margin + sale price (`costo / (1 - margen)`, default 50% margin)
- Client-facing PDF quote — sale price only, zero cost/margin fields, editorial design, IVA 16% breakdown
- Client payment tracking (anticipo 70% + saldo 30%) per project
- Supplier directory with per-project payment tracking and running balance
- Purchase order PDF generator (per supplier, per project — shows cost, not sale price)
- 28-task production checklist across 4 phases (Comercial, Diseño y Especificaciones, Producción, Entrega y Cierre)
- Authentication with admin and accountant roles; RLS-enforced at DB layer
- Accountant view: cash flow and payment totals only — zero margin/cost exposure, enforced at database level
- Master dashboard with KPI cards (active projects, pipeline value, pending client/supplier payments)
- Mobile-responsive UI (375px minimum — Paul checks from phone)
- Spanish UI, MXN currency, DD/MMM/YYYY date format throughout

**Should have (v1.x — add after validation):**
- Revenue/cost/profit chart (Recharts bar chart) — needs historical data to be meaningful
- 30-day cash flow projection — needs 2-3 months of payment data first
- Profit split dashboard card (50/50 per partner) — low effort once profit data is validated
- Pipeline value summary by stage — useful once multiple concurrent projects accumulate

**Defer (v2+):**
- CSV/Excel export for accountant
- Email delivery of PDFs from the app
- Additional user roles (production manager, estimator) — only if team grows
- Project photo attachments

**Anti-features (explicitly excluded):**
- Client-facing portal — adds auth complexity; luxury clients expect personal communication not a portal
- Real-time collaboration / WebSockets — 2 people on 4-8 projects; last-write-wins is sufficient
- CFDI (Mexican fiscal invoice) generation — different legal/technical domain; accountant handles separately
- Inventory/stock management — materials are project-specific, not warehouse stock
- Time tracking / hourly billing — studio bills by project scope, not by hour

See `/Users/paulchaput/primer_proyecto_claudecode/.planning/research/FEATURES.md` for full dependency tree, feature prioritization matrix, and competitor analysis.

---

### Architecture Approach

The architecture is a clean Next.js monolith with strict server/client separation enforced by the framework. Route groups `(auth)`, `(admin)`, and `(accountant)` provide separate layouts and middleware-enforced access control. All data fetching lives in Server Components via `lib/queries/`; all mutations flow through Server Actions in `lib/actions/`; PDF generation is the only API Route use case. Financial calculations are pure TypeScript in `lib/calculations.ts` — never computed in components, never duplicated across query functions.

**Major components:**
1. **Route group `(auth)`:** Login/logout — minimal layout, no sidebar
2. **Route group `(admin)`:** Full app — dark sidebar, all project management features; data fetched via Server Components with full RLS access
3. **Route group `(accountant)`:** Simplified layout — cash flow and project payment summaries only; RLS blocks cost/margin columns at DB level
4. **`lib/supabase/server.ts` + `lib/supabase/client.ts`:** Two separate Supabase client factories — never mix; server client uses cookies, browser client uses anon key only
5. **`middleware.ts`:** Session refresh on every request via `getUser()`; role-based redirect enforcement
6. **`lib/calculations.ts`:** All financial formulas as pure functions — single source of truth for margins, IVA, totals, profit splits
7. **`app/api/pdf/` route handlers:** Only place `@react-pdf/renderer` is called; quote template (`CotizacionTemplate`) explicitly selects zero cost columns; purchase order template (`OrdenCompraTemplate`) is admin-only
8. **Supabase RLS policies:** Database-level security for every table; `get_user_role()` helper function avoids duplicating the profiles subquery in every policy

See `/Users/paulchaput/primer_proyecto_claudecode/.planning/research/ARCHITECTURE.md` for database schema, RLS policies, data flow diagrams, and full project structure.

---

### Critical Pitfalls

1. **Floating-point currency arithmetic** — Use `NUMERIC(12,2)` columns in Postgres for all money. Never `FLOAT` or `DECIMAL`. Consider storing as integer centavos for zero-ambiguity. Financial aggregates (totals, IVA, profit splits) must be computed in SQL or via carefully rounded TypeScript — never raw IEEE 754 arithmetic. Decide in Phase 1 schema; retrofitting is a painful migration.

2. **Supabase service role key exposed to browser** — Service role key bypasses ALL RLS. Never prefix with `NEXT_PUBLIC_`. Only use in Server Actions and API Routes. Install the `server-only` npm package as a compile-time guard on the server Supabase client file. Verify with `next build` output.

3. **Missing auth middleware / session desync** — Supabase JWTs expire after 60 minutes. Without `middleware.ts` calling `supabase.auth.getUser()` (not `getSession()`) on every request, users get randomly logged out or Server Components silently receive no-auth context. `getSession()` is spoofable from cookies; `getUser()` validates against the Supabase Auth server. Must be in place before any protected page is built.

4. **RLS not enforced at database level for accountant role** — UI-only gating (hiding cost columns in React) is bypassed by direct Supabase REST API calls. Anyone with the anon key can query cost columns unless RLS policies explicitly deny the accountant role. Verify by calling Supabase REST API directly as accountant-role user, not through the UI.

5. **React PDF imported in client component boundary** — `@react-pdf/renderer` uses Node.js APIs and cannot run in the browser. Any import chain that reaches a `'use client'` file causes a `window is not defined` crash. PDF logic must live exclusively in `app/api/pdf/` route handlers. The PDF template components must never have `'use client'` and must not be imported by any client component.

6. **Recharts SSR hydration mismatch** — `ResponsiveContainer` measures DOM dimensions that don't exist during SSR. Load all Recharts components with `dynamic(() => import(...), { ssr: false })` and always wrap in a parent div with an explicit height. Apply this pattern to the first chart; don't retrofit later.

7. **Calculated fields stored redundantly** — `precio_venta`, totals, and profit must be computed from base inputs (`costo_proveedor`, `margen`, `cantidad`), not stored by application code. Use Postgres generated columns for row-level derived values and views for project-level aggregates. Application-stored computed values go stale on margin edits and create dual sources of truth.

See `/Users/paulchaput/primer_proyecto_claudecode/.planning/research/PITFALLS.md` for recovery strategies, UX pitfalls, the "looks done but isn't" verification checklist, and integration gotchas.

---

## Implications for Roadmap

The dependency structure is clear from research. Database schema and security infrastructure cannot be retrofitted — they must come first. Auth before protected pages. Core data layer before UI. PDF generation after schema is settled. Dashboard after all entities exist to aggregate over.

### Phase 1: Foundation — Database, Auth Infrastructure, and Security

**Rationale:** Schema column types (NUMERIC vs float), RLS policies, and the two-client Supabase pattern cannot be changed cheaply after features are built on top. Every subsequent phase depends on these being correct. Three critical pitfalls (floating-point currency, service role key exposure, auth middleware) must be addressed here and only here.

**Delivers:** Supabase project with full schema + migrations; profiles table with role trigger; RLS policies on all tables; `lib/supabase/server.ts` + `lib/supabase/client.ts`; `middleware.ts` with `getUser()` session refresh; route group layouts `(auth)`, `(admin)`, `(accountant)`; `.env.local` correctly configured; login/logout flow tested for both roles.

**Addresses:** Authentication + roles (P1), accountant role enforcement (P1), mobile-responsive shell layout.

**Avoids:** Pitfall 1 (floating-point currency), Pitfall 2 (service role key), Pitfall 3 (session desync), Pitfall 4 (RLS gaps). All schema-level decisions finalized before data entry begins.

**Research flag:** Standard patterns — Supabase RLS + Next.js SSR auth is well-documented. Verify `@supabase/ssr` cookie handler API at implementation time (changed in 2024).

---

### Phase 2: Core Data Layer — Projects, Line Items, Calculations

**Rationale:** The project entity and its line items are the root of the dependency tree. Every other feature (payments, checklist, PDFs, dashboard) attaches to a project. `lib/calculations.ts` must be stable before any financial value is displayed anywhere, to prevent the anti-pattern of duplicating formulas across components.

**Delivers:** `lib/queries/projects.ts`, `lib/queries/suppliers.ts`; `lib/actions/projects.ts`, `lib/actions/line-items.ts`; `lib/calculations.ts` with all financial formulas (sale price, IVA, project totals, profit); `lib/formatters.ts` (MXN, DD/MMM/YYYY); project list page; project detail page with line item table (editable, auto-calculates totals on change); project create/edit flow; project status pipeline with 6 stages.

**Addresses:** Project registry with pipeline (P1), line-item quoting with auto-margin (P1), project totals/revenue/cost/profit (P1), Spanish UI + MXN + date format (P1).

**Avoids:** Pitfall 7 (calculated fields stored redundantly — formulas in `lib/calculations.ts`, not component JSX). Anti-pattern: computing financial figures in the UI layer.

**Research flag:** Standard patterns — Next.js Server Components + Server Actions CRUD is well-documented. No phase research needed.

---

### Phase 3: Payments and Supplier Management

**Rationale:** Client payment tracking (anticipo/saldo) and supplier directory are P1 features that depend on the project entity existing but are independent of each other. Building them together minimizes context-switching. Per-project supplier debt view is a join across both.

**Delivers:** Supplier directory (create, list, detail); `lib/actions/payments.ts`, `lib/actions/suppliers.ts`; client payment forms (anticipo + saldo) per project; supplier payment forms per project; per-project supplier balance view; running balance calculation (total owed - total paid per supplier per project).

**Addresses:** Client payment tracking (P1), supplier directory (P1), supplier payment tracking (P1), per-project supplier debt view (P1).

**Avoids:** N+1 query trap — supplier balance must be a JOIN query, not a loop fetching per-supplier.

**Research flag:** Standard patterns — Supabase join queries and Server Actions are well-documented.

---

### Phase 4: Production Checklist

**Rationale:** The 28-task checklist is a standalone feature that attaches to a project but has no cross-dependencies with payments or suppliers. It can be seeded from a fixed template at project creation time. Deferring it until after the financial data layer is stable keeps Phase 2 focused.

**Delivers:** Checklist seeding on project creation (28 tasks across 4 phases); `lib/actions/checklist.ts` (toggle completion); `ChecklistPanel.tsx` client component with phase grouping and completion state; visual phase progress indicator.

**Addresses:** Project checklist 28 tasks / 4 phases (P1).

**Avoids:** The checklist tasks table must have RLS — accountant has no access (checklist is operational, not financial).

**Research flag:** Standard patterns. No research needed.

---

### Phase 5: PDF Generation — Quote and Purchase Order

**Rationale:** PDFs depend on a finalized schema (Phase 1), stable line item data (Phase 2), and supplier assignment on line items (Phase 3). The PDF templates must be built after schema is settled because they reflect the final column structure. This is the highest-risk technical feature (React PDF server/client boundary pitfall).

**Delivers:** `app/api/pdf/cotizacion/route.ts` — quote PDF with sale prices only (zero cost fields); `app/api/pdf/orden-compra/route.ts` — PO PDF filtered by supplier with cost prices; `components/pdf/CotizacionTemplate.tsx` + `OrdenCompraTemplate.tsx` using React PDF primitives (`View`, `Text`, `StyleSheet.create()` — no Tailwind); editorial-quality layout with W Chaput brand identity; download buttons in project detail.

**Addresses:** PDF quote generator (P1), purchase order generator (P1), editorial-quality PDF design (P1), IVA handling (P1).

**Avoids:** Pitfall 5 (React PDF imported in client component — API Route only, `server-only` guard); Pitfall anti-pattern of exposing cost columns in quote query (dedicated `getProjectForQuote()` selects only safe columns).

**Research flag:** Needs attention at implementation time. Verify `@react-pdf/renderer` v3.x API (`renderToBuffer` vs `renderToStream`). Verify Vercel font loading from `/public/fonts/`. Test PDF in Vercel preview deployment early — font loading and Node.js version differences have caused failures.

---

### Phase 6: Dashboard and Accountant Views

**Rationale:** The dashboard aggregates across all entities — it is last because it depends on projects, payments, suppliers, and (for charts) historical data. The accountant view is also last because it is a filtered read of already-built data; building it before the underlying data exists is backwards.

**Delivers:** Admin master dashboard (KPI cards: active projects, pipeline value, pending client payments, pending supplier payments); `RevenueChart.tsx` bar chart (Recharts, `dynamic({ ssr: false })`); accountant views (`/resumen` + `/flujo-efectivo`) showing only cash flows and project payment totals — zero cost/margin fields; `project_financials_accountant` view used for accountant queries.

**Addresses:** Master dashboard KPI cards (P1), revenue/cost/profit chart (P2), accountant role read-only view (P1), 30-day cash flow (P2).

**Avoids:** Pitfall 6 (Recharts SSR hydration — dynamic import with `ssr: false` from the first chart); "Cerrado" projects inflating KPIs (filter by active status in all dashboard queries); N+1 dashboard queries (single aggregated JOIN query for KPI data).

**Research flag:** Standard patterns for dashboard aggregation. Recharts `dynamic` import is well-established. No research phase needed.

---

### Phase Ordering Rationale

- **Phases 1-2 are strictly sequential:** Schema and auth cannot be changed after features are built on top. Core data layer must be stable before payment or checklist features attach to it.
- **Phases 3-4 are independent:** Payments/suppliers and the checklist both depend on Phase 2 but not on each other. They could be built in parallel by two developers or in either order.
- **Phase 5 (PDFs) must follow Phase 3:** Purchase orders require supplier assignment on line items, which requires the supplier entity from Phase 3.
- **Phase 6 (Dashboard) is strictly last:** Aggregates across all entities; accountant view is a filtered read of already-built data.
- **The financial calculation strategy (Pitfall 1) must be resolved in Phase 1 schema.** If it is deferred, all subsequent phases build on a corrupt foundation.

---

### Research Flags

Phases needing deeper research or verification at implementation time:

- **Phase 1:** Verify `@supabase/ssr` cookie handler API against current Supabase docs before writing `middleware.ts` and Supabase client factory files. The API changed in 2024 and may have changed again. Verify `get_user_role()` RLS helper function syntax against current Supabase Postgres version.
- **Phase 5:** Verify `@react-pdf/renderer` v3.x API at implementation time. `renderToBuffer` vs `renderToStream` distinction matters. Verify Vercel font serving from `/public/fonts/`. Test PDF route in Vercel preview early — do not wait until final deployment.

Phases with standard, well-documented patterns (no additional research needed):

- **Phase 2:** Next.js Server Components + Server Actions CRUD is well-documented and stable.
- **Phase 3:** Supabase join queries and payment form Server Actions are standard patterns.
- **Phase 4:** Checklist seeding and toggle are simple CRUD — no complexity.
- **Phase 6:** Recharts `dynamic` import with `ssr: false` is a known, solved pattern.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Next.js 15 version confirmed via official docs (fetched 2026-03-03). Supabase `@supabase/ssr`, React PDF, Recharts from training knowledge (cutoff Aug 2025) — verify package versions at install time. |
| Features | HIGH | Based on owner-validated PROJECT.md requirements. Feature scope, prioritization, and anti-features are confirmed business requirements, not inferred. Domain patterns (deposit model, line-item quoting, margin separation) are industry-standard for custom fabrication. |
| Architecture | MEDIUM | Pattern is well-established community consensus (Next.js App Router + Supabase). Specific middleware API and RLS JWT claim syntax should be verified against current Supabase docs. Note: ARCHITECTURE.md references deprecated `@supabase/auth-helpers-nextjs` in Pattern 4 example — use `@supabase/ssr` as specified in STACK.md and PITFALLS.md. |
| Pitfalls | MEDIUM-HIGH | Floating-point currency (IEEE 754) and service role key exposure are architectural constants — not version-dependent. Session middleware (`getUser` vs `getSession`) and Recharts SSR are well-established community issues. React PDF server/client boundary is a known pattern. Verify specific Supabase RLS syntax at implementation. |

**Overall confidence:** MEDIUM-HIGH

---

### Gaps to Address

- **`@supabase/ssr` cookie handler API:** Verify the exact `getAll` / `setAll` cookie handler signature against current Supabase docs before writing `lib/supabase/server.ts` and `middleware.ts`. The ARCHITECTURE.md example uses an older `createMiddlewareClient` from the deprecated package — this is a documentation inconsistency that must be resolved in Phase 1.

- **RLS role claim method:** The research presents two approaches for reading user role in RLS policies: (1) `SELECT role FROM profiles WHERE id = auth.uid()` via a helper function, and (2) `auth.jwt() ->> 'role'` from JWT claims. These require different setup (a `profiles` table query vs. a custom JWT claim set via Auth hook). Decide which approach to use in Phase 1 and be consistent. The `profiles` table approach is safer for a greenfield project (no custom JWT claim setup needed); JWT claims are faster in RLS execution.

- **`@react-pdf/renderer` Vercel compatibility:** Font loading from `/public/fonts/` in a Vercel serverless function and the `renderToBuffer` API must be tested in a Vercel preview deployment early in Phase 5. Do not wait for the final deployment — font path resolution differs between `next dev` and Vercel's Node.js runtime.

- **Integer centavos vs. NUMERIC(12,2) decision:** The pitfalls research recommends deciding in Phase 1 between storing money as integer centavos or `NUMERIC(12,2)` with SQL-side calculations. Either is acceptable; the critical rule is to decide once and never mix. Recommend `NUMERIC(12,2)` with a `get_user_role()`-style helper for financial aggregates — simpler for a 2-person team unfamiliar with centavo arithmetic throughout the codebase.

---

## Sources

### Primary (HIGH confidence)
- Next.js official docs (https://nextjs.org/docs/app/getting-started/installation, fetched 2026-03-03) — Next.js 15 version, Turbopack default, `create-next-app --yes` defaults
- PROJECT.md (W Chaput Studio validated requirements) — feature scope, role requirements, business rules
- IEEE 754 floating-point arithmetic — mathematical constant, not version-dependent

### Secondary (MEDIUM confidence)
- Supabase documentation (training knowledge, Aug 2025 cutoff) — RLS policies, `@supabase/ssr` cookie-based auth, profiles trigger pattern
- Next.js App Router documentation (training knowledge) — Server Components, Server Actions, route groups, middleware
- `@react-pdf/renderer` documentation (training knowledge) — `renderToBuffer`, `StyleSheet.create()`, Yoga layout engine
- Recharts documentation (training knowledge) — `ResponsiveContainer`, `'use client'` requirement, SSR hydration issue
- Domain knowledge: Jobber, CoConstruct, Cabinet Vision, KCD Software (training knowledge, Aug 2025 cutoff) — competitor feature analysis

### Tertiary (LOW confidence — needs verification)
- Shadcn/ui + Tailwind 4 compatibility at CLI init time — verify `npx shadcn@latest` vs `npx shadcn-ui@latest` naming
- `@supabase/ssr` version 0.5+ cookie handler exact API — verify at implementation
- `@react-pdf/renderer` v3.x `renderToBuffer` vs `renderToStream` distinction — verify against current API

---
*Research completed: 2026-03-03*
*Ready for roadmap: yes*
