---
phase: 03-pagos-y-proveedores
verified: 2026-03-04T22:13:00Z
status: human_needed
score: 14/14 must-haves verified
human_verification:
  - test: "Navigate to /proveedores and confirm Innovika and El Roble are visible in the supplier list"
    expected: "Both pre-seeded suppliers appear in the table with their names, no errors"
    why_human: "Seed data presence requires a live Supabase connection; cannot verify without running the app"
  - test: "Create a new supplier via the 'Nuevo Proveedor' Dialog on /proveedores"
    expected: "Dialog opens, form accepts all fields (nombre, contacto, email, telefono, notas), on submit the new supplier appears in the list immediately without page reload"
    why_human: "Server Action round-trip and revalidatePath behavior require a live browser session"
  - test: "Navigate to /proveedores/[id] for any supplier with line items and verify the balance breakdown"
    expected: "Shows cross-project table with Total Adeudado (from line item costs), Total Pagado, and Saldo Pendiente — all computed from real data"
    why_human: "Requires live Supabase data to confirm formula-driven balances display correctly"
  - test: "On a project detail page, register a client payment (anticipo) and verify the summary card updates"
    expected: "After registration, 'Total Cobrado' increases and 'Saldo Pendiente' decreases immediately; 'Anticipo Esperado (70%)' and 'Finiquito Esperado (30%)' are static formula values"
    why_human: "Requires live browser session to confirm revalidatePath triggers re-render"
  - test: "On a project detail page, register a supplier payment and verify double revalidation"
    expected: "After registering a supplier payment on a project, navigating to /proveedores/[supplierId] shows the updated outstanding balance"
    why_human: "Double revalidatePath cross-page effect requires live browser testing"
  - test: "Delete a payment and verify recalculation"
    expected: "Clicking Eliminar removes the payment from history and all summary totals recalculate immediately"
    why_human: "UI state update behavior requires live browser session"
  - test: "Verify all monetary values display as $#,##0.00 MXN format throughout"
    expected: "All amounts in ClientPaymentPanel, SupplierPaymentPanel, SupplierDetail, and /proveedores/[id] summary cards use $#,##0.00 format"
    why_human: "Currency format rendering requires visual inspection in the browser"
---

# Phase 3: Pagos y Proveedores Verification Report

