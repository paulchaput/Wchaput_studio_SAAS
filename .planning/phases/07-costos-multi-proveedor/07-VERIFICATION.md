---
phase: 07-costos-multi-proveedor
verified: 2026-03-06T08:35:00Z
status: gaps_found
score: 9/10 must-haves verified
re_verification: false
gaps:
  - truth: "createLineItemCostAction, updateLineItemCostAction, deleteLineItemCostAction exist and work"
    status: failed
    reason: "updateLineItemCostAction is absent from lib/actions/line-items.ts. Only createLineItemCostAction and deleteLineItemCostAction are implemented. The Plan 02 must_haves truth explicitly required all three, but the implementation uses a delete-then-re-add UX pattern instead of in-place edit."
    artifacts:
      - path: "lib/actions/line-items.ts"
        issue: "updateLineItemCostAction is not exported — only createLineItemCostAction (line 119) and deleteLineItemCostAction (line 152) exist"
    missing:
      - "Either implement updateLineItemCostAction, or update the Plan 02 must_haves truth to remove updateLineItemCostAction since the delete+re-add pattern makes it unnecessary"
human_verification:
  - test: "Multi-supplier cost sub-panel end-to-end"
    expected: "Admin opens an existing line item dialog, adds two cost rows from different suppliers, sees margin auto-update, then deletes one — table shows updated margin and total cost without page crash"
    why_human: "Cannot programmatically test React dialog interaction, real-time state updates, and margin computation display in a server-rendered Next.js app without a browser"
  - test: "OC PDF supplier filtering"
    expected: "Clicking 'OC — Supplier A' downloads a PDF that includes only line items that have a cost row for Supplier A, and excludes items that only have costs for Supplier B"
    why_human: "PDF rendering and supplier-specific filtering requires live DB data and browser download behavior to verify"
  - test: "ProjectFinancialSummary totals not NaN"
    expected: "Subtotal, IVA, Gran Total, and Costo Total show valid MXN amounts (not NaN or $0.00) on a project with line items and cost rows"
    why_human: "Requires live DB data; calcSubtotalFromPrecio correctness is unit-tested but rendering with actual Supabase data needs human verification"
---

# Phase 7: Costos Multi-Proveedor Verification Report

**Phase Goal:** Admin can attach multiple supplier cost rows to any line item, enter the sale price directly, and see the margin auto-calculated — purchase orders group line items correctly by supplier using the new cost model.
**Verified:** 2026-03-06T08:35:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | line_item_costs table exists in DB with admin-only RLS policy | VERIFIED | supabase/migrations/20260306000005_line_item_costs.sql — CREATE TABLE, ENABLE ROW LEVEL SECURITY, CREATE POLICY "admin_all_line_item_costs" using get_user_role() = 'admin' |
| 2 | line_items.precio_venta column exists (direct user input) | VERIFIED | Migration adds `precio_venta NUMERIC(12,2) NOT NULL DEFAULT 0`; LineItem type has `precio_venta: number`; LineItemForm has precio_venta direct input |
| 3 | Old costo_proveedor, margen, proveedor_id columns dropped from line_items | VERIFIED | Migration drops all three columns; LineItem type no longer contains those fields; zero references to those fields in components/ or app/ UI code (supplier detail backward-compat adapter is intentional, sources from line_item_costs) |
| 4 | calcTotalCostoFromCosts, calcMargenFromPrecio, calcSubtotalFromPrecio exported from lib/calculations.ts | VERIFIED | lib/calculations.ts lines 145, 154, 164 — all three functions exported; 9 new tests in "Phase 7 — multi-supplier cost model" describe block, all 36 tests green |
| 5 | LineItemCost type exported from lib/types.ts; LineItem no longer has costo_proveedor/margen/proveedor_id | VERIFIED | lib/types.ts: LineItemCost at line 36, LineItem at line 45 — has precio_venta and line_item_costs, does not have old fields |
| 6 | createLineItemCostAction and deleteLineItemCostAction exist and work (updateLineItemCostAction absent) | FAILED | lib/actions/line-items.ts: createLineItemCostAction at line 119 and deleteLineItemCostAction at line 152 both exist and are substantive. updateLineItemCostAction from Plan 02 must_haves truth is NOT implemented anywhere in the codebase |
| 7 | Server layer (actions, queries, dashboard) uses precio_venta + line_item_costs shape, zero old column references | VERIFIED | lib/actions/line-items.ts uses calcSubtotalFromPrecio and precio_venta schema; lib/queries/projects.ts joins line_item_costs with suppliers; lib/queries/dashboard.ts LineItemLike uses precio_venta + line_item_costs; lib/queries/suppliers.ts queries line_item_costs not proveedor_id column |
| 8 | UI components (LineItemForm, LineItemTable, ProjectFinancialSummary) use new model | VERIFIED | LineItemForm: precio_venta direct input, "Costos por Proveedor" sub-panel, computed margin display, createLineItemCostAction/deleteLineItemCostAction wired. LineItemTable: totalCosto from line_item_costs, calcMargenFromPrecio. ProjectFinancialSummary: calcSubtotalFromPrecio |
| 9 | Project detail page derives unique suppliers from line_item_costs for OC PDF buttons | VERIFIED | app/(admin)/proyectos/[id]/page.tsx lines 176-181: flatMap over li.line_item_costs to build uniqueSuppliers; OC route uses getProjectLineItemsBySupplier which does two-step query through line_item_costs |
| 10 | npx tsc --noEmit exits 0 and all 118 vitest tests pass | VERIFIED | TypeScript: 0 errors (no output). Vitest: 8 test files, 118 tests, all passed |

