# Phase 3: Pagos y Proveedores - Research

**Researched:** 2026-03-04
**Domain:** Payment tracking (client and supplier), supplier directory, running balance calculations — Next.js 15 Server Actions + Supabase
**Confidence:** HIGH

---

## Summary

Phase 3 adds two overlapping financial tracking surfaces to an already-built Next.js 15 + Supabase app. The schema for both `payments_client` and `payments_supplier` already exists in the initial migration — fully typed, RLS-protected, with NUMERIC(12,2) columns. No new migrations are needed for the tables themselves; Phase 3 is entirely a UI and Server Actions build.

The client payment flow requires registering `anticipo` / `finiquito` / `otro` payments against a project, then computing a per-project summary (total collected, anticipo expected = 70% of grand total, saldo expected = 30%, outstanding balance). The supplier payment flow requires registering payments keyed to a `supplier_id` + `project_id` pair, then displaying running balances derived from `SUM(line_items.costo_proveedor * cantidad) - SUM(payments_supplier.monto)`. The supplier directory page (PROV-03) aggregates across all projects via a JOIN query — never per-row fetches.

The existing codebase establishes the patterns this phase must follow: Server Actions returning `{ error?: string }`, `revalidatePath` for cache invalidation, `react-hook-form` + Zod for client-side forms, Dialog modals for inline forms, and `calcSubtotal` / `calcTotal` from `lib/calculations.ts` for formula-driven totals. All new payment calculation functions must live in `lib/calculations.ts` and follow the same pure-function pattern already proven for line items.

**Primary recommendation:** Build Phase 3 in three plans: (1) Supplier directory CRUD + supplier detail page with JOIN query aggregation, (2) Client payment registration form + per-project payment summary panel, (3) Supplier payment registration per-project + running balance display. In each plan, add calculation functions to `lib/calculations.ts` first, write Vitest tests for them, then build UI on top.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PAY-01 | User can register a client payment with: amount, date, type (anticipo or saldo), notes | `payments_client` table exists; form follows LineItemForm Dialog pattern; Server Action follows createLineItemAction pattern |
| PAY-02 | Per-project client payment summary auto-calculates: total collected, anticipo expected (70% of grand total), saldo expected (30%), outstanding balance | Grand total from `calcTotal(calcSubtotal(lineItems))` already computed; new `calcAnticipo`, `calcSaldo`, `calcSaldoPendiente` functions needed in calculations.ts |
| PAY-03 | User can register a supplier payment for a line item or for a supplier within a project, with: amount, date, notes | `payments_supplier` table exists with `supplier_id` + `project_id` FK; form follows same Dialog pattern |
| PAY-04 | Per-project supplier summary auto-calculates: total owed (sum of line item costs), total paid, outstanding supplier balance | `calcTotalCostoProyecto` already exists; need `calcSaldoProveedor` = totalOwed - totalPaid |
| PAY-05 | All payment amounts stored and displayed in MXN; no floating-point arithmetic (NUMERIC columns in DB) | NUMERIC(12,2) columns already in schema; `formatMXN` already in formatters.ts |
| PROV-01 | User can create and manage a supplier directory with: name, contact name, phone, email, notes | `suppliers` table exists with all required columns; needs CRUD Server Actions + list/create/edit pages |
| PROV-02 | Default suppliers Innovika and El Roble are pre-seeded | Already seeded in migration 20260303000001 — confirmed present |
| PROV-03 | User can view a supplier detail page showing: all projects with line items from that supplier, total owed across all projects, total paid, outstanding balance | Requires single JOIN query: `suppliers` JOIN `line_items` JOIN `payments_supplier` — never per-row fetches |
| PROV-04 | Supplier balance is always formula-driven (sum of costs across projects minus payments), never manually entered | Pattern established: all calculations in calculations.ts as pure functions; UI receives pre-computed values |
</phase_requirements>

---

## Standard Stack

### Core (already installed — confirmed from package.json)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.2.9 | App framework, Server Actions, routing | Already in use — no change |
| @supabase/supabase-js | ^2.49.2 | DB client | Already in use |
| @supabase/ssr | ^0.6.1 | Server-side Supabase client factory | Already in use; `createClient()` from `lib/supabase/server.ts` |
| react-hook-form | ^7.54.2 | Client-side form state | Already used in LineItemForm |
| @hookform/resolvers | ^3.10.0 | Zod adapter for react-hook-form | Already in use |
| zod | ^3.24.2 | Schema validation | Already used in all Server Actions |
| lucide-react | ^0.478.0 | Icons | Already in use |
| vitest | ^4.0.18 | Unit tests for calculation functions | Already configured |

