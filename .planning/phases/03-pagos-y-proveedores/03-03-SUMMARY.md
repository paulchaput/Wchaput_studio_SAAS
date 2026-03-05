---
phase: 03-pagos-y-proveedores
plan: "03"
subsystem: payments
tags: [next.js, supabase, react-hook-form, zod, server-actions, revalidatePath]

# Dependency graph
requires:
  - phase: 03-01
    provides: supplier directory, getSuppliers query, /proveedores/[id] page
  - phase: 03-02
    provides: getSupplierPayments query, ClientPaymentPanel pattern, client payment Server Actions
  - phase: 02-03
    provides: LineItemTable with proveedor_id + suppliers join, calcTotalCostoProyecto
provides:
  - createSupplierPaymentAction (Server Action with double revalidatePath)
  - deleteSupplierPaymentAction (Server Action with double revalidatePath)
  - SupplierPaymentPanel component with per-supplier owed/paid/outstanding breakdown
  - Project detail page extended to 4 parallel fetches including supplierPayments
affects:
  - 04-checklist
  - 05-pdf

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Double revalidatePath: /proyectos/[id] AND /proveedores/[supplierId] on supplier payment mutation
    - Per-supplier breakdown derived from lineItems + payments without server roundtrips
    - Fall-back supplier list: suppliersOnProject derived from lineItems, falls back to full suppliers list

key-files:
  created:
    - lib/actions/payments-supplier.ts
    - components/projects/SupplierPaymentPanel.tsx
  modified:
    - app/(admin)/proyectos/[id]/page.tsx

key-decisions:
  - "Double revalidatePath on supplier payment mutation: /proyectos/[id] AND /proveedores/[supplierId] — updates both pages in one Server Action call"
  - "supplier_id enforced as z.string().uuid() (not optional) in Zod schema — prevents orphaned payments invisible on supplier detail page"
  - "suppliersOnProject derived from lineItems proveedor_id values — only shows contextually relevant suppliers in dialog, falls back to full list"
  - "Promise.all extended to 4 parallel fetches in project detail page — maintains parallel fetch pattern from 02-03"

patterns-established:
  - "Double revalidatePath pattern: always revalidate both entity pages when a cross-entity payment is mutated"
  - "Supplier breakdown computed client-side from lineItems + payments props — avoids extra server queries"

requirements-completed: [PAY-03, PAY-04, PAY-05]

# Metrics
duration: 5min
completed: 2026-03-05
---

# Phase 3 Plan 03: Supplier Payment Tracking Summary

**Supplier payment Server Actions with double revalidatePath, SupplierPaymentPanel with per-supplier owed/paid/saldo breakdown, integrated into project detail page alongside ClientPaymentPanel**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-05T04:08:00Z
- **Completed:** 2026-03-05T04:10:34Z
- **Tasks:** 3 (2 auto + 1 checkpoint auto-approved)
- **Files modified:** 3

## Accomplishments
- createSupplierPaymentAction and deleteSupplierPaymentAction with dual revalidatePath (project page + supplier detail page) — closes the loop between payments_supplier table and both display surfaces
- SupplierPaymentPanel Client Component with per-supplier cost breakdown (total owed from line items, total paid, outstanding saldo), react-hook-form dialog for payment registration, and payment history table with inline delete
- Project detail page extended to 4 parallel fetches and SupplierPaymentPanel rendered after ClientPaymentPanel section

## Task Commits

Each task was committed atomically:

1. **Task 1: Supplier payment Server Actions** - `c20e777` (feat)
2. **Task 2: SupplierPaymentPanel + project detail page integration** - `885afdf` (feat)
3. **Task 3: Checkpoint human-verify** - Auto-approved (auto_advance = true)

## Files Created/Modified
- `lib/actions/payments-supplier.ts` - createSupplierPaymentAction + deleteSupplierPaymentAction with Zod validation and double revalidatePath
- `components/projects/SupplierPaymentPanel.tsx` - Per-supplier breakdown table, Dialog registration form, payment history with delete
- `app/(admin)/proyectos/[id]/page.tsx` - Extended Promise.all to 4 fetches, added SupplierPaymentPanel section with Separator

## Decisions Made
- supplier_id enforced as `z.string().uuid()` (never optional) in both Zod schema and zodResolver client-side — prevents orphaned payments that would be invisible on the supplier detail page
- suppliersOnProject derived from lineItems proveedor_id values (contextually filtered), falls back to full suppliers list when no line items have supplier assignments yet
- Promise.all extended with getSupplierPayments(id) as fourth parallel fetch — preserves the parallel fetch pattern established in 02-03

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compiled cleanly on first attempt for both files.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 3 complete: full payment tracking for both clients and suppliers with double revalidation
- Phase 4 (checklist) can import project detail page structure and extend with checklist section
- SupplierPaymentPanel available for context in future phases that reference supplier financial data

---
*Phase: 03-pagos-y-proveedores*
*Completed: 2026-03-05*

## Self-Check: PASSED
- lib/actions/payments-supplier.ts: FOUND
- components/projects/SupplierPaymentPanel.tsx: FOUND
- .planning/phases/03-pagos-y-proveedores/03-03-SUMMARY.md: FOUND
- Commit c20e777 (Task 1): FOUND
- Commit 885afdf (Task 2): FOUND