**Score:** 9/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260306000005_line_item_costs.sql` | DB schema migration | VERIFIED | 73 lines; BEGIN/COMMIT; CREATE TABLE line_item_costs; RLS + admin policy; backfill precio_venta; migrate to line_item_costs; DROP COLUMN costo_proveedor/margen/proveedor_id |
| `lib/types.ts` | Updated TypeScript type definitions | VERIFIED | LineItemCost exported (line 36); LineItem updated (line 45) with precio_venta and line_item_costs, no old fields |
| `lib/calculations.ts` | New pure functions for multi-supplier cost model | VERIFIED | calcTotalCostoFromCosts (line 145), calcMargenFromPrecio (line 154), calcSubtotalFromPrecio (line 164) — all substantive, not stubs |
| `lib/calculations.test.ts` | Unit tests for new calculation functions | VERIFIED | "Phase 7 — multi-supplier cost model" describe block at line 166, 9 tests covering edge cases, all green (36 total) |
| `lib/actions/line-items.ts` | Updated Server Actions + new cost row actions | PARTIAL | lineItemSchema uses precio_venta; syncGranTotal uses calcSubtotalFromPrecio; createLineItemCostAction and deleteLineItemCostAction exist and are substantive. updateLineItemCostAction is absent |
| `lib/queries/projects.ts` | Updated project queries with line_item_costs joins | VERIFIED | getProjectWithLineItems: nested line_item_costs with suppliers join. getProjectForQuote: precio_venta directly. getProjectLineItemsBySupplier: two-step query through line_item_costs |
| `lib/queries/suppliers.ts` | Updated supplier query using line_item_costs | VERIFIED | getSupplierWithDetails: Batch 1 queries line_item_costs with .eq('supplier_id'), not proveedor_id column |
| `lib/queries/dashboard.ts` | Updated dashboard aggregation using new data shape | VERIFIED | LineItemLike interface uses precio_venta + line_item_costs; aggregateDashboardKpis, aggregateSupplierDebt, aggregateMonthlyFinancials all updated |
| `components/projects/LineItemForm.tsx` | Updated form with price-first entry and multi-cost sub-panel | VERIFIED | Has precio_venta input, "Costos por Proveedor" sub-panel, cost row list with delete buttons, add-cost row, computed margin display. createLineItemCostAction and deleteLineItemCostAction imported and called |
| `components/projects/LineItemTable.tsx` | Updated table rendering computed margin and total cost | VERIFIED | Columns: Precio Venta, Total Costo (from line_item_costs × cantidad), Margen (calcMargenFromPrecio), Total Venta |
| `components/projects/ProjectFinancialSummary.tsx` | Updated financial summary using calcSubtotalFromPrecio | VERIFIED | Uses calcSubtotalFromPrecio (line 22); totalCosto sums line_item_costs rows × cantidad (line 29-32) |
| `app/(admin)/proyectos/[id]/page.tsx` | Project detail page with updated OC button logic | VERIFIED | flatMap over line_item_costs to derive uniqueSuppliers (line 177); OC links use supplier_id query param; calcSubtotalFromPrecio for granTotal |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| lib/calculations.ts | lib/calculations.test.ts | named exports consumed by test | WIRED | Test imports calcTotalCostoFromCosts, calcMargenFromPrecio, calcSubtotalFromPrecio at lines 24-26; Phase 7 describe block at line 166 |
| lib/types.ts | lib/actions/line-items.ts | LineItem and LineItemCost type imports | PARTIAL | lib/actions/line-items.ts does not import from lib/types.ts — it uses Zod schema + Supabase client types directly. This is functionally correct (Zod validates the shape) but the plan expected type imports. No runtime issue. |
| components/projects/LineItemForm.tsx | lib/actions/line-items.ts | createLineItemCostAction, deleteLineItemCostAction imports | WIRED | Line 32-36 imports both actions; handleAddCost calls createLineItemCostAction (line 143); delete button form calls deleteLineItemCostAction (line 290) |
| components/projects/LineItemTable.tsx | lib/types.ts | LineItem type with line_item_costs array | WIRED | LineItem imported at line 3; item.line_item_costs accessed at line 44 |
| app/(admin)/proyectos/[id]/page.tsx | lib/queries/projects.ts | getProjectWithLineItems returns nested line_item_costs | WIRED | getProjectWithLineItems called (line 42); li.line_item_costs accessed at line 177; type cast as LineItem[] at line 51 |
| lib/actions/line-items.ts | lib/calculations.ts | imports calcSubtotalFromPrecio | WIRED | calcSubtotalFromPrecio imported and called in syncGranTotal (lines 6, 24) |
| lib/queries/projects.ts | line_item_costs | Supabase nested select | WIRED | getProjectWithLineItems select string includes "line_item_costs ( id, costo, supplier_id, suppliers ( id, nombre ) )" (lines 44-47) |
| lib/queries/dashboard.ts | lib/calculations.ts | imports calcSubtotalFromPrecio, calcTotalCostoFromCosts | WIRED | Both imported at lines 4-7; calcSubtotalFromPrecio called in aggregateDashboardKpis (line 93); calcTotalCostoFromCosts called at line 97 |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| COST-01 | 07-01, 07-03 | Admin can add multiple supplier cost rows to a single line item | SATISFIED | line_item_costs table in DB with no unique constraint on (line_item_id, supplier_id); createLineItemCostAction inserts rows; LineItemForm cost sub-panel allows adding multiple rows |
| COST-02 | 07-01, 07-02, 07-03 | Total cost auto-calculates as sum of all supplier cost rows | SATISFIED | calcTotalCostoFromCosts reduces costs array; LineItemTable computes totalCostoUnitario at line 45; aggregateDashboardKpis uses calcTotalCostoFromCosts × cantidad |
| COST-03 | 07-01, 07-02, 07-03 | Admin enters sale price (precio de venta) directly | SATISFIED | precio_venta column on line_items (migration); lineItemSchema has precio_venta field; LineItemForm has "Precio de Venta (MXN)" input |
| COST-04 | 07-01, 07-03 | Margin auto-calculates: margen = (precioVenta - totalCosto) / precioVenta | SATISFIED | calcMargenFromPrecio implements the formula with division-by-zero guard; LineItemForm shows computed margin read-only; LineItemTable shows margen% per row |
| COST-05 | 07-01, 07-02, 07-03 | Project totals (subtotal, IVA, gran total) recalculate correctly | SATISFIED | calcSubtotalFromPrecio used in syncGranTotal (actions), getProjectForQuote, getProjects, page.tsx, ProjectFinancialSummary; all 118 tests pass |
| COST-06 | 07-03 | Purchase order PDF groups line items by supplier using per-line-item costs | SATISFIED | getProjectLineItemsBySupplier does two-step query: fetch all line_items, fetch line_item_costs filtered by supplier_id, intersect — only items with matching cost row included in OC PDF |

All six COST-* requirements are mapped and satisfied in the codebase.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `lib/calculations.ts` | Old functions calcSubtotal, calcPrecioVenta, calcTotalCostoProyecto still exported (with costo_proveedor in signatures) | Warning | Not a COST-* blocker — these are intentionally kept for backward-compat. calcTotalCostoProyecto is still called by SupplierDetail.tsx and /proveedores/[id]/page.tsx. The source data (getSupplierWithDetails) maps line_item_costs.costo → costo_proveedor local key, so this is a runtime-correct adapter. The functions should be cleaned up when the supplier detail page is refactored. |
| `lib/queries/suppliers.ts:60` | Returns `costo_proveedor` as a local key name in the lineItems shape | Info | Intentional backward-compat per Plan 02/03 decisions. Source is line_item_costs.costo, not the dropped DB column. TypeScript is clean. |
| `lib/actions/line-items.ts` | updateLineItemCostAction not implemented despite being in Plan 02 must_haves truth | Warning | The Plan 03 UX (delete + re-add) means cost rows cannot be edited in-place. The UI only has create and delete buttons. This is the gap. |

### Human Verification Required

#### 1. Multi-supplier cost sub-panel end-to-end

**Test:** Open an existing line item dialog (edit mode). Confirm the "Costos por Proveedor" section is visible. Add a cost row for Supplier A (e.g. 200 MXN). Confirm it appears in the list. Add a second cost row for Supplier B (e.g. 100 MXN). Confirm the margin display updates (e.g. for precio_venta=500: (500-300)/500 = 40.0%).
**Expected:** Both cost rows visible with supplier names; margin reads 40.0%; no crash or NaN.
**Why human:** React dialog state, real-time margin display, and server action round-trips require browser interaction to verify.

#### 2. LineItemTable computed columns

**Test:** After adding cost rows, close the dialog. Confirm LineItemTable row shows: Precio Venta = $500.00, Total Costo = $300.00 (sum × cantidad), Margen = 40.0%, Total Venta = precio_venta × cantidad.
**Expected:** All four columns show correct values without NaN.
**Why human:** Table rendering depends on live line_item_costs data returned from getProjectWithLineItems.

#### 3. OC PDF supplier filtering

**Test:** With two suppliers having cost rows on different line items, click "OC — Supplier A" button. Download PDF and inspect it.
**Expected:** PDF contains only line items that have a cost row for Supplier A. Items with only Supplier B costs are absent.
**Why human:** PDF rendering and content verification requires browser download and manual inspection.

#### 4. ProjectFinancialSummary totals on project with costs

**Test:** On a project detail page with line items and cost rows, check the Resumen Financiero panel.
**Expected:** Subtotal, IVA (16%), Total, Costo Total, and Utilidad Bruta all show valid MXN amounts (not NaN or $0.00 when data exists).
**Why human:** Requires live DB data with actual line_item_costs rows.

### Gaps Summary

**1 gap blocking complete must-have verification:**

**updateLineItemCostAction missing (Plan 02 truth partially failed)**

Plan 02's must_haves truth stated: "createLineItemCostAction, updateLineItemCostAction, deleteLineItemCostAction exist and work."

In the actual codebase, only `createLineItemCostAction` and `deleteLineItemCostAction` are implemented. `updateLineItemCostAction` does not exist anywhere. The research file (07-RESEARCH.md line 204) listed it as planned, and Plan 02 included it in truths.

The implementation chose a delete-then-re-add pattern instead of in-place update — the LineItemForm only shows delete buttons and an "Agregar Costo" button, with no edit capability for existing cost rows.

**Impact on COST-* requirements:** Low. None of the six COST requirements explicitly require an update action — they require add, display, and delete capability. The missing updateLineItemCostAction affects the must_haves truth verification but does not block any named requirement from being satisfied.

**Resolution options:**
- Implement `updateLineItemCostAction` to satisfy the Plan 02 must_haves truth precisely, OR
- Formally document that the delete+re-add UX was chosen as the final design and update the truth in the plan/summary to remove updateLineItemCostAction from the requirement

---

_Verified: 2026-03-06T08:35:00Z_
_Verifier: Claude (gsd-verifier)_