### UI Components (already available — no new installs needed)

| Component | Source | Used For |
|-----------|--------|----------|
| Dialog | `components/ui/dialog.tsx` (Radix) | Payment registration forms (same as LineItemForm) |
| Button | `components/ui/button.tsx` | Form submission, actions |
| Input | `components/ui/input.tsx` | Amount, date, notes fields |
| Select | `components/ui/select.tsx` | Payment type (anticipo/finiquito/otro), supplier select |
| Textarea | `components/ui/textarea.tsx` | Notes fields |
| Card | `components/ui/card.tsx` | Summary panels |
| Separator | `components/ui/separator.tsx` | Section dividers |
| Table | `components/ui/table.tsx` | Payment history lists |
| Label | `components/ui/label.tsx` | Form labels |

**Installation:** No new packages required. All needed libraries are already installed.

---

## Architecture Patterns

### Recommended Project Structure for Phase 3

```
lib/
├── calculations.ts           # ADD: calcAnticipo, calcSaldo, calcSaldoPendiente,
│                             #       calcTotalPagadoProveedor, calcSaldoProveedor
├── calculations.test.ts      # ADD: tests for new payment formulas
├── actions/
│   ├── payments-client.ts    # NEW: createClientPaymentAction, deleteClientPaymentAction
│   ├── payments-supplier.ts  # NEW: createSupplierPaymentAction, deleteSupplierPaymentAction
│   └── suppliers.ts          # NEW: createSupplierAction, updateSupplierAction, deleteSupplierAction
├── queries/
│   ├── projects.ts           # EXTEND: getProjectWithPayments()
│   └── suppliers.ts          # EXTEND: getSupplierWithBalance(), getSuppliersList()

app/(admin)/
├── proyectos/[id]/
│   └── page.tsx              # EXTEND: add ClientPaymentPanel, SupplierPaymentPanel sections
├── proveedores/
│   ├── page.tsx              # NEW: Supplier list + create form
│   ├── nuevo/page.tsx        # NEW: Create supplier form (or inline Dialog on list page)
│   └── [id]/page.tsx         # NEW: Supplier detail with cross-project balance

components/
├── projects/
│   ├── ClientPaymentPanel.tsx     # NEW: payment history + summary for a project
│   └── SupplierPaymentPanel.tsx   # NEW: per-project supplier payment summary
└── suppliers/
    ├── SupplierList.tsx            # NEW: list with name, balance
    ├── SupplierForm.tsx            # NEW: create/edit Dialog
    └── SupplierDetail.tsx          # NEW: cross-project balance breakdown
```

### Pattern 1: Server Action — Payment Registration (follows existing createLineItemAction pattern)

**What:** Server Action receives FormData, validates with Zod, inserts to Supabase, calls `revalidatePath`, returns `{ error?: string }`.
**When to use:** All create/delete actions for payments_client and payments_supplier.

```typescript
// lib/actions/payments-client.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const clientPaymentSchema = z.object({
  project_id: z.string().uuid(),
  tipo: z.enum(['anticipo', 'finiquito', 'otro']),
  monto: z.coerce.number().positive('El monto debe ser mayor a 0'),
  fecha: z.string().min(1, 'La fecha es requerida'),
  notas: z.string().optional().nullable(),
})

export async function createClientPaymentAction(
  formData: FormData
): Promise<{ error?: string }> {
  const parsed = clientPaymentSchema.safeParse(Object.fromEntries(formData))

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const payload = {
    ...parsed.data,
    notas: parsed.data.notas || null,
  }

  const supabase = await createClient()
  const { error } = await supabase.from('payments_client').insert(payload)

  if (error) return { error: error.message }

  revalidatePath('/proyectos/' + parsed.data.project_id)
  return {}
}
```

### Pattern 2: Payment Summary Calculation — Pure Functions in calculations.ts

**What:** Formula-driven summary values computed in TypeScript from fetched payment rows. Never use DB computed columns or SQL aggregates — keeps the calculation layer testable and isolated.
**When to use:** PAY-02, PAY-04, PROV-03, PROV-04.