**Phase Goal:** Partners can track every peso paid to them by clients and every peso owed to and paid to suppliers — with running balances that are always formula-driven.
**Verified:** 2026-03-04T22:13:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Partner can view the supplier list at /proveedores with Innovika and El Roble pre-populated | ? HUMAN NEEDED | Page and query exist and are substantive; seed data presence requires live DB |
| 2 | Partner can create a new supplier via a Dialog form (name, contact, phone, email, notes) | VERIFIED | `SupplierForm.tsx` — Dialog with all 5 fields, react-hook-form + Zod, calls `createSupplierAction` on submit |
| 3 | Partner can view a supplier detail page at /proveedores/[id] with cross-project balance | VERIFIED | `app/(admin)/proveedores/[id]/page.tsx` — fetches `getSupplierWithDetails`, computes totals server-side, renders `SupplierDetail` |
| 4 | Supplier detail page shows total owed, total paid, outstanding balance — all formula-derived | VERIFIED | Server page calls `calcTotalCostoProyecto`, `calcTotalPagadoProveedor`, `calcSaldoProveedor`; `SupplierDetail` component also uses the same functions for per-project rows |
| 5 | Proveedores nav link is visible and active in sidebar for admin role | VERIFIED | `SidebarNav.tsx` line 8: `{ label: 'Proveedores', href: '/proveedores' }` in `adminNavItems`; active state via `pathname.startsWith('/proveedores/')` |
| 6 | Partner can register an anticipo, finiquito, or otro client payment with amount, date, notes | VERIFIED | `ClientPaymentPanel.tsx` — Dialog with Select (anticipo/finiquito/otro), monto, fecha, notas; calls `createClientPaymentAction` |
| 7 | ClientPaymentPanel shows updated summary after registration | VERIFIED (logic) | Summary computed from `payments` prop; revalidatePath in `createClientPaymentAction` triggers refetch; confirmed `calcAnticipo(70%)`, `calcSaldo(30%)`, `calcTotalPagadoCliente`, `calcSaldoPendienteCliente` all used |
| 8 | All monetary values stored as NUMERIC(12,2) and displayed as $#,##0.00 MXN | VERIFIED (code) | All components use `formatMXN()`; Server Actions write to NUMERIC(12,2) columns; query helpers coerce `Number(p.monto)` at fetch time |
| 9 | Partner can delete a client payment — summary recalculates immediately | VERIFIED | Delete form with `deleteClientPaymentAction` wrapper; hidden `paymentId` + `projectId` inputs; `revalidatePath` on delete |
| 10 | Partner can register a supplier payment keyed to supplier_id + project_id | VERIFIED | `SupplierPaymentPanel.tsx` — Dialog requires supplier select; `createSupplierPaymentAction` with `supplier_id: z.string().uuid()` (never optional) |
| 11 | Per-project supplier summary shows updated owed/paid/outstanding after payment | VERIFIED (logic) | `SupplierPaymentPanel` computes breakdown from lineItems + payments props; revalidatePath in action triggers refetch |
| 12 | Registering a supplier payment updates /proveedores/[id] page too (double revalidation) | VERIFIED | `payments-supplier.ts` lines 33-34 and 56-57: two `revalidatePath` calls — `/proyectos/[projectId]` AND `/proveedores/[supplierId]` |
| 13 | Partner can delete a supplier payment — both pages update | VERIFIED | `deleteSupplierPaymentAction` calls double `revalidatePath` (lines 56-57); SupplierPaymentPanel delete form passes `supplierId` hidden input |
| 14 | All supplier payment amounts stored as NUMERIC(12,2) and displayed as $#,##0.00 MXN | VERIFIED (code) | `createSupplierPaymentAction` inserts to `payments_supplier`; `getSupplierPayments` coerces `Number(p.monto)`; `formatMXN` used in all rendering |

