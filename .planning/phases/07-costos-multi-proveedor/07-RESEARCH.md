# Phase 7: Costos Multi-Proveedor - Research

**Researched:** 2026-03-06
**Domain:** Supabase schema migration, Next.js 15 Server Actions, React Hook Form, TypeScript type refactoring
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COST-01 | Admin can add multiple supplier cost rows to a single line item (supplier + cost amount each) | New `line_item_costs` join table + LineItemCostForm sub-component |
| COST-02 | Total cost of a line item auto-calculates as the sum of all its supplier cost rows | New `calcTotalCosto` overload accepting `LineItemCost[]` array; `syncGranTotal` updated |
| COST-03 | Admin enters the sale price (precio de venta) directly on a line item | `precio_venta NUMERIC(12,2)` column added to `line_items`; `LineItemForm` replaces the margen input with a precioVenta input |
| COST-04 | Margin auto-calculates from sale price and total cost: `margen = (precioVenta - totalCosto) / precioVenta` | New `calcMargenFromPrecio` pure function in `calculations.ts` |
| COST-05 | Project totals (subtotal, IVA, gran total) recalculate correctly with the new cost model | `calcSubtotal` signature updated to accept `{ precio_venta, cantidad }[]`; `syncGranTotal` and all query callers updated |
| COST-06 | Purchase order PDF groups line items by supplier using new per-line-item supplier costs | `getProjectLineItemsBySupplier` rewritten to query `line_item_costs` instead of `proveedor_id` |
</phase_requirements>

---

## Summary

Phase 7 is a surgical schema migration plus a cascading refactor of the calculation layer, the Server Actions, all Supabase queries, and two UI components. The core change is replacing the single `costo_proveedor NUMERIC(12,2)` column on `line_items` with a `line_item_costs` join table (one row per supplier-per-line-item). Simultaneously, `precio_venta` becomes a direct input on `line_items` and `margen` becomes a computed output.

Every file that currently touches `costo_proveedor` or `margen` as an input must be updated. The blast radius is precisely known from a grep of the codebase: `calculations.ts`, `lib/actions/line-items.ts`, `lib/queries/projects.ts`, `lib/queries/dashboard.ts`, `lib/queries/suppliers.ts`, `components/projects/LineItemForm.tsx`, `components/projects/LineItemTable.tsx`, `components/projects/ProjectFinancialSummary.tsx`, `lib/pdf/OrdenCompraTemplate.tsx` types, and the purchase order route handler. All other files are unaffected.

The migration must be reversible. The safest strategy is to add `precio_venta` and the `line_item_costs` table in a forward migration, copy existing `costo_proveedor` data into `line_item_costs` rows, then drop `costo_proveedor` from `line_items` in the same migration. This avoids a two-deployment window and removes the backward-compat nullable column footgun flagged in STATE.md Pending Todos.

**Primary recommendation:** Execute in four sequential plans — (1) DB migration + new calculation functions + updated Server Actions, (2) updated LineItemForm with multi-cost sub-panel, (3) updated query layer + ProjectFinancialSummary, (4) updated OC PDF and human verification.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase JS | 2.49.2 (installed) | Query `line_item_costs`, insert/delete cost rows | Already in use; Supabase JS v2 stable API |
| Next.js 15 App Router | 15.2.9 (installed) | Server Actions for CRUD on `line_item_costs` | Established pattern in this codebase |
| Zod | 3.24.2 (installed) | Validate cost row inputs (supplier_id UUID, costo positive NUMERIC) | Single source of truth for validation per project convention |
| React Hook Form | 7.54.2 (installed) | Form state for multi-row cost panel inside LineItemForm dialog | Already used by LineItemForm |
| TypeScript | 5.x (installed) | Updated type definitions for new schema shape | No change to toolchain |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | 4.0.18 (installed) | Unit tests for new pure functions (`calcMargenFromPrecio`, updated `calcSubtotal`) | All pure helpers in `calculations.ts` require tests |
| @react-pdf/renderer | 4.3.2 (installed) | OC PDF template — no changes to the template itself, only to the data shape fed into it | Phase 6 already confirmed working pattern |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Immediate drop of `costo_proveedor` | Keep nullable for backward compat | Keeping it nullable is a footgun — dead column with stale data causing confusion. Drop it in the same migration after backfill. |
| `precio_venta` as computed column in DB | Store as direct input column | Computed columns in Postgres require a function and cannot be easily overridden by user input. Direct column is simpler and consistent with how all other financial columns work in this project. |
| Storing `margen` in DB | Compute on-the-fly | `margen` is now always derived from `(precioVenta - totalCosto) / precioVenta` — it MUST NOT be stored or it will drift out of sync. Remove from DB or keep as nullable with a DB comment marking it deprecated. |