```typescript
// lib/calculations.ts additions

// Client payment formulas (PAY-02)
// anticipo = 70% of grand total, saldo = 30%
export const ANTICIPO_RATE = 0.70
export const SALDO_RATE = 0.30

export function calcAnticipo(granTotal: number): number {
  return granTotal * ANTICIPO_RATE
}

export function calcSaldo(granTotal: number): number {
  return granTotal * SALDO_RATE
}

export function calcTotalPagadoCliente(
  payments: Array<{ monto: number }>
): number {
  return payments.reduce((sum, p) => sum + p.monto, 0)
}

export function calcSaldoPendienteCliente(
  granTotal: number,
  totalPagado: number
): number {
  return granTotal - totalPagado
}

// Supplier payment formulas (PAY-04, PROV-04)
export function calcTotalPagadoProveedor(
  payments: Array<{ monto: number }>
): number {
  return payments.reduce((sum, p) => sum + p.monto, 0)
}

// totalOwed = calcTotalCostoProyecto (already exists)
export function calcSaldoProveedor(
  totalOwed: number,
  totalPagado: number
): number {
  return totalOwed - totalPagado
}
```

### Pattern 3: Supplier Detail — Single JOIN Query (PROV-03 requirement)

**What:** One Supabase query returns a supplier with all its projects and line items and payments — no N+1 per-project fetches.
**When to use:** Supplier detail page to compute cross-project totals.

```typescript
// lib/queries/suppliers.ts extension
export async function getSupplierWithDetails(supplierId: string) {
  const supabase = await createClient()

  // Fetch line items across all projects for this supplier
  const { data: lineItems, error: liError } = await supabase
    .from('line_items')
    .select(`
      id, costo_proveedor, cantidad, project_id,
      projects ( id, nombre, cliente_nombre, status )
    `)
    .eq('proveedor_id', supplierId)

  if (liError) throw liError

  // Fetch all supplier payments for this supplier
  const { data: payments, error: pyError } = await supabase
    .from('payments_supplier')
    .select('id, project_id, monto, fecha, notas')
    .eq('supplier_id', supplierId)

  if (pyError) throw pyError

  return { lineItems: lineItems ?? [], payments: payments ?? [] }
}
```

Then compute totals in TypeScript using `calcTotalCostoProyecto` and `calcTotalPagadoProveedor`.

### Pattern 4: Payment Panel Component (Client Component with Dialog)

**What:** Follows the LineItemForm Dialog pattern — Client Component with `useState` for Dialog open/close, `react-hook-form` for form state, calls Server Action on submit, receives payment list as a Server-fetched prop.
**When to use:** ClientPaymentPanel, SupplierPaymentPanel on the project detail page.

```typescript
// Pattern: Client Component wraps server-fetched data
// app/(admin)/proyectos/[id]/page.tsx
const [project, suppliers, clientPayments, supplierPayments] = await Promise.all([
  getProjectWithLineItems(id),
  getSuppliers(),
  getClientPayments(id),      // new query
  getSupplierPayments(id),    // new query
])
```

### Pattern 5: Inline Delete with Hidden Input FormData

**What:** Delete actions use a `<form>` with hidden inputs and `action={deleteAction}` — same pattern as `deleteLineItemAction` using `FormData`.
**When to use:** Payment deletion from history lists.

```typescript
// Established pattern from deleteLineItemAction:
export async function deleteClientPaymentAction(
  formData: FormData
): Promise<{ error?: string }> {
  const paymentId = formData.get('paymentId') as string
  const projectId = formData.get('projectId') as string
  // ...
}
```

### Anti-Patterns to Avoid