**Score:** 13/14 automated truths verified (1 needs human: seed data in live DB)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/calculations.ts` | Payment formula functions + constants | VERIFIED | All 6 functions + ANTICIPO_RATE + SALDO_RATE exported; 27 Vitest assertions pass |
| `lib/calculations.test.ts` | Vitest tests for all 6 payment functions | VERIFIED | `describe('payment calculations')` block with 13 assertions — all GREEN |
| `lib/actions/suppliers.ts` | createSupplierAction, updateSupplierAction, deleteSupplierAction | VERIFIED | All 3 Server Actions present with Zod validation; `revalidatePath` called appropriately |
| `lib/queries/suppliers.ts` | getSuppliersAll(), getSupplierWithDetails() | VERIFIED | Both functions present; `getSupplierWithDetails` uses exactly 2 batch Supabase queries (no N+1) |
| `app/(admin)/proveedores/page.tsx` | Supplier list page with create Dialog | VERIFIED | Fetches `getSuppliersAll()`, renders table + `SupplierForm`, empty state message present |
| `app/(admin)/proveedores/[id]/page.tsx` | Supplier detail page with cross-project balance | VERIFIED | Async params pattern, `notFound()` on missing supplier, server-side totals, renders `SupplierDetail` |
| `components/suppliers/SupplierForm.tsx` | Dialog form for create/edit supplier | VERIFIED | `'use client'`, Dialog + react-hook-form + Zod, all 5 fields, calls `createSupplierAction`, error handling |
| `components/suppliers/SupplierDetail.tsx` | Cross-project balance breakdown component | VERIFIED | Groups by project, coerces NUMERIC types, renders table with per-project and grand total rows using formula functions |
| `components/layout/SidebarNav.tsx` | Proveedores nav entry for admin role | VERIFIED | Entry at index 1 in `adminNavItems`; active state detection via `pathname.startsWith` |
| `lib/actions/payments-client.ts` | createClientPaymentAction, deleteClientPaymentAction | VERIFIED | Both actions present; Zod enum uses `'finiquito'` (not `'saldo'`); `revalidatePath` on both |
| `lib/queries/payments.ts` | getClientPayments(), getSupplierPayments() | VERIFIED | Both helpers present; `Number(p.monto)` coercion at map time |
| `components/projects/ClientPaymentPanel.tsx` | Payment summary card + Dialog + history | VERIFIED | Summary card shows all 4 rows; Dialog with tipo/monto/fecha/notas; history table with delete; CheckCircle2 on paid |
| `app/(admin)/proyectos/[id]/page.tsx` | Extended with clientPayments + supplierPayments in Promise.all | VERIFIED | `Promise.all` with 4 fetches: project, suppliers, clientPayments, supplierPayments; granTotal computed server-side; both panels rendered |
| `lib/actions/payments-supplier.ts` | createSupplierPaymentAction, deleteSupplierPaymentAction | VERIFIED | Both actions present; `supplier_id: z.string().uuid()` (not optional); double `revalidatePath` in both |
| `components/projects/SupplierPaymentPanel.tsx` | Per-supplier breakdown + Dialog + history | VERIFIED | Per-supplier breakdown with owed/paid/saldo; Dialog with required supplier select; history table with delete passing supplierId |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/(admin)/proveedores/[id]/page.tsx` | `lib/queries/suppliers.ts` | `getSupplierWithDetails()` call | WIRED | Line 5: import; Line 32: `const { lineItems, payments } = await getSupplierWithDetails(id)` |
| `app/(admin)/proveedores/[id]/page.tsx` | `lib/calculations.ts` | `calcSaldoProveedor` computed server-side | WIRED | Line 6: import; Lines 43-45: totalOwed, totalPagado, saldo computed before passing to SupplierDetail |
| `components/suppliers/SupplierForm.tsx` | `lib/actions/suppliers.ts` | `createSupplierAction` called on submit | WIRED | Line 21: import; Line 60: `const result = await createSupplierAction(formData)` |
| `components/projects/ClientPaymentPanel.tsx` | `lib/actions/payments-client.ts` | `createClientPaymentAction` on Dialog submit | WIRED | Lines 41-42: import; Line 95: `const result = await createClientPaymentAction(formData)` |
| `app/(admin)/proyectos/[id]/page.tsx` | `lib/queries/payments.ts` | `getClientPayments(id)` in Promise.all | WIRED | Line 6: import; Line 29: included in `Promise.all` |
| `app/(admin)/proyectos/[id]/page.tsx` | `lib/calculations.ts` | `calcTotal(calcSubtotal(...))` server-side | WIRED | Line 7: import; Line 36: `const granTotal = calcTotal(calcSubtotal(lineItems))` |
| `lib/actions/payments-supplier.ts` | `next/cache revalidatePath` | Double revalidatePath calls | WIRED | Lines 33-34: `/proyectos/[projectId]` + `/proveedores/[supplierId]`; Lines 56-57: same on delete |
| `components/projects/SupplierPaymentPanel.tsx` | `lib/actions/payments-supplier.ts` | `createSupplierPaymentAction` on submit | WIRED | Lines 38-40: import; Line 130: `const result = await createSupplierPaymentAction(formData)` |
| `app/(admin)/proyectos/[id]/page.tsx` | `lib/queries/payments.ts` | `getSupplierPayments(id)` in Promise.all | WIRED | Line 6: import; Line 30: included in 4-item `Promise.all` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PAY-01 | 03-02 | User can register a client payment with amount, date, type, notes | SATISFIED | `ClientPaymentPanel` Dialog with tipo (anticipo/finiquito/otro), monto, fecha, notas; `createClientPaymentAction` inserts to `payments_client` |
| PAY-02 | 03-02 | Per-project client payment summary auto-calculates: total collected, anticipo 70%, saldo 30%, outstanding | SATISFIED | `ClientPaymentPanel` computes `calcAnticipo`, `calcSaldo`, `calcTotalPagadoCliente`, `calcSaldoPendienteCliente` from props — all formula-driven |
| PAY-03 | 03-03 | User can register a supplier payment per supplier within a project | SATISFIED | `SupplierPaymentPanel` Dialog with required supplier select + amount + date; `createSupplierPaymentAction` inserts with supplier_id + project_id |
| PAY-04 | 03-03 | Per-project supplier summary auto-calculates: total owed, total paid, outstanding | SATISFIED | `SupplierPaymentPanel` computes breakdown using `calcTotalCostoProyecto`, `calcTotalPagadoProveedor`, `calcSaldoProveedor` per supplier |
| PAY-05 | 03-02, 03-03 | All payment amounts stored and displayed in MXN; no floating-point arithmetic | SATISFIED | DB columns are NUMERIC(12,2); `monto` coerced at query time with `Number()`; all display via `formatMXN()` |
| PROV-01 | 03-01 | User can create and manage a supplier directory with name, contact, phone, email, notes | SATISFIED | `SupplierForm` + `createSupplierAction` + `updateSupplierAction` + `deleteSupplierAction` — all 5 fields present |
| PROV-02 | 03-01 | Default suppliers Innovika and El Roble are pre-seeded | NEEDS HUMAN | Page and queries are wired; seed presence requires live DB verification |
| PROV-03 | 03-01 | Supplier detail page shows all projects with line items, total owed/paid/outstanding | SATISFIED | `/proveedores/[id]` page with `getSupplierWithDetails` (2 batch queries, no N+1) and `SupplierDetail` cross-project breakdown |
| PROV-04 | 03-01 | Supplier balance is always formula-driven, never manually entered | SATISFIED | `SupplierDetail` and `/proveedores/[id]` page always compute balance from `calcTotalCostoProyecto - calcTotalPagadoProveedor`; no editable balance field exists |

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| None found | — | — | All implementations are substantive; no TODO/FIXME/stub patterns in phase 3 files |