**Installation:** No new packages required. All needed libraries are already installed.

---

## Architecture Patterns

### Recommended Project Structure

The following files are touched. No new directories needed.

```
supabase/migrations/
└── 20260306000005_line_item_costs.sql   # NEW — adds table, migrates data, drops column

lib/
├── calculations.ts                       # UPDATED — new functions, updated signatures
├── calculations.test.ts                  # UPDATED — new test cases
├── types.ts                              # UPDATED — LineItem shape, new LineItemCost type
├── actions/
│   └── line-items.ts                     # UPDATED — new Server Actions for cost rows
└── queries/
    ├── projects.ts                        # UPDATED — all queries join line_item_costs
    ├── dashboard.ts                       # UPDATED — aggregation helpers use new shape
    └── suppliers.ts                       # UPDATED — getSupplierWithDetails joins costs

components/projects/
├── LineItemForm.tsx                       # UPDATED — precio_venta input + cost row sub-panel
├── LineItemTable.tsx                      # UPDATED — displays total cost + computed margin
└── ProjectFinancialSummary.tsx            # UPDATED — uses new calcSubtotal signature
```

### Pattern 1: line_item_costs Join Table Schema

**What:** A new join table that normalizes the many-suppliers-per-line-item relationship.
**When to use:** Whenever a line item has contributions from more than one supplier.

```sql
-- Source: designed from STATE.md architectural decision
CREATE TABLE public.line_item_costs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_item_id UUID NOT NULL REFERENCES public.line_items(id) ON DELETE CASCADE,
  supplier_id  UUID NOT NULL REFERENCES public.suppliers(id),
  costo        NUMERIC(12,2) NOT NULL CHECK (costo >= 0),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: admin only (matches zero-accountant-access policy on line_items)
ALTER TABLE public.line_item_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_line_item_costs" ON public.line_item_costs
  FOR ALL TO authenticated
  USING ((SELECT public.get_user_role()) = 'admin')
  WITH CHECK ((SELECT public.get_user_role()) = 'admin');
```

### Pattern 2: Data Migration Strategy (Forward-Only in Single Migration)

**What:** Copy existing `costo_proveedor` values into `line_item_costs`, then drop the old column.
**When to use:** One-shot migration; no backward-compat window needed.

```sql
-- Add precio_venta column to line_items BEFORE data migration
ALTER TABLE public.line_items
  ADD COLUMN precio_venta NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Backfill precio_venta from old formula: precio = costo / (1 - margen)
-- Guard against margen = 1 (division by zero) — set to 0 in that case
UPDATE public.line_items
SET precio_venta = CASE
    WHEN margen >= 1 THEN 0
    ELSE ROUND(costo_proveedor / (1 - margen), 2)
  END;

-- Migrate existing single-supplier cost data to line_item_costs
-- Only inserts rows where proveedor_id and costo_proveedor are non-zero
INSERT INTO public.line_item_costs (line_item_id, supplier_id, costo)
SELECT id, proveedor_id, costo_proveedor
FROM public.line_items
WHERE proveedor_id IS NOT NULL AND costo_proveedor > 0;

-- Now safe to drop the old column
ALTER TABLE public.line_items DROP COLUMN costo_proveedor;

-- margen column: keep as nullable (or drop) — it is no longer an input.
-- Safest: keep as NULLABLE and mark deprecated via comment, so existing
-- queries that might reference it fail loudly at the DB level if they write to it.
-- Actually: DROP it to force compile-time errors that surface all stale references.
ALTER TABLE public.line_items DROP COLUMN margen;
```