- **Per-row supplier balance fetches:** Never fetch payments one-by-one per project in the supplier detail page. Use a single batch query then aggregate in TypeScript.
- **Floating-point arithmetic on payment sums:** Never use JavaScript addition directly on raw DB numbers that came via JSON (Supabase returns NUMERIC as strings in some contexts). Always use `Number()` coercion once and keep all math in pure functions.
- **Hardcoding 70% / 30%:** Export `ANTICIPO_RATE = 0.70` and `SALDO_RATE = 0.30` as named constants in `calculations.ts` — do not inline the literal anywhere else (UX-05 requirement).
- **SQL aggregates for balance:** Do not use Supabase RPC or DB views for payment balance calculations. Keep them in TypeScript so they are testable, consistent with existing patterns, and visible in the calculations.ts file.
- **Storing computed balances:** Never write a "balance" column. All balances are always derived: `totalOwed - totalPaid`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Custom validation logic | Zod schema in Server Action | Already proven; catches type coercion edge cases |
| Client form state | Raw `useState` per field | `react-hook-form` + `zodResolver` | Already installed; handles validation, dirty state, reset |
| Dialog modal | Custom CSS overlay | `components/ui/dialog.tsx` (Radix) | Already exists; accessible, keyboard-trappable |
| Currency display | Custom number formatter | `formatMXN()` from `lib/formatters.ts` | Already proven; correct MXN locale |
| Cache invalidation | Manual state update | `revalidatePath()` from `next/cache` | Next.js handles re-fetch of Server Component data |
| Supabase client | New client factory | `createClient()` from `lib/supabase/server.ts` | Already handles cookie auth; do not duplicate |

**Key insight:** Every pattern needed for Phase 3 already exists in the codebase from Phase 2. The phase is an extension, not a new paradigm.

---

## Common Pitfalls

### Pitfall 1: Supabase Returns NUMERIC as String

**What goes wrong:** Supabase JS client returns `NUMERIC(12,2)` columns as JavaScript strings (`"1500.00"`) when the column type is not recognized as a number by the PostgREST response. Arithmetic on strings produces NaN or string concatenation.
**Why it happens:** PostgREST returns NUMERIC as string to avoid precision loss during JSON serialization.
**How to avoid:** Always coerce: `Number(row.monto)` or use `z.coerce.number()` in Zod schema before arithmetic. The existing codebase already does this for `costo_proveedor` in line items — verify the same for payment rows.
**Warning signs:** Balance summaries showing `NaN` or `"0.001500.00"` concatenation in the UI.

### Pitfall 2: `tipo` Field Mismatch — Schema vs. Requirements

**What goes wrong:** The `payments_client` table CHECK constraint uses `('anticipo', 'finiquito', 'otro')` but the requirements use the word "saldo" (PAY-01 says "anticipo or saldo"). The DB column `tipo` does not have a 'saldo' value.
**Why it happens:** The schema was defined in Phase 1 with 'finiquito' (the correct term for final settlement in Mexican business), but the requirements doc uses 'saldo' colloquially.
**How to avoid:** Use `'finiquito'` in the DB and Server Actions. In UI labels, display "Finiquito" (or "Saldo Final" as a display alias). Do not change the DB schema. The Zod enum must be `z.enum(['anticipo', 'finiquito', 'otro'])` to match the DB CHECK constraint.
**Warning signs:** Supabase insert returning `check_violation` error.

### Pitfall 3: revalidatePath Scope Too Narrow for Supplier Detail

**What goes wrong:** After registering a supplier payment on a project, calling `revalidatePath('/proyectos/' + projectId)` alone does not invalidate the supplier detail page. The supplier page shows a stale outstanding balance.
**Why it happens:** Next.js path revalidation is exact — a different URL path is not invalidated.
**How to avoid:** After any `payments_supplier` insert or delete, also call `revalidatePath('/proveedores/' + supplierId)`. Server Actions can call `revalidatePath` multiple times.

```typescript
revalidatePath('/proyectos/' + parsed.data.project_id)
revalidatePath('/proveedores/' + parsed.data.supplier_id)
```

### Pitfall 4: Supplier Payment Without supplier_id

**What goes wrong:** `payments_supplier` has `supplier_id UUID REFERENCES public.suppliers(id)` but the FK is nullable (no NOT NULL). If a supplier payment is inserted without a `supplier_id`, it is orphaned and cannot appear in supplier balance queries.
**Why it happens:** The schema allows nullable `supplier_id` for flexibility, but the business requirement (PROV-04) requires all supplier payments to be associated with a supplier.
**How to avoid:** In the `supplierPaymentSchema` Zod validation, make `supplier_id` required: `z.string().uuid()` (not `.optional()`). In the UI, always show a supplier Select dropdown and require selection before submission.

### Pitfall 5: N+1 in Supplier Detail Aggregation

**What goes wrong:** Fetching supplier details by looping over projects and fetching payments per-project produces N+1 Supabase queries, one per project.
**Why it happens:** Natural loop instinct when joining data.
**How to avoid:** Use two batch queries (one for all line items for this supplier across all projects, one for all payments for this supplier), then aggregate in TypeScript. See Pattern 3 above.

