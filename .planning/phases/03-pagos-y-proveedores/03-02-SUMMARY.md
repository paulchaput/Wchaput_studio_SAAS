---
phase: 03-pagos-y-proveedores
plan: "02"
subsystem: payments
tags: [supabase, react-hook-form, zod, next-server-actions, shadcn-dialog, shadcn-card]

# Dependency graph
requires:
  - phase: 03-01
    provides: calculations.ts payment functions (calcAnticipo, calcSaldo, calcTotalPagadoCliente, calcSaldoPendienteCliente), payments_client DB table, PaymentClient/PaymentSupplier types
  - phase: 02-03
    provides: Dialog, Select, Input, Card UI components; deleteLineItemAction form action wrapper pattern
provides:
  - createClientPaymentAction Server Action (payments_client insert with Zod validation)
  - deleteClientPaymentAction Server Action (payments_client delete by id)
  - getClientPayments(projectId) query helper (returns PaymentClient[] with monto coerced to number)
  - getSupplierPayments(projectId) query helper (returns PaymentSupplier[] with monto coerced to number)
  - ClientPaymentPanel component (summary card + Dialog registration form + payment history table with delete)
  - Project detail page extended with Pagos del Cliente section and server-side granTotal computation
affects: [03-03, phase-04-checklist, phase-05-pdf]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Form action void wrapper: action={async (fd) => { await serverAction(fd) }} discards return value to satisfy TypeScript void constraint"
    - "Server-side granTotal: calcTotal(calcSubtotal(lineItems)) computed in page.tsx, passed as prop to avoid client-side recalculation"
    - "Parallel fetch pattern: Promise.all([getProjectWithLineItems, getSuppliers, getClientPayments]) for all data fetched concurrently"

key-files:
  created:
    - lib/actions/payments-client.ts
    - lib/queries/payments.ts
    - components/projects/ClientPaymentPanel.tsx
  modified:
    - app/(admin)/proyectos/[id]/page.tsx

key-decisions:
  - "Used async form action wrapper (async (fd) => { await deleteClientPaymentAction(fd) }) — same pattern as deleteLineItemAction to satisfy TypeScript void constraint for form action prop"
  - "granTotal computed server-side in page.tsx using calcTotal(calcSubtotal(lineItems)) and passed as prop — avoids duplicate calculation in client component"
  - "getClientPayments added to existing Promise.all in page.tsx — no sequential await, preserves parallel fetch pattern from 02-03"

patterns-established:
  - "Payment query helpers: coerce monto to Number() at map time — downstream components receive number, not string"
  - "Server Action validation: Zod safeParse on Object.fromEntries(formData), return { error: string } on failure"
  - "Summary card pattern: Card + CardHeader + CardContent with labeled rows using flex justify-between"

requirements-completed: [PAY-01, PAY-02, PAY-05]

# Metrics
duration: 2min
completed: 2026-03-05
---

# Phase 03 Plan 02: Client Payment Panel Summary

**Client payment registration panel with Dialog form, summary card (anticipo 70%/finiquito 30%/total cobrado/saldo pendiente), and payment history with delete, integrated into the project detail page**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-05T04:04:41Z
- **Completed:** 2026-03-05T04:06:41Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Server Actions for client payment create/delete with Zod validation and revalidatePath
- Query helpers for client and supplier payments with monto coercion at fetch time
- ClientPaymentPanel with 4-row summary card (anticipo expected 70%, finiquito expected 30%, total cobrado, saldo pendiente with CheckCircle2 when paid)
- Dialog registration form using react-hook-form with tipo Select, monto, fecha, notas fields
- Payment history table with per-row delete forms using hidden inputs pattern
- Project detail page extended: granTotal computed server-side, getClientPayments in Promise.all, Pagos del Cliente section rendered

## Task Commits

Each task was committed atomically:

1. **Task 1: Client payment Server Actions + query helpers** - `5db2fce` (feat)
2. **Task 2: ClientPaymentPanel + project detail page integration** - `43047ba` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `lib/actions/payments-client.ts` - createClientPaymentAction, deleteClientPaymentAction Server Actions
- `lib/queries/payments.ts` - getClientPayments, getSupplierPayments query helpers
- `components/projects/ClientPaymentPanel.tsx` - Summary card + Dialog form + payment history table
- `app/(admin)/proyectos/[id]/page.tsx` - Extended with getClientPayments, granTotal, ClientPaymentPanel section

## Decisions Made
- Applied `async (fd) => { await deleteClientPaymentAction(fd) }` wrapper pattern for form action — same as deleteLineItemAction pattern in LineItemTable to satisfy TypeScript's `void | Promise<void>` constraint on form action prop
- granTotal computed server-side (not in client component) — keeps financial calculation in server where lineItems data already lives, passed as prop to ClientPaymentPanel
- getClientPayments included in Promise.all alongside existing queries — no sequential await, data fetched in parallel

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript error on deleteClientPaymentAction form action**
- **Found during:** Task 2 (ClientPaymentPanel creation)
- **Issue:** `action={deleteClientPaymentAction}` caused TS2322 — Server Action returns `Promise<{ error?: string }>` but form action requires `Promise<void>`
- **Fix:** Wrapped with `async (fd) => { await deleteClientPaymentAction(fd) }` — matches existing deleteLineItemAction pattern in LineItemTable
- **Files modified:** components/projects/ClientPaymentPanel.tsx
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** 43047ba (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — TypeScript type mismatch)
**Impact on plan:** Required fix, same pattern already established in Phase 2. No scope creep.

## Issues Encountered
- TypeScript rejected direct Server Action assignment to form action prop due to return type mismatch — resolved by applying existing void wrapper pattern from LineItemTable (already a project convention, not a new pattern).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Client payment tracking fully operational: create, list, delete, summary calculations
- getSupplierPayments query helper available for Plan 03-03 (supplier payment panel)
- lib/queries/payments.ts provides both client and supplier query helpers — Plan 03-03 can import getSupplierPayments directly
- No blockers for Phase 3 Plan 3

## Self-Check: PASSED

- FOUND: lib/actions/payments-client.ts
- FOUND: lib/queries/payments.ts
- FOUND: components/projects/ClientPaymentPanel.tsx
- FOUND: app/(admin)/proyectos/[id]/page.tsx (modified)
- FOUND: .planning/phases/03-pagos-y-proveedores/03-02-SUMMARY.md
- Commit 5db2fce verified: feat(03-02) client payment Server Actions + query helpers
- Commit 43047ba verified: feat(03-02) ClientPaymentPanel component + project detail page integration
- TypeScript: 0 errors
- Tests: 35 passed, 0 failed
- Build: successful

---
*Phase: 03-pagos-y-proveedores*
*Completed: 2026-03-05*