**Decision on `margen` column:** Drop it. Keeping it leads to subtle bugs where old code writes a stale value. The computed margin is always `(precioVenta - totalCosto) / precioVenta`, derived at query time in TypeScript — it is NEVER stored. This is the same pattern as `subtotal` and `gran_total` before Phase 6 introduced the cached `gran_total`.

### Pattern 3: New Calculation Functions

**What:** New and updated pure functions in `calculations.ts`.
**When to use:** Anywhere margin or total cost is computed under the new model.

```typescript
// Source: derived from COST-02 and COST-04 requirements

/**
 * Total cost from an array of line_item_costs rows.
 * COST-02: sum of all supplier cost rows for one line item.
 */
export function calcTotalCostoFromCosts(
  costs: Array<{ costo: number }>
): number {
  return costs.reduce((sum, c) => sum + Number(c.costo), 0)
}

/**
 * Margin auto-calculated from sale price and total cost.
 * COST-04: margen = (precioVenta - totalCosto) / precioVenta
 * Returns 0 if precioVenta is 0 (avoid division by zero).
 */
export function calcMargenFromPrecio(
  precioVenta: number,
  totalCosto: number
): number {
  if (precioVenta <= 0) return 0
  return (precioVenta - totalCosto) / precioVenta
}

/**
 * Updated calcSubtotal — now accepts precio_venta directly.
 * COST-05: subtotal = sum of (precio_venta * cantidad) for all line items.
 */
export function calcSubtotalFromPrecio(
  items: Array<{ precio_venta: number; cantidad: number }>
): number {
  return items.reduce(
    (sum, item) => sum + item.precio_venta * item.cantidad,
    0
  )
}
```

**Important:** The old `calcSubtotal` (which uses `costo_proveedor` and `margen`) must be replaced throughout the codebase. The cleanest approach: rename the old function or update its signature. Since `calcSubtotal` is imported in 4 files, updating in place with the new signature is safest — breaking changes will surface as TypeScript compile errors.

### Pattern 4: Server Actions for line_item_costs

**What:** Three new Server Actions: `createLineItemCostAction`, `updateLineItemCostAction`, `deleteLineItemCostAction`. Plus, `createLineItemAction` and `updateLineItemAction` are updated to accept `precio_venta` instead of `costo_proveedor` and `margen`.

```typescript
// Source: established pattern from lib/actions/line-items.ts

const lineItemCostSchema = z.object({
  line_item_id: z.string().uuid(),
  supplier_id: z.string().uuid('Selecciona un proveedor válido'),
  costo: z.coerce.number().nonnegative('El costo no puede ser negativo'),
})

export async function createLineItemCostAction(
  formData: FormData
): Promise<{ error?: string }> {
  const parsed = lineItemCostSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { data: costRow, error } = await supabase
    .from('line_item_costs')
    .insert(parsed.data)
    .select('line_item_id')
    .single()

  if (error) return { error: error.message }

  // Fetch project_id for this line item, then sync gran_total
  const { data: li } = await supabase
    .from('line_items')
    .select('project_id')
    .eq('id', costRow.line_item_id)
    .single()

  if (li?.project_id) await syncGranTotal(supabase, li.project_id)
  revalidatePath('/proyectos/' + li?.project_id)
  return {}
}
```

### Pattern 5: Updated lineItemSchema (precio_venta replaces costo_proveedor + margen)

```typescript
// Updated lineItemSchema in lib/actions/line-items.ts
const lineItemSchema = z.object({
  project_id: z.string().uuid(),
  descripcion: z.string().min(1, 'La descripción es requerida'),
  referencia: z.string().optional(),
  dimensiones: z.string().optional(),
  cantidad: z.coerce.number().int().positive('La cantidad debe ser mayor a 0'),
  precio_venta: z.coerce.number().nonnegative('El precio de venta no puede ser negativo'),
  // NOTE: proveedor_id removed from line_items schema — supplier association
  // now lives exclusively in line_item_costs rows
})
```

### Pattern 6: Updated syncGranTotal