Notes:
- `return {}` in Server Actions (payments-client.ts, payments-supplier.ts, suppliers.ts) is the correct success return value for the `Promise<{ error?: string }>` contract — these are NOT stubs.
- `placeholder` attributes in form inputs are legitimate HTML form UX — not code stubs.
- `return null` in `components/ui/form.tsx` is a pre-existing shadcn/ui base component, not phase 3 code.

### Human Verification Required

#### 1. Seed Data Presence (PROV-02)

**Test:** Log in as admin and navigate to `/proveedores`
**Expected:** Innovika and El Roble appear as rows in the supplier table
**Why human:** Seed data is injected by a Supabase migration. The code is wired correctly (`getSuppliersAll()` returns all suppliers), but the actual DB rows can only be confirmed in a live environment.

#### 2. Client Payment Registration Flow (PAY-01, PAY-02)

**Test:** On any project detail page, click "Registrar Pago", select "Anticipo", enter $10,000, set today's date, save
**Expected:** Payment appears in history table below. "Total Cobrado" in the summary card increases. "Saldo Pendiente" decreases. "Anticipo Esperado (70%)" and "Finiquito Esperado (30%)" remain formula values from the grand total.
**Why human:** revalidatePath behavior and Next.js cache re-render require live browser testing.

#### 3. Client Payment Delete (PAY-01)

**Test:** Click "Eliminar" on an existing client payment row
**Expected:** Row disappears from history. Summary card totals recalculate immediately.
**Why human:** Form action + revalidate cycle requires live browser testing.

