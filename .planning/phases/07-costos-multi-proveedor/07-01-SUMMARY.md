---
phase: 07-costos-multi-proveedor
plan: 01
subsystem: database
tags: [supabase, postgres, rls, typescript, vitest, tdd, line-items, costs]

# Dependency graph
requires:
  - phase: 06-dashboard-y-vista-contador
    provides: "gran_total column, admin-only DB access patterns, calcSubtotal patterns"
provides:
  - "line_item_costs table in DB with admin-only RLS policy"
  - "precio_venta column on line_items (direct admin input)"
  - "LineItemCost and updated LineItem TypeScript interfaces"
  - "calcTotalCostoFromCosts, calcMargenFromPrecio, calcSubtotalFromPrecio pure functions"
affects:
  - 07-costos-multi-proveedor
  - 08-pdf-preview
  - lib/calculations.ts
  - lib/types.ts

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Multi-supplier cost rows in join table (line_item_costs) instead of single column on line_items"
    - "precio_venta as direct admin input instead of formula-derived price"
    - "calcMargenFromPrecio for display-only margin derivation from stored precio_venta"

key-files:
  created:
    - supabase/migrations/20260306000005_line_item_costs.sql
  modified:
    - lib/types.ts
    - lib/calculations.ts
    - lib/calculations.test.ts

key-decisions:
  - "precio_venta stored as direct admin input (NUMERIC(12,2)) — price is no longer formula-derived from cost + margin"
  - "calcMargenFromPrecio(precioVenta, totalCosto) returns 0 when precioVenta <= 0 — division-by-zero guard"
  - "calcTotalCostoFromCosts uses Number() coercion — matches Supabase NUMERIC string JSON response pattern"
  - "Migration backfills precio_venta from old formula (costo_proveedor / (1 - margen)) before dropping columns"
  - "Old calcSubtotal, calcPrecioVenta, calcTotalCostoProyecto kept for backward compat — removed in Plan 02 after callers updated"

patterns-established:
  - "Phase 7 cost model: precio_venta on line_items + line_item_costs join table per supplier"
  - "Admin-only RLS on line_item_costs uses same (SELECT public.get_user_role()) = 'admin' pattern as line_items"

requirements-completed: [COST-01, COST-02, COST-03, COST-04, COST-05]

# Metrics
duration: 2min
completed: 2026-03-06
---

# Phase 7 Plan 01: Costos Multi-Proveedor Foundation Summary

**line_item_costs join table with admin-only RLS, precio_venta column replacing formula-derived pricing, and three new pure calculation functions tested TDD-green (36 tests)**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-06T08:11:31Z
- **Completed:** 2026-03-06T08:13:13Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added three new Phase 7 calculation functions with full TDD coverage (RED then GREEN): calcTotalCostoFromCosts, calcMargenFromPrecio, calcSubtotalFromPrecio
- Created and applied migration 20260306000005_line_item_costs.sql: adds precio_venta, creates line_item_costs with admin-only RLS, backfills data, drops old columns
- Updated lib/types.ts: new LineItemCost interface exported, LineItem updated to remove costo_proveedor/margen/proveedor_id and add precio_venta + line_item_costs

## Task Commits

Each task was committed atomically:

1. **Task 1: Add new calculation functions (TDD)** - `ef7f553` (feat)
2. **Task 2: Update types and write DB migration** - `fa86558` (feat)

**Plan metadata:** (docs commit follows)

_Note: Task 1 used TDD — RED (failing tests) then GREEN (implementation) in single commit._

## Files Created/Modified
- `lib/calculations.ts` - Added calcTotalCostoFromCosts, calcMargenFromPrecio, calcSubtotalFromPrecio (existing functions kept)
- `lib/calculations.test.ts` - Added 9 new tests in "Phase 7 — multi-supplier cost model" describe block (36 total, all green)
- `lib/types.ts` - Added LineItemCost interface; replaced LineItem's costo_proveedor/margen/proveedor_id with precio_venta + line_item_costs
- `supabase/migrations/20260306000005_line_item_costs.sql` - Full schema migration applied to remote DB

## Decisions Made
- precio_venta stored directly (not formula-derived) — admin enters sale price directly, margin is display-only computation
- calcMargenFromPrecio returns 0 when precioVenta <= 0 — prevents division by zero, matches test spec
- Old functions (calcSubtotal, calcPrecioVenta, calcTotalCostoProyecto) intentionally kept — Plan 02 will remove callers first, then Plan 03 will drop the functions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None — migration applied cleanly to remote Supabase DB. TypeScript errors in LineItemForm.tsx and LineItemTable.tsx are expected and will be resolved in Plans 02 and 03.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- line_item_costs table live in production DB with correct RLS
- TypeScript contracts established (LineItemCost, updated LineItem)
- Calculation functions ready for consumers
- Plans 02 and 03 can now update all callers of the old API (LineItemForm, LineItemTable, server actions, PDF templates)

---
*Phase: 07-costos-multi-proveedor*
*Completed: 2026-03-06*