```typescript
// syncGranTotal now fetches precio_venta + cantidad from line_items
async function syncGranTotal(supabase: SupabaseClient, projectId: string): Promise<void> {
  const { data: items } = await supabase
    .from('line_items')
    .select('precio_venta, cantidad')
    .eq('project_id', projectId)

  const subtotal = calcSubtotalFromPrecio(
    (items ?? []).map(li => ({
      precio_venta: Number(li.precio_venta),
      cantidad: li.cantidad,
    }))
  )
  const granTotal = calcTotal(subtotal)
  await supabase.from('projects').update({ gran_total: granTotal }).eq('id', projectId)
}
```

### Pattern 7: Querying line_item_costs in getProjectWithLineItems

```typescript
// Updated Supabase select — joins line_item_costs with supplier name
const { data, error } = await supabase
  .from('projects')
  .select(`
    *,
    line_items (
      id, descripcion, referencia, dimensiones,
      cantidad, precio_venta, created_at,
      line_item_costs (
        id, costo, supplier_id,
        suppliers ( id, nombre )
      )
    )
  `)
  .eq('id', id)
  .single()
```

### Pattern 8: OC PDF — getProjectLineItemsBySupplier Rewrite

The existing query filters `line_items` by `proveedor_id = supplierId`. After migration, this column no longer exists. The new query joins through `line_item_costs`:

```typescript
// New approach: fetch line items that have a cost row for this supplier
const { data: costs } = await supabase
  .from('line_item_costs')
  .select(`
    costo,
    line_items (
      id, descripcion, referencia, dimensiones, cantidad, precio_venta
    )
  `)
  .eq('supplier_id', supplierId)
  // Filter to this project by joining through line_items.project_id
  // Supabase does not support nested .eq on joins directly —
  // use an explicit filter via the line_item_id + line_items.project_id approach:
```

**Note on Supabase join filtering:** Supabase PostgREST cannot directly filter `line_items.project_id` through a join on `line_item_costs`. The clean solution: fetch all `line_item_costs` for this supplier, then client-side filter by `line_item.project_id === projectId`. Since a project has at most tens of line items and a supplier has at most hundreds across all projects, client-side filtering here is safe and correct. Alternatively, use a Supabase RPC (stored function) for a single SQL join.

**Recommended approach:** Two-step query:
1. Fetch `line_items` for the project: `SELECT id, descripcion, ... FROM line_items WHERE project_id = $1`
2. Fetch `line_item_costs` for those line item IDs and this supplier: `SELECT line_item_id, costo FROM line_item_costs WHERE line_item_id IN (...) AND supplier_id = $2`
3. Filter step 1 results to only those with a matching cost row, and use the cost row's `costo` as the unit cost.

### Pattern 9: LineItemForm UI Redesign

The form dialog changes from:
- Single `costo_proveedor` + `margen %` → calculated `precioVenta` (read-only preview)

To:
- `precio_venta` (direct input, required)
- `cantidad` (unchanged)
- Multi-row cost panel: list of existing `line_item_costs` rows with inline delete, plus "Agregar Costo" row (supplier select + costo input + save button)
- Computed margin display (read-only): `((precioVenta - totalCosto) / precioVenta * 100).toFixed(1)%`

**UX consideration:** The cost sub-panel should allow adding/deleting costs independently from the main line item save. Each cost row save triggers its own Server Action. This means the dialog stays open while cost rows are mutated inline, and the parent page revalidates on each mutation. This is the same pattern as the ChecklistPanel's per-task onBlur saves.

### Anti-Patterns to Avoid

