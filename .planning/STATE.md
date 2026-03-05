---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
stopped_at: Completed 03-02-PLAN.md — Phase 3 Plan 2 complete
last_updated: "2026-03-05T04:07:49.650Z"
last_activity: 2026-03-04 — Completed 01-03 (Auth Flow and Dark Sidebar)
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 9
  completed_plans: 5
  percent: 33
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-03)

**Core value:** Partners can see the financial health of every active project and the business as a whole, generate client-facing PDFs that never expose internal costs, and track every payment to and from every stakeholder.
**Current focus:** Phase 2 — Proyectos (Phase 1 complete)

## Current Position

Phase: 1 of 6 (Fundacion) — COMPLETE
Plan: 3 of 3 in current phase — COMPLETE
Status: Phase 1 complete, ready for Phase 2
Last activity: 2026-03-04 — Completed 01-03 (Auth Flow and Dark Sidebar)

Progress: [███░░░░░░░] 33%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 5 min
- Total execution time: 15 min

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

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 5]: @react-pdf/renderer v3.x renderToBuffer vs renderToStream API — verify at implementation time

## Session Continuity

Last session: 2026-03-05T04:07:49.648Z
Stopped at: Completed 03-02-PLAN.md — Phase 3 Plan 2 complete
Resume file: None