### Pitfall 6: Grand Total Not Available When Computing Client Payment Summary

**What goes wrong:** The client payment summary needs `granTotal` (total with IVA) to compute anticipo expected and saldo expected. But `getProjectById` does not return line items, so `granTotal` must be computed.
**Why it happens:** `getProjectById` only returns the project row. Grand total is a derived value.
**How to avoid:** Reuse `getProjectWithLineItems(id)` (already exists) and compute grand total with `calcTotal(calcSubtotal(lineItems))` in the Server Component before passing to ClientPaymentPanel. Never pass raw line items to a Client Component that then computes grand total — compute on server.

---

## Code Examples

Verified patterns from the existing codebase:

### Existing: Server Action Pattern (from lib/actions/line-items.ts)
```typescript
'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export async function createLineItemAction(
  formData: FormData
): Promise<{ error?: string }> {
  const parsed = lineItemSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { error } = await supabase.from('line_items').insert(payload)
  if (error) return { error: error.message }

  revalidatePath('/proyectos/' + parsed.data.project_id)
  return {}
}
```

### Existing: Formula-Driven Totals Pattern (from lib/calculations.ts)
```typescript
// Pure functions, no side effects, all testable with Vitest
export function calcTotalCostoProyecto(
  items: Array<{ costo_proveedor: number; cantidad: number }>
): number {
  return items.reduce((sum, item) => sum + calcTotalCosto(item.costo_proveedor, item.cantidad), 0)
}
```

### Existing: Dialog Form Pattern (from components/projects/LineItemForm.tsx)
```typescript
'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'

export function LineItemForm({ projectId, suppliers }: LineItemFormProps) {
  const [open, setOpen] = useState(false)
  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues })

  async function onSubmit(values: FormValues) {
    const formData = new FormData()
    // append fields...
    const result = await createLineItemAction(formData)
    if (result.error) { /* show error */ return }
    setOpen(false)
    form.reset(defaultValues)
  }
  // ...
}
```

### Existing: Parallel Data Fetching (from app/(admin)/proyectos/[id]/page.tsx)
```typescript
const [project, suppliers] = await Promise.all([
  getProjectWithLineItems(id).catch(() => null),
  getSuppliers(),
])
```

### Existing: Delete with Hidden FormData Inputs
```typescript
export async function deleteLineItemAction(
  formData: FormData
): Promise<{ error?: string }> {
  const lineItemId = formData.get('lineItemId') as string
  const projectId = formData.get('projectId') as string
  // ...
}
// Usage in JSX:
<form action={deleteLineItemAction}>
  <input type="hidden" name="lineItemId" value={item.id} />
  <input type="hidden" name="projectId" value={projectId} />
  <button type="submit">Eliminar</button>
</form>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` with `getAll/setAll` | Phase 1 decision | Cookie handler already configured; do not import old package |
| `tailwindcss-animate` | `tw-animate-css` | Phase 1 decision | Already in use; do not add tailwindcss-animate |
| `npx shadcn@latest add` | Manual Radix component creation | Phase 2 decision | CLI fails in this environment; copy-create component files manually |
| `@supabase/auth-helpers-nextjs` router client | `createClient()` from `lib/supabase/server.ts` | Phase 1 decision | All Server Components and Server Actions use this factory |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Replaced by `@supabase/ssr`. Not installed in this project.
- `next/router` (pages router): This project uses App Router exclusively.

---

## Open Questions

1. **Supplier payment — should it be linked to a specific line item or just a supplier+project?**
   - What we know: The schema has `payments_supplier(project_id, supplier_id)` — no `line_item_id` FK. PAY-03 says "for a line item or for a supplier within a project" but the schema only supports supplier-level granularity.
   - What's unclear: Whether the planner should add a `line_item_id` column to `payments_supplier` or treat all payments at supplier+project level.
   - Recommendation: Implement at supplier+project level (matching the schema). A payment is "for all line items from this supplier on this project." Do not add `line_item_id` FK in Phase 3 — this is a v2 concern. The supplier breakdown in PROV-03 does not require line-item-level payment linkage.

