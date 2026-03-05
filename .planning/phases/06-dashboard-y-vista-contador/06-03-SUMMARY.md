---
phase: 06-dashboard-y-vista-contador
plan: 03
subsystem: ui, database, testing
tags: [supabase, nextjs, vitest, rls, accountant, gran_total, cash-flow]

# Dependency graph
requires:
  - phase: 01-fundacion
    provides: RLS policies, profiles table, Supabase client setup
  - phase: 02-proyectos-y-partidas
    provides: line_items table, line item Server Actions, calcSubtotal/calcTotal
  - phase: 03-pagos-y-proveedores
    provides: payments_client, payments_supplier tables, calcTotalPagadoCliente
provides:
  - gran_total NUMERIC(12,2) column on projects table (migration 20260306000004)
  - syncGranTotal helper keeping gran_total in sync via line item Server Actions
  - lib/queries/accountant.ts with three pure helpers and three server query functions
  - /resumen accountant page showing project summaries and supplier totals (CONT-01, CONT-02)
  - /flujo-efectivo accountant page showing full payment history (CONT-03)
  - Accountant sidebar with both navigation links (Resumen + Flujo de Efectivo)
affects: [accountant-views, requirements-CONT-01, requirements-CONT-02, requirements-CONT-03, requirements-CONT-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "gran_total cached column pattern: admin computes via Server Action, accountant reads from column — avoids RLS-blocked line_items join"
    - "aggregateAccountantProjects pure helper: reads gran_total from project row with Number() coercion, never from line_items"
    - "aggregateCashFlow pure helper: merges two payment arrays, sorts ascending by fecha string comparison"
    - "Two parallel Supabase queries (Promise.all) for getAccountantSupplierTotals and getAccountantCashFlow"

key-files:
  created:
    - supabase/migrations/20260306000004_gran_total_column.sql
    - lib/queries/accountant.ts
    - lib/queries/accountant.test.ts
    - app/(accountant)/flujo-efectivo/page.tsx
  modified:
    - lib/actions/line-items.ts
    - app/(accountant)/resumen/page.tsx
    - components/layout/SidebarNav.tsx

key-decisions:
  - "gran_total cached on projects table so accountant can read it without line_items access (RLS default-deny blocks accountant from line_items)"
  - "syncGranTotal private helper called after all three line item mutations (create/update/delete) before revalidatePath"
  - "aggregateAccountantProjects reads gran_total via Number(p.gran_total) coercion — matches Supabase NUMERIC(12,2) string JSON response"
  - "aggregateSupplierTotals only includes suppliers with at least one payment (cash-basis view per CONT-02)"
  - "AccountantCashFlowEntry.label = p.tipo for client payments, 'Pago proveedor' for supplier payments"
  - "Neither accountant page imports Server Actions nor renders mutation controls — CONT-04 enforced at UI layer"

patterns-established:
  - "Accountant query pattern: select from projects/payments only, never join line_items"
  - "syncGranTotal called after insert/update/delete in same Server Action, before revalidatePath"

requirements-completed: [CONT-01, CONT-02, CONT-03, CONT-04]

# Metrics
duration: 8min
completed: 2026-03-05
---

# Phase 6 Plan 3: Accountant Financial Views Summary

**gran_total cached column on projects with syncGranTotal sync, three accountant query functions with 21 unit tests, read-only /resumen and /flujo-efectivo pages, and sidebar link — all without touching line_items**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-05T07:50:00Z
- **Completed:** 2026-03-05T07:58:00Z
- **Tasks:** 3 code tasks + 1 auto-approved checkpoint
- **Files modified:** 7

## Accomplishments

- DB migration adds `gran_total NUMERIC(12,2) DEFAULT 0` to projects table; pushed to remote Supabase
- `syncGranTotal()` private helper in line-items.ts keeps gran_total in sync after every line item mutation
- `lib/queries/accountant.ts` exports three pure helpers and three server query functions; 21 unit tests all pass
- `/resumen` page shows project summaries (name, client, total, collected, outstanding) and supplier payment totals — zero cost/margin columns
- `/flujo-efectivo` new route shows all client and supplier payments sorted by date
- Accountant sidebar now has both "Resumen" and "Flujo de Efectivo" links
- Neither accountant page contains any mutation controls (CONT-04)

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration + gran_total sync in line item actions** - `69f2896` (feat)
2. **Task 2 RED: Failing tests for accountant query helpers** - `6326bb9` (test)
3. **Task 2 GREEN: Accountant query functions implementation** - `43de89a` (feat)
4. **Task 3: Accountant pages + sidebar link** - `6c61eef` (feat)

_Task 4 (checkpoint:human-verify) auto-approved per auto_advance=true._

## Files Created/Modified

- `supabase/migrations/20260306000004_gran_total_column.sql` - Adds gran_total NUMERIC(12,2) to projects
- `lib/actions/line-items.ts` - Added syncGranTotal helper and calls after each mutation
- `lib/queries/accountant.ts` - Three pure helpers + three server query functions for accountant view
- `lib/queries/accountant.test.ts` - 21 unit tests for all three pure helpers
- `app/(accountant)/resumen/page.tsx` - Replaced stub with real project/supplier summary tables
- `app/(accountant)/flujo-efectivo/page.tsx` - New route for full payment history
- `components/layout/SidebarNav.tsx` - Added 'Flujo de Efectivo' to accountantNavItems

## Decisions Made

- gran_total cached on projects table so accountant reads it without line_items access (RLS default-deny)
- syncGranTotal called within same Server Action after mutation, before revalidatePath
- aggregateAccountantProjects: Number(p.gran_total) coercion handles Supabase NUMERIC string JSON
- Only suppliers with at least one payment shown in supplier totals (cash-basis, CONT-02)
- AccountantCashFlowEntry.label = p.tipo for client, 'Pago proveedor' for supplier
- Neither accountant page imports Server Actions — CONT-04 enforced at UI layer

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Migration was pushed automatically via `npx supabase db push`.

## Next Phase Readiness

Phase 6 (Dashboard y Vista Contador) is now complete. All 3 plans executed:
- Plan 01: Dashboard KPI aggregation and components
- Plan 02: (completed previously)
- Plan 03: Accountant financial views

All CONT-01, CONT-02, CONT-03, CONT-04 requirements satisfied. Project milestone v1.0 is complete.

---
*Phase: 06-dashboard-y-vista-contador*
*Completed: 2026-03-05*
