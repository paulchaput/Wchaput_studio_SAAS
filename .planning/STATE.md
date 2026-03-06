---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: smart-costing-and-communications
status: in_progress
stopped_at: ~
last_updated: "2026-03-06T00:00:00.000Z"
last_activity: 2026-03-06 — Milestone v2.0 started
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-03)

**Core value:** Partners can see the financial health of every active project and the business as a whole, generate client-facing PDFs that never expose internal costs, and track every payment to and from every stakeholder.
**Current focus:** Milestone v2.0 — multi-supplier costing, PDF preview, email confirmations

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-03-06 — Milestone v2.0 started

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 13
- Average duration: 5 min
- Total execution time: ~65 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-fundacion | 3/3 | 15 min | 5 min |

**Recent Trend:**
- Last 5 plans: 01-01 (2 min), 01-02 (8 min), 01-03 (5 min)
- Trend: stable

*Updated after each plan completion*
| Phase 02-proyectos-y-partidas P01 | 8 | 4 tasks | 7 files |
| Phase 02-proyectos-y-partidas P02 | 6 min | 2 tasks | 13 files |
| Phase 02-proyectos-y-partidas P03 | 27 | 2 tasks | 8 files |
| Phase 02-proyectos-y-partidas P03 | 27 | 3 tasks | 9 files |
| Phase 03-pagos-y-proveedores P01 | 15 | 3 tasks | 9 files |
| Phase 03-pagos-y-proveedores P02 | 2 | 2 tasks | 4 files |
| Phase 03-pagos-y-proveedores P03 | 5 | 3 tasks | 3 files |
| Phase 04-checklist-de-produccion P01 | 3 | 2 tasks | 8 files |
| Phase 04-checklist-de-produccion P02 | 8 | 2 tasks | 2 files |
| Phase 05-generacion-de-pdfs P01 | 3 | 2 tasks | 7 files |
| Phase 05-generacion-de-pdfs P02 | 3 | 2 tasks | 5 files |
| Phase 06-dashboard-y-vista-contador P01 | 3 min | 2 tasks | 8 files |
| Phase 06-dashboard-y-vista-contador P03 | 8 min | 3 tasks | 7 files |
| Phase 06-dashboard-y-vista-contador P02 | 4 | 2 tasks | 7 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Phase 1]: Use NUMERIC(12,2) for all money columns — never FLOAT (resolve before any data is written)
- [Phase 1]: Use profiles table approach for RLS role resolution (not JWT claims) — safer for greenfield, no custom Auth hook needed
- [Phase 1]: Use @supabase/ssr (not deprecated @supabase/auth-helpers-nextjs) — verify cookie handler API at implementation
- [Phase 5]: Test @react-pdf/renderer in Vercel preview deployment early — font path resolution differs from local dev
- [01-01]: SECURITY DEFINER SET search_path='' on handle_new_user trigger — required to cross auth schema boundary silently on signup
- [01-01]: get_user_role() marked STABLE — Postgres caches result per statement, prevents N+1 profile lookups per RLS row evaluation
- [01-01]: Zero accountant policies on line_items — RLS default-deny enforces AUTH-04 at DB level without application logic
- [01-01]: Suppliers Innovika and El Roble seeded in migration — immediately available without separate seed run
- [01-02]: Used CookieOptions type import from @supabase/ssr to satisfy TypeScript strict mode in getAll/setAll handlers
- [01-02]: Scaffolded Next.js manually (create-next-app blocked by existing .planning/.claude dirs)
- [01-02]: tw-animate-css used instead of deprecated tailwindcss-animate
- [Phase 01-fundacion]: loginAction returns { error: string } on failure, calls redirect() on success — TypeScript satisfied, redirect throws internally
- [Phase 01-fundacion]: AppSidebar is Server Component; SidebarNav extracted as Client Component solely for usePathname active state
- [Phase 01-fundacion]: Logout via HTML form action={logoutAction} — works without JavaScript, no onClick handler needed
- [Phase 02-01]: Gross margin formula (costo / (1 - margen)) proven by test: calcPrecioVenta(100, 0.50) === 200, not 150
- [Phase 02-01]: IVA_RATE=0.16 exported as named constant from calculations.ts — zero inline occurrences allowed in components or app
- [Phase 02-01]: formatFecha uses Date.UTC to prevent timezone off-by-one for Mexico City (UTC-6) servers
- [Phase 02-proyectos-y-partidas]: Server Action return type wrapped in void-compatible wrapper for form action prop TypeScript compatibility
- [Phase 02-proyectos-y-partidas]: EditarProyectoPage uses params as Promise<{ id: string }> for Next.js 15 async params API
- [Phase 02-proyectos-y-partidas]: getProjects computes subtotal/gran_total in TypeScript using calcSubtotal/calcTotal — not SQL
- [Phase 02-03]: deleteLineItemAction accepts FormData (hidden inputs pattern) — satisfies form action void | Promise<void> TypeScript constraint without .bind()
- [Phase 02-03]: Zod margen transform (v => v / 100) is the single source of truth for percent-to-decimal conversion — components display integers, DB stores decimals
- [Phase 02-03]: Shadcn Dialog and Separator created manually from radix-ui (already installed) — avoids CLI dependency on shadcn@latest add
- [Phase 02-03]: deleteLineItemAction accepts FormData (not string args) — uses hidden inputs pattern for type-safe form action assignment
- [Phase 02-03]: Shadcn Dialog and Separator created manually from radix-ui (already installed) rather than npx shadcn@latest add which would fail in environment
- [Phase 02-03]: Zod margen transform (v => v / 100) is the single source of truth for percent-to-decimal conversion — components display integers, DB stores decimals
- [Phase 03-pagos-y-proveedores]: ANTICIPO_RATE=0.70 and SALDO_RATE=0.30 exported as named constants from calculations.ts — zero inline occurrences allowed in components
- [Phase 03-pagos-y-proveedores]: getSupplierWithDetails uses two batch queries (line_items + payments_supplier) — never N+1 per project (PROV-03)
- [Phase 03-pagos-y-proveedores]: Number(p.monto) coercion at reduce entry point — Supabase returns NUMERIC(12,2) as strings in JSON
- [Phase 03-pagos-y-proveedores]: Form action void wrapper: async (fd) => { await deleteClientPaymentAction(fd) } — satisfies TypeScript void constraint for form action prop, same pattern as LineItemTable
- [Phase 03-pagos-y-proveedores]: granTotal computed server-side in page.tsx and passed as prop to ClientPaymentPanel — avoids client-side recalculation where lineItems data already lives
- [Phase 03-pagos-y-proveedores]: getClientPayments in Promise.all alongside existing queries — parallel fetch pattern maintained from 02-03
- [Phase 03-pagos-y-proveedores]: Double revalidatePath on supplier payment mutation: /proyectos/[id] AND /proveedores/[supplierId] — updates both pages in one Server Action call
- [Phase 03-pagos-y-proveedores]: supplier_id enforced as z.string().uuid() in Zod schema — prevents orphaned payments invisible on supplier detail page
- [Phase 04-checklist-de-produccion]: CHECKLIST_SEED is static TypeScript array (not DB-driven) — zero query cost, single source of truth
- [Phase 04-checklist-de-produccion]: calcPhaseProgress treats N/A as completed — tasks opted-out count toward progress
- [Phase 04-checklist-de-produccion]: Checklist seed in createProjectAction is non-fatal — project creation succeeds even if checklist insert fails
- [Phase 04-checklist-de-produccion]: createProjectAction redirects to /proyectos/[id] (not /proyectos) after seeding
- [Phase 04-checklist-de-produccion]: ChecklistPanel uses useState for optimistic status update — avoids full-page flash on every dropdown change
- [Phase 04-checklist-de-produccion]: Role lookup before Promise.all — isAdmin drives conditional getChecklistTasks fetch
- [Phase 04-checklist-de-produccion]: onBlur for assignee/due_date — prevents per-keystroke Server Action calls on 30 independent inputs
- [Phase 05-generacion-de-pdfs]: route.tsx (not route.ts) for cotizacion route handler — JSX requires .tsx extension even in Next.js API routes
- [Phase 05-generacion-de-pdfs]: renderToStream element cast as any — DocumentProps vs CotizacionTemplateProps mismatch; established community pattern
- [Phase 05-generacion-de-pdfs]: costo_proveedor and margen fetched in getProjectForQuote but consumed locally — never appear in QuoteProjectData return type (TypeScript enforces boundary)
- [Phase 05-generacion-de-pdfs]: OrdenCompraTemplate uses OcLineItem with costoProveedor (not margen) — admin-only cost visibility confirmed by type shape test
- [Phase 05-generacion-de-pdfs]: Supabase joined suppliers relation typed as array — normalized with Array.isArray check before property access
- [Phase 06-01]: Pure helpers (aggregateDashboardKpis, aggregatePipelineSummary, aggregateSupplierDebt) exported separately from server query functions — enables Vitest unit testing without Supabase mocking
- [Phase 06-01]: server-only mock added to vitest alias config — allows importing modules with server-only in test environment while keeping Next.js enforcement in production
- [Phase 06-01]: Number() coercion applied at pure helper entry point for all NUMERIC string values from Supabase JSON
- [Phase 06-03]: gran_total cached on projects table so accountant can read it without line_items access — RLS default-deny blocks accountant from line_items
- [Phase 06-03]: syncGranTotal private helper called after all three line item mutations before revalidatePath
- [Phase 06-03]: aggregateAccountantProjects reads gran_total via Number() coercion — matches Supabase NUMERIC string JSON response
- [Phase 06-03]: aggregateSupplierTotals only includes suppliers with at least one payment (cash-basis view per CONT-02)
- [Phase 06-03]: Neither accountant page imports Server Actions nor renders mutation controls — CONT-04 enforced at UI layer
- [Phase 06-02]: Recharts Tooltip formatter typed as (v: number | undefined) => string — Recharts Formatter generic allows undefined value
- [Phase 06-02]: UTC-based date arithmetic in aggregateCashFlow — getUTCDate() prevents timezone off-by-one for Mexico City environment
- [Phase 06-02]: next/dynamic({ ssr: false }) for Recharts components — prevents SSR hydration mismatch; data fetched server-side, passed as props

### Pending Todos

None.

### Blockers/Concerns

None — all phases complete.

## Session Continuity

Last session: 2026-03-05T14:02:07.187Z
Stopped at: Completed 06-02-PLAN.md — Recharts charts added to admin dashboard
Resume file: None