2. **Supplier directory navigation: separate `/proveedores` route or sidebar entry?**
   - What we know: The sidebar is `AppSidebar.tsx` with `SidebarNav`. Navigation is in Spanish. The admin layout is in `app/(admin)/layout.tsx`.
   - What's unclear: Whether `/proveedores` needs a new sidebar item added.
   - Recommendation: Yes, add a "Proveedores" entry to the sidebar nav. The sidebar is a Server Component (`AppSidebar.tsx`) with `SidebarNav` as a Client Component for active state — follow the same pattern.

3. **Delete payments: should partners be able to delete client or supplier payments?**
   - What we know: Requirements say "register" but not "delete". The line items have delete. RLS allows admin full CRUD on both payment tables.
   - What's unclear: Whether the planner should add delete actions.
   - Recommendation: Implement delete for both payment types (small forms with hidden inputs). It is far more costly to add this later if partners make data entry errors.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.18 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run lib/calculations.test.ts lib/formatters.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements - Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PAY-02 | calcAnticipo(granTotal) = granTotal * 0.70 | unit | `npx vitest run lib/calculations.test.ts` | Wave 0 — add to existing file |
| PAY-02 | calcSaldo(granTotal) = granTotal * 0.30 | unit | `npx vitest run lib/calculations.test.ts` | Wave 0 — add to existing file |
| PAY-02 | calcTotalPagadoCliente sums payment array | unit | `npx vitest run lib/calculations.test.ts` | Wave 0 — add to existing file |
| PAY-02 | calcSaldoPendienteCliente = granTotal - paid | unit | `npx vitest run lib/calculations.test.ts` | Wave 0 — add to existing file |
| PAY-04 | calcTotalPagadoProveedor sums supplier payments | unit | `npx vitest run lib/calculations.test.ts` | Wave 0 — add to existing file |
| PAY-04 | calcSaldoProveedor = owed - paid | unit | `npx vitest run lib/calculations.test.ts` | Wave 0 — add to existing file |
| PAY-05 | NUMERIC columns in DB; no float | schema | manual — verified in migration | N/A (schema confirmed) |
| PROV-02 | Innovika and El Roble seeded | manual | Check via Supabase dashboard | N/A (seeded in migration) |
| PROV-04 | Balance is formula-driven, not stored | unit | `npx vitest run lib/calculations.test.ts` | Wave 0 — add to existing file |

### Sampling Rate
- **Per task commit:** `npx vitest run lib/calculations.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] New test cases in `lib/calculations.test.ts` — covers PAY-02, PAY-04, PROV-04 calculation functions (file exists, needs new `describe` block for payment formulas)

*(Existing test infrastructure covers the framework; only new calculation function tests are needed)*

---

## Sources

### Primary (HIGH confidence)
- `/Users/paulchaput/primer_proyecto_claudecode/supabase/migrations/20260303000001_initial_schema.sql` — complete schema for `payments_client`, `payments_supplier`, `suppliers` tables, RLS policies, seeded suppliers
- `/Users/paulchaput/primer_proyecto_claudecode/lib/calculations.ts` — existing calculation patterns
- `/Users/paulchaput/primer_proyecto_claudecode/lib/actions/line-items.ts` — Server Action pattern used throughout
- `/Users/paulchaput/primer_proyecto_claudecode/components/projects/LineItemForm.tsx` — Dialog form pattern
- `/Users/paulchaput/primer_proyecto_claudecode/lib/types.ts` — TypeScript types for `PaymentClient`, `PaymentSupplier`, `Supplier`
- `/Users/paulchaput/primer_proyecto_claudecode/package.json` — confirmed installed libraries
- `/Users/paulchaput/primer_proyecto_claudecode/vitest.config.ts` — test configuration

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` — official requirements definitions
- `.planning/ROADMAP.md` — confirmed 3-plan structure for this phase
- `.planning/STATE.md` — prior decisions that constrain implementation

### Tertiary (LOW confidence)
- None — all findings are directly verified from source code and project documents.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified present in package.json; no new installs required
- Architecture: HIGH — patterns directly copied from Phase 2 implementation verified in source code
- Pitfalls: HIGH — pitfall 1 (NUMERIC as string) and pitfall 2 (tipo field mismatch) verified directly from schema; others derived from established Next.js/Supabase patterns
- Calculation formulas: HIGH — follows identical pattern to existing calcSubtotal/calcTotal/calcTotalCostoProyecto functions

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable stack — no fast-moving dependencies)