- **Do not store computed margin in the DB** — it will drift. `margen` is always computed from `(precioVenta - totalCosto) / precioVenta` at read time.
- **Do not keep `costo_proveedor` as nullable** — stale data will confuse future developers and potentially cause incorrect calculations if any old code path reads it.
- **Do not add a `proveedor_id` foreign key to `line_item_costs` as a non-nullable constraint if the supplier list is empty** — ensure the FK is nullable if a line item can have zero cost rows during creation.
- **Do not drop `proveedor_id` from `line_items` prematurely** — the migration should be a single atomic SQL file that adds the new table, migrates data, and drops old columns in one transaction.
- **Do not forget `ON DELETE CASCADE` on `line_item_costs.line_item_id`** — deleting a line item must cascade to its cost rows automatically.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID FK validation on cost rows | Custom regex check | Zod `z.string().uuid()` | Already proven pattern in `lineItemSchema` |
| Multi-row form state for cost sub-panel | Manual useState array management | `useFieldArray` from React Hook Form | Handles add/remove/reorder for array fields; avoids index drift bugs |
| DB transaction for migrate-then-drop | Sequential SQL statements | Single `.sql` migration file (Supabase runs each file as a transaction) | Supabase migrations are atomic per file |
| Supplier debt recalculation after schema change | New aggregation logic | Update `aggregateSupplierDebt` to query `line_item_costs` join | Same pattern, new data source |

**Key insight:** The project has established clean separation between pure calculation helpers (testable with Vitest, no Supabase) and server query functions. This pattern MUST be maintained for the new calculation functions (`calcMargenFromPrecio`, `calcTotalCostoFromCosts`, `calcSubtotalFromPrecio`) — pure functions first, tested, then consumed by server queries.

---

## Common Pitfalls

### Pitfall 1: proveedor_id Removal from line_items

**What goes wrong:** The existing `line_items` table has a `proveedor_id` column used in two places: (1) the OC PDF route to filter by supplier, and (2) the supplier detail page (`getSupplierWithDetails` queries `line_items WHERE proveedor_id = supplierId`).

**Why it happens:** After migration, `proveedor_id` on `line_items` is no longer meaningful — supplier association lives in `line_item_costs`.

**How to avoid:** Remove `proveedor_id` from `line_items` in the migration. Update `getSupplierWithDetails` to join through `line_item_costs`. Update the OC PDF query as described in Pattern 8.

**Warning signs:** TypeScript will surface compile errors at the query sites if types are updated first.

### Pitfall 2: calcSubtotal Signature Mismatch Across Callers

**What goes wrong:** `calcSubtotal` is currently called in 4+ locations with `{ costo_proveedor, margen, cantidad }` shape. If the function signature changes without updating all callers, TypeScript will compile but runtime behavior will silently produce `NaN` values if the old properties are just ignored.

**Why it happens:** TypeScript structural typing — if the old shape happens to be a superset of the new shape, the compiler won't catch it.

**How to avoid:** Rename `calcSubtotal` to `calcSubtotalFromPrecio` (new signature) and delete the old `calcSubtotal`. TypeScript will then fail at every old call site, forcing explicit updates. Update tests first (TDD).

**Warning signs:** Any financial total showing as `$0.00` or `$NaN` after migration.

### Pitfall 3: syncGranTotal Reading Stale Data

**What goes wrong:** `syncGranTotal` fetches line items and recalculates `gran_total`. After the schema change, if any call site still tries to `select('costo_proveedor, margen, cantidad')`, Supabase will return an empty/error response and `gran_total` will be set to 0.

**Why it happens:** Supabase JS does not throw on selecting non-existent columns — it silently returns the row without that field, resulting in `undefined` values that coerce to 0.

**How to avoid:** Update `syncGranTotal` to `select('precio_venta, cantidad')` as the first task in the Server Actions update plan. Add a test that verifies `syncGranTotal` produces the correct `gran_total` with the new shape.

**Warning signs:** `gran_total` showing as 0 on all projects after migration.

### Pitfall 4: Dashboard Queries Still Reference Old Line Item Shape

**What goes wrong:** `getDashboardKpis`, `getMonthlyFinancials`, and `getSupplierDebtBreakdown` all query `line_items(costo_proveedor, margen, cantidad)`. After migration, those columns don't exist.

**Why it happens:** These functions are in `dashboard.ts`, which is a separate file from `projects.ts` — easy to miss in the refactor.

**How to avoid:** Do a global search for `costo_proveedor` and `margen` across all TypeScript files before marking the plan complete. Every occurrence must be updated.

**Warning signs:** Dashboard KPI cards showing $0, or TypeScript errors on the Supabase select string (though Supabase select strings are untyped at runtime — runtime errors would manifest as wrong numbers, not exceptions).