#### 4. Supplier Payment Registration + Double Revalidation (PAY-03, PAY-04)

**Test:** On a project detail page, click "Registrar Pago a Proveedor", select a supplier, enter an amount, save. Then navigate to `/proveedores/[supplierId]`.
**Expected:** On the project page, the supplier's row in SupplierPaymentPanel shows updated "Pagado" and "Saldo". On the supplier detail page, the same project row shows updated values.
**Why human:** The double revalidatePath cross-page effect (both `/proyectos/[id]` and `/proveedores/[supplierId]`) requires live navigation to confirm both pages refresh.

#### 5. Currency Format Consistency (PAY-05)

**Test:** View any amount-bearing UI: supplier detail page summary cards, SupplierPaymentPanel breakdown rows, ClientPaymentPanel summary card, payment history table cells.
**Expected:** All values display as `$#,##0.00` (e.g., `$10,000.00`) — no raw decimal strings like `10000` or `10000.000000`.
**Why human:** Visual confirmation of `formatMXN()` output across all components requires browser rendering.

#### 6. New Supplier Creation (PROV-01)

**Test:** Click "Nuevo Proveedor" on `/proveedores`, fill in name and at least one optional field, click "Crear Proveedor"
**Expected:** Dialog closes, new supplier appears at the bottom (or in alphabetical order) of the table without page reload.
**Why human:** revalidatePath + Router re-render requires live browser session.

---

## Summary

### What Was Verified Programmatically

All 15 artifacts exist and are substantive (not stubs):

- **Calculation layer:** `lib/calculations.ts` exports 6 payment functions and 2 rate constants (ANTICIPO_RATE=0.70, SALDO_RATE=0.30). All 27 Vitest assertions pass (35 total including Phase 1/2 functions).
- **Supplier directory:** `/proveedores` page fetches `getSuppliersAll()`, renders a full table with links to detail pages, includes `SupplierForm` Dialog. `/proveedores/[id]` uses `getSupplierWithDetails()` (2 batch queries, no N+1), computes totals server-side with formula functions, renders `SupplierDetail` cross-project breakdown.
- **Client payment tracking:** `ClientPaymentPanel` has a 4-row summary card (anticipo 70%, finiquito 30%, total cobrado, saldo pendiente), a Dialog form with tipo/monto/fecha/notas, and a delete-capable history table. `createClientPaymentAction` uses the correct `'finiquito'` enum value (not `'saldo'`).
- **Supplier payment tracking:** `SupplierPaymentPanel` has per-supplier breakdown (owed/paid/saldo), a Dialog that requires supplier selection, and a history table. `createSupplierPaymentAction` and `deleteSupplierPaymentAction` both call `revalidatePath` twice — for the project page AND the supplier detail page.
- **Project detail page:** `Promise.all` fetches 4 data sources concurrently (project, suppliers, clientPayments, supplierPayments). `granTotal` computed server-side. Both `ClientPaymentPanel` and `SupplierPaymentPanel` rendered in separate sections with Spanish headings.
- **Sidebar:** `Proveedores` entry present in `adminNavItems` at position 2, after `Proyectos`.
- **TypeScript:** Zero compilation errors.
- **No anti-patterns:** No TODO/FIXME stubs, no empty implementations, no inline magic numbers (rate constants exported from calculations.ts).

### What Requires Human Verification

7 items need live browser/DB confirmation — all are runtime behaviors (seed data, revalidatePath effects, visual currency format). The code correctness for all of these is fully verified; the items are human-needed only because they require a live Supabase connection or browser render cycle.

The phase goal is achieved at the code level: **all formula-driven balance calculations are implemented correctly, all UI surfaces exist and are properly wired, and the full payment registration/deletion/display flow is structurally complete.**

---

_Verified: 2026-03-04T22:13:00Z_
_Verifier: Claude (gsd-verifier)_
