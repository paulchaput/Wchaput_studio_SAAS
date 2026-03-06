---
phase: 07-costos-multi-proveedor
plan: 03
subsystem: ui-components
tags: [line-items, suppliers, multi-cost, ui, components]
dependency_graph:
  requires:
    - 07-01  # LineItemCost type, calculations, schema migration
    - 07-02  # createLineItemCostAction, deleteLineItemCostAction, getProjectWithLineItems with costs
  provides:
    - Complete UI for multi-supplier cost model end-to-end
  affects:
    - components/projects/LineItemForm.tsx
    - components/projects/LineItemTable.tsx
    - components/projects/ProjectFinancialSummary.tsx
    - components/projects/SupplierPaymentPanel.tsx
    - app/(admin)/proyectos/[id]/page.tsx
tech_stack:
  added: []
  patterns:
    - useState for add-cost sub-panel row state (simpler than useFieldArray for single-row add)
    - calcMargenFromPrecio/calcTotalCostoFromCosts imported in form/table for display-only computation
    - flatMap + reduce pattern for unique supplier derivation from line_item_costs
    - LineItem type cast on Supabase query result for page-level type safety
key_files:
  created: []
  modified:
    - components/projects/LineItemForm.tsx
    - components/projects/LineItemTable.tsx
    - components/projects/ProjectFinancialSummary.tsx
    - components/projects/SupplierPaymentPanel.tsx
    - app/(admin)/proyectos/[id]/page.tsx
decisions:
  - LineItemForm uses local useState for add-cost sub-panel (newCostSupplierId, newCostAmount) instead of useFieldArray — single-row add pattern is simpler and avoids react-hook-form nesting complexity
  - SupplierPaymentPanel updated in-plan as Rule 1 auto-fix — its LineItem prop type was incompatible after schema change; totalOwed now computed from line_item_costs x cantidad per supplier
  - Remaining costo_proveedor references in SupplierDetail.tsx and /proveedores/[id]/page.tsx are intentional backward-compat local variables from 07-02 decision — source data is already line_item_costs.costo, TypeScript is clean
  - LineItem type cast (as LineItem[]) applied to project.line_items on page.tsx — Supabase nested query result loses strict typing at runtime but the query shape is validated by getProjectWithLineItems select clause
metrics:
  duration_seconds: 391
  completed_date: "2026-03-06"
  tasks_completed: 3
  files_modified: 5
requirements:
  - COST-01
  - COST-02
  - COST-03
  - COST-04
  - COST-05
  - COST-06
---

# Phase 7 Plan 03: UI Components for Multi-Supplier Cost Model Summary

**One-liner:** Price-first LineItemForm with per-supplier cost sub-panel (add/delete), computed margin display, updated table columns, and OC PDF supplier derivation from line_item_costs.

## What Was Built

Completed the UI layer for the multi-supplier cost model across five component/page files:

1. **LineItemForm.tsx** — Replaced the old `costo_proveedor + margen% -> computed precio_venta` pattern with direct `precio_venta` input. Added a "Costos por Proveedor" sub-panel (visible in edit mode) that lists existing cost rows (supplier name + amount + delete button) and an add-cost row (supplier select + amount input + "Agregar Costo" button). Computed margin displayed read-only below the sub-panel.

2. **LineItemTable.tsx** — Updated columns: removed old Costo Unit./Margen display, added Precio Venta, Total Costo (sum of line_item_costs.costo × cantidad), Margen% (computed from calcMargenFromPrecio), Total Venta (precio_venta × cantidad).

3. **ProjectFinancialSummary.tsx** — Switched from `calcSubtotal` (old formula-based) to `calcSubtotalFromPrecio`. Total cost now sums all line_item_costs rows across line items. Updated prop interface to accept `line_item_costs` arrays.

4. **SupplierPaymentPanel.tsx** — Auto-fixed (Rule 1): updated prop type from old inline shape with `costo_proveedor/proveedor_id` to `LineItem[]`. Supplier derivation now uses `line_item_costs` arrays. Per-supplier totalOwed computed from cost rows × cantidad.

5. **app/(admin)/proyectos/[id]/page.tsx** — OC PDF supplier derivation updated to flatMap from `line_item_costs` instead of reading `li.suppliers`. Switched `calcSubtotal` to `calcSubtotalFromPrecio` for granTotal. Added `LineItem` type import for explicit typing.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Update LineItemForm, LineItemTable, ProjectFinancialSummary | 72ded75 | components/projects/LineItemForm.tsx, LineItemTable.tsx, ProjectFinancialSummary.tsx |
| 2 | Update project detail page OC button logic | 4777f80 | app/(admin)/proyectos/[id]/page.tsx, components/projects/SupplierPaymentPanel.tsx |
| 3 | Checkpoint human-verify | — | (auto-approved) |

## Verification Results

- `npx tsc --noEmit` exits 0 — zero TypeScript errors across entire codebase
- `npx vitest run` passes 118 tests across 8 test files
- `grep -r "costo_proveedor|proveedor_id" components/ app/` — two files remain with `costo_proveedor` as a local variable name (SupplierDetail.tsx, /proveedores/[id]/page.tsx) but these are intentional backward-compat adapter fields from the 07-02 decision; they do not reference the DB column

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SupplierPaymentPanel prop type incompatible with new LineItem shape**
- **Found during:** Task 2
- **Issue:** `SupplierPaymentPanel` accepted `Array<{ costo_proveedor: number; proveedor_id: string | null; suppliers: ... }>` which TypeScript rejected when passing `LineItem[]` from the project detail page.
- **Fix:** Updated SupplierPaymentPanel to accept `LineItem[]`, derive suppliers from `line_item_costs`, and compute `totalOwed` by summing cost rows per supplier × cantidad.
- **Files modified:** `components/projects/SupplierPaymentPanel.tsx`
- **Commit:** 4777f80

### Scope Notes

The `costo_proveedor` backward-compat key in `SupplierDetail.tsx` and `/proveedores/[id]/page.tsx` was left intentionally. The `getSupplierWithDetails` query (07-02) maps `line_item_costs.costo` → `costo_proveedor` as a local shape for the supplier detail view. TypeScript is satisfied. Updating that adapter is deferred — it does not affect any of the COST-* requirements.

## Self-Check: PASSED

All required files exist and all commits are present in git history.