### Pitfall 5: RLS on line_item_costs Must Match line_items

**What goes wrong:** If `line_item_costs` is created without RLS, accountant-role users can read supplier costs through a direct PostgREST query, violating AUTH-04.

**Why it happens:** RLS is not enabled by default on new tables in Postgres. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` must be explicit.

**How to avoid:** Always follow the pattern from the initial schema migration — enable RLS and create policies in the same migration file. Use admin-only policy (no accountant SELECT policy) to match `line_items`.

**Warning signs:** Any test that checks accountant role access can read `line_item_costs` when it should be blocked.

### Pitfall 6: Division by Zero in calcMargenFromPrecio

**What goes wrong:** If admin enters `precio_venta = 0`, the margin formula `(0 - totalCosto) / 0` produces `-Infinity` or `NaN`.

**Why it happens:** No guard on the denominator.

**How to avoid:** `calcMargenFromPrecio` must return 0 when `precioVenta <= 0`. Add a Vitest test case: `calcMargenFromPrecio(0, 500) === 0`.

### Pitfall 7: OC PDF Button Logic on Project Detail Page

**What goes wrong:** The project detail page currently collects unique suppliers via `lineItems.forEach(li => li.suppliers?.id)` — reading `proveedor_id` indirectly through the join. After migration, `line_items` no longer has a `proveedor_id` column, so the supplier aggregation logic must query `line_item_costs` instead.

**Why it happens:** The OC button generation happens in the React component, reading the line items shape passed as props.

**How to avoid:** Update `getProjectWithLineItems` to join `line_item_costs(supplier_id, suppliers(id, nombre))`. The project detail page then extracts unique suppliers from the nested `line_item_costs` rows.

---

## Code Examples

### Migration File Structure

```sql
-- supabase/migrations/20260306000005_line_item_costs.sql

BEGIN;

