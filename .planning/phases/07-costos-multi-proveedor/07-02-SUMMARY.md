---
phase: 07-costos-multi-proveedor
plan: 02
subsystem: api
tags: [supabase, server-actions, zod, line-item-costs, multi-supplier]

requires:
  - phase: 07-01
    provides: "line_item_costs table, LineItemCost type, LineItem.precio_venta, calcSubtotalFromPrecio, calcTotalCostoFromCosts"

provides:
  - "createLineItemCostAction, deleteLineItemCostAction exported from lib/actions/line-items.ts"
  - "syncGranTotal using calcSubtotalFromPrecio with precio_venta shape"
  - "getProjectWithLineItems returning nested line_item_costs with supplier names"
  - "getProjectForQuote reading precio_venta directly (no formula calculation)"
  - "getProjectLineItemsBySupplier using two-step query through line_item_costs"
  - "getSupplierWithDetails joining through line_item_costs not proveedor_id"
  - "All dashboard aggregation helpers using precio_venta and line_item_costs shape"

affects:
  - 07-03
  - dashboard
  - suppliers

tech-stack:
  added: []
  patterns:
    - "Two-step query pattern for getProjectLineItemsBySupplier (fetch all items, then costs for supplier, filter intersection)"
    - "line_item_costs as source of truth for supplier debt, not costo_proveedor column"
    - "precio_venta as direct admin input for subtotal calculation (no gross margin formula)"
    - "Output field costo_proveedor preserved in getSupplierWithDetails for backward compat with supplier detail page"

key-files:
  created: []
  modified:
    - "lib/actions/line-items.ts"
    - "lib/queries/projects.ts"
    - "lib/queries/suppliers.ts"
    - "lib/queries/dashboard.ts"
    - "lib/queries/dashboard.test.ts"

key-decisions:
  - "createLineItemCostAction/deleteLineItemCostAction follow hidden-inputs + FormData pattern (no .bind()) — consistent with deleteLineItemAction"
  - "getSupplierWithDetails returns costo_proveedor key in output object for backward compat with supplier detail page — but source is now line_item_costs.costo not DB column"
  - "aggregateSupplierDebt rewritten to receive line_item_costs rows (not line_items rows) — each cost row has costo, supplier_id, joined line_items + suppliers"
  - "Two-step query in getProjectLineItemsBySupplier: fetch all line_items, then line_item_costs filtered by supplier, intersect — avoids Supabase nested filter limitations"
  - "calcTotalCostoFromCosts per line item × cantidad for totalCosto in aggregateDashboardKpis — matches new model where costs are per line item not per project"
  - "dashboard.test.ts fixtures updated to precio_venta + line_item_costs shape — all 37 tests pass with same financial assertions"

patterns-established:
  - "Two-step supplier filter: fetch all items for project, fetch costs by supplier, intersect on line_item_id"
  - "price_venta × cantidad for ingresos in monthly financials (no gross margin formula)"
  - "sum(line_item_costs.costo) × cantidad for costos in monthly financials"

requirements-completed:
  - COST-02
  - COST-03
  - COST-05

duration: 5min
completed: 2026-03-06
---

# Phase 7 Plan 02: Server Layer Migration to Multi-Supplier Cost Model Summary

**All four server-side files (actions, 3 query modules) migrated from costo_proveedor/margen schema to precio_venta + line_item_costs — TypeScript clean in lib/, 118 vitest tests pass**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-06T14:16:11Z
- **Completed:** 2026-03-06T14:21:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Server actions rewritten: lineItemSchema now uses precio_venta only; syncGranTotal uses calcSubtotalFromPrecio; createLineItemCostAction and deleteLineItemCostAction added for CRUD on line_item_costs
- Project queries updated: getProjectWithLineItems returns nested line_item_costs; getProjectForQuote reads precio_venta directly; getProjectLineItemsBySupplier uses two-step query
- suppliers.ts: getSupplierWithDetails joins through line_item_costs instead of .eq('proveedor_id')
- dashboard.ts: all aggregation helpers (KPIs, monthly financials, supplier debt) use precio_venta + line_item_costs shape; Supabase select strings updated accordingly

## Task Commits

1. **Task 1: Rewrite Server Actions** - `b94236d` (feat)
2. **Task 2: Update query layer and dashboard aggregation** - `46eb150` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `lib/actions/line-items.ts` - Rewritten: precio_venta schema, syncGranTotal fix, new cost row actions
- `lib/queries/projects.ts` - Updated: calcSubtotalFromPrecio, line_item_costs joins, two-step supplier query
- `lib/queries/suppliers.ts` - Updated: joins through line_item_costs not proveedor_id
- `lib/queries/dashboard.ts` - Updated: all interfaces and aggregation logic use new shape
- `lib/queries/dashboard.test.ts` - Updated: fixtures migrated to precio_venta + line_item_costs, 37 tests pass

## Decisions Made
- getSupplierWithDetails returns `costo_proveedor` key in output shape for backward compat with supplier detail page which calls `calcTotalCostoProyecto(normalizedItems)` — the underlying source is now `line_item_costs.costo` but the key is preserved to avoid touching the supplier page in this plan
- aggregateSupplierDebt signature changed: now receives `SupplierCostLike[]` (line_item_costs rows) instead of `SupplierLineItemLike[]` (line_items rows) — debt calculation now sums per-cost-row not per-line-item × cantidad

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated dashboard.test.ts to new data shape**
- **Found during:** Task 2 (Update query layer and dashboard aggregation)
- **Issue:** dashboard.test.ts used MockLineItem with costo_proveedor/margen fields; after changing LineItemLike interface the tests failed TypeScript compilation
- **Fix:** Rewrote all test fixtures to use precio_venta + line_item_costs shape, recalculated expected values accordingly (same financial assertions, different input shape)
- **Files modified:** lib/queries/dashboard.test.ts
- **Verification:** npx vitest run — 37 tests pass in dashboard.test.ts
- **Committed in:** 46eb150 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug: test fixtures stale after interface change)
**Impact on plan:** Required for correctness — test file must match the interface it tests. No scope creep.

## Issues Encountered
- Component errors in LineItemForm.tsx and LineItemTable.tsx (7 errors referencing proveedor_id, costo_proveedor, margen) are expected Plan 03 scope — confirmed by plan verification criteria: "component errors from Plan 03 scope are expected"

## Next Phase Readiness
- lib/ layer fully migrated — TypeScript compiles cleanly in lib/ with 0 errors
- Plan 03 will update LineItemForm and LineItemTable components to use precio_venta and line_item_costs
- No blockers

---
*Phase: 07-costos-multi-proveedor*
*Completed: 2026-03-06*