-- 1. Add precio_venta to line_items
ALTER TABLE public.line_items
  ADD COLUMN precio_venta NUMERIC(12,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.line_items.precio_venta IS
  'ADMIN ONLY — direct user input; margin is computed from this, not stored';

-- 2. Create line_item_costs join table
CREATE TABLE public.line_item_costs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_item_id UUID NOT NULL REFERENCES public.line_items(id) ON DELETE CASCADE,
  supplier_id  UUID NOT NULL REFERENCES public.suppliers(id),
  costo        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (costo >= 0),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.line_item_costs IS
  'ADMIN ONLY — one row per supplier contribution per line item';

-- 3. RLS on line_item_costs
ALTER TABLE public.line_item_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_line_item_costs" ON public.line_item_costs
  FOR ALL TO authenticated
  USING ((SELECT public.get_user_role()) = 'admin')
  WITH CHECK ((SELECT public.get_user_role()) = 'admin');

-- 4. Backfill precio_venta from old formula
UPDATE public.line_items
SET precio_venta = CASE
    WHEN margen >= 1 THEN costo_proveedor  -- edge case: margen=1 would be divide by zero
    ELSE ROUND(costo_proveedor / NULLIF(1 - margen, 0), 2)
  END;

-- 5. Migrate existing cost data to line_item_costs
INSERT INTO public.line_item_costs (line_item_id, supplier_id, costo)
SELECT id, proveedor_id, costo_proveedor
FROM public.line_items
WHERE proveedor_id IS NOT NULL
  AND costo_proveedor > 0;

-- 6. Drop old columns now that data is migrated
ALTER TABLE public.line_items DROP COLUMN costo_proveedor;
ALTER TABLE public.line_items DROP COLUMN margen;
ALTER TABLE public.line_items DROP COLUMN proveedor_id;

COMMIT;
```

### New Type Definitions

```typescript
// lib/types.ts additions

export interface LineItemCost {
  id: string
  line_item_id: string
  supplier_id: string
  costo: number  // NUMERIC(12,2) — ADMIN ONLY
  created_at: string
  // Optional join
  suppliers?: { id: string; nombre: string } | null
}

// Updated LineItem — costo_proveedor, margen, proveedor_id removed
export interface LineItem {
  id: string
  project_id: string
  descripcion: string
  referencia: string | null
  dimensiones: string | null
  cantidad: number
  precio_venta: number  // NUMERIC(12,2) — ADMIN ONLY, direct input
  created_at: string
  // Optional join from getProjectWithLineItems
  line_item_costs?: LineItemCost[]
}
```

### Updated LineItemTable Display

```typescript
// In LineItemTable — compute margin and total cost from joined costs
{lineItems.map((item) => {
  const totalCosto = (item.line_item_costs ?? [])
    .reduce((sum, c) => sum + Number(c.costo), 0) * item.cantidad
  const margen = item.precio_venta > 0
    ? ((item.precio_venta - totalCosto / item.cantidad) / item.precio_venta)
    : 0
  const totalVenta = item.precio_venta * item.cantidad

  return (
    <tr key={item.id}>
      {/* ... */}
      <td>{formatMXN(item.precio_venta)}</td>
      <td>{(margen * 100).toFixed(1)}%</td>
      <td>{formatMXN(totalVenta)}</td>
      {/* ... */}
    </tr>
  )
})}
```

### useFieldArray for Cost Sub-Panel

```typescript
// In LineItemForm — cost rows sub-panel
import { useFieldArray } from 'react-hook-form'

// Inside component:
const { fields, append, remove } = useFieldArray({
  control: form.control,
  name: 'costs',  // array field
})

// Render:
{fields.map((field, index) => (
  <div key={field.id} className="flex gap-2 items-end">
    <Select ... /> {/* supplier_id */}
    <Input type="number" ... /> {/* costo */}
    <Button type="button" onClick={() => remove(index)}>Eliminar</Button>
  </div>
))}
<Button type="button" onClick={() => append({ supplier_id: '', costo: 0 })}>
  + Agregar Costo
</Button>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single `costo_proveedor` on `line_items` | `line_item_costs` join table | Phase 7 migration | Allows N suppliers per line item |
| `margen` as direct DB input | `margen` computed from `precio_venta - totalCosto` | Phase 7 | Margin can never drift from actual cost/price |
| `precio_venta` computed from `costo / (1 - margen)` | `precio_venta` as direct user input | Phase 7 | Allows setting price independently of cost structure |
| OC PDF filtered by `line_items.proveedor_id` | OC PDF filtered via `line_item_costs.supplier_id` | Phase 7 | Correctly handles line items with multiple suppliers in one OC |

**Deprecated/outdated after Phase 7:**
- `calcPrecioVenta(costo, margen)` — no longer needed for new line item creation (precio_venta is a direct input). Keep for backward compat in `getProjectForQuote` only if needed, otherwise remove.
- `calcSubtotal(items: { costo_proveedor, margen, cantidad }[])` — replace with `calcSubtotalFromPrecio`.
- `calcTotalCostoProyecto(items: { costo_proveedor, cantidad }[])` — replace with version that sums from `line_item_costs`.

---

## Open Questions

1. **Should `proveedor_id` be retained on `line_items` for display purposes?**
   - What we know: `proveedor_id` on `line_items` was used to identify the "primary" supplier for OC PDF grouping.
   - What's unclear: Whether the business needs a "primary supplier" concept on a line item separate from the cost rows.
   - Recommendation: Drop it. The multi-supplier model makes "primary supplier" ambiguous. OC grouping via `line_item_costs` is more accurate.

2. **How should the LineItemForm handle the cost sub-panel for new line items (before a line_item_id exists)?**
   - What we know: Cost rows require `line_item_id` as a FK. A line item doesn't have an ID until it's inserted.
   - What's unclear: Whether cost rows should be submitted in the same form action as the line item, or separately after creation.
   - Recommendation: Two-step flow — create line item first (returns the new ID), then insert cost rows in separate `createLineItemCostAction` calls. The dialog stays open, showing the new line item's cost sub-panel inline. This avoids a complex nested transaction in a single Server Action.

3. **Does the Quote PDF (`getProjectForQuote`) need to change?**
   - What we know: The quote PDF uses `precio_venta` (computed from cost+margin). After the change, `precio_venta` is a direct column.
   - What's unclear: Whether the old formula-derived `precioVenta` and the new direct `precio_venta` produce the same values for all existing line items.
   - Recommendation: Update `getProjectForQuote` to read `precio_venta` directly from the column (no calculation needed). This simplifies the code and uses the authoritative stored value.

4. **What happens to `aggregateSupplierDebt` in `dashboard.ts`?**
   - What we know: It currently reads `costo_proveedor * cantidad` from `line_items`.
   - What's unclear: After migration, it must sum from `line_item_costs`.
   - Recommendation: Rewrite `aggregateSupplierDebt` to fetch `line_item_costs(costo, supplier_id, line_items(project_id, projects(status)))` and group by supplier. Pure helper signature changes — update unit tests first.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run lib/calculations.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COST-01 | Multiple cost rows can be summed per line item | unit | `npx vitest run lib/calculations.test.ts` | ❌ Wave 0 (new test cases needed) |
| COST-02 | `calcTotalCostoFromCosts([{costo:100},{costo:50}]) === 150` | unit | `npx vitest run lib/calculations.test.ts` | ❌ Wave 0 |
| COST-03 | `precio_venta` stored as direct column, not derived | unit (type check) | `npx vitest run lib/calculations.test.ts` | ❌ Wave 0 |
| COST-04 | `calcMargenFromPrecio(200, 100) === 0.5` and edge case `calcMargenFromPrecio(0, 100) === 0` | unit | `npx vitest run lib/calculations.test.ts` | ❌ Wave 0 |
| COST-05 | `calcSubtotalFromPrecio([{precio_venta:200,cantidad:2}]) === 400` | unit | `npx vitest run lib/calculations.test.ts` | ❌ Wave 0 |
| COST-06 | OC PDF only includes line items with a cost row for that supplier | manual | Manual: Generate OC for Innovika; verify El Roble items absent | N/A |

### Sampling Rate

- **Per task commit:** `npx vitest run lib/calculations.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `lib/calculations.test.ts` — add test cases for `calcTotalCostoFromCosts`, `calcMargenFromPrecio`, `calcSubtotalFromPrecio` (new functions)
- [ ] Existing `calcSubtotal` tests must be updated or removed when the function signature changes

*(No new test infrastructure needed — Vitest is already configured and working.)*

---

## Sources

### Primary (HIGH confidence)

- Codebase direct inspection — `lib/calculations.ts`, `lib/actions/line-items.ts`, `lib/queries/projects.ts`, `lib/queries/dashboard.ts`, `lib/queries/suppliers.ts`, `components/projects/LineItemForm.tsx`, `components/projects/LineItemTable.tsx`, `components/projects/ProjectFinancialSummary.tsx`, `lib/pdf/OrdenCompraTemplate.tsx`, `app/(admin)/proyectos/[id]/page.tsx`, `app/(admin)/proyectos/[id]/orden-compra/route.tsx`
- `supabase/migrations/20260303000001_initial_schema.sql` — confirmed RLS pattern, NUMERIC(12,2) convention, admin-only policies
- `supabase/migrations/20260306000004_gran_total_column.sql` — confirmed migration style (ALTER TABLE, COMMENT ON)
- `.planning/STATE.md` — confirmed architectural decisions: drop vs. keep costo_proveedor, migration reversibility concern, RLS matching policy
- `.planning/REQUIREMENTS.md` — COST-01 through COST-06 requirement text
- `vitest.config.ts` and `package.json` — confirmed test runner setup

### Secondary (MEDIUM confidence)

- Supabase PostgREST join filter limitations (cannot chain `.eq` on nested join columns) — known PostgREST behavior confirmed by general knowledge; the two-step query workaround is a proven pattern for this constraint.

### Tertiary (LOW confidence)

- None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use; no new dependencies
- Architecture: HIGH — based on direct codebase inspection; all affected files identified
- Pitfalls: HIGH — derived from existing code patterns and known Supabase/TypeScript behaviors
- Migration strategy: HIGH — based on actual migration files and Supabase migration behavior

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable stack; Supabase and Next.js APIs unlikely to change in 30 days)
