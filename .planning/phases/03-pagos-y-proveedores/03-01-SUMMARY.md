---
phase: 03-pagos-y-proveedores
plan: "01"
subsystem: payments
tags: [vitest, tdd, supabase, next-js, react-hook-form, zod, server-actions]

# Dependency graph
requires:
  - phase: 02-proyectos-y-partidas
    provides: line_items table, projects table, LineItemForm Dialog pattern, Server Action pattern, Supabase client
  - phase: 01-fundacion
    provides: Supplier model, auth, RLS, profiles table, Supabase schema (suppliers, payments_supplier tables)
provides:
  - "Payment calculation functions: calcAnticipo (70%), calcSaldo (30%), calcTotalPagadoCliente, calcSaldoPendienteCliente, calcTotalPagadoProveedor, calcSaldoProveedor, ANTICIPO_RATE, SALDO_RATE constants"
  - "Vitest tests for all 6 new payment calculation functions (13 assertions, all green)"
  - "Supplier CRUD Server Actions: createSupplierAction, updateSupplierAction, deleteSupplierAction"
  - "Extended supplier queries: getSuppliersAll(), getSupplierWithDetails() (two batch queries, no N+1)"
  - "/proveedores route: supplier list with create Dialog, shows Innovika and El Roble from seed"
  - "/proveedores/[id] route: supplier detail page with cross-project balance breakdown"
  - "SupplierForm Dialog component for creating suppliers"
  - "SupplierDetail table component showing per-project: owed, paid, outstanding"
  - "Proveedores nav link already present in SidebarNav for admin role"
affects: [03-02-pagos-proveedor, 03-03-pagos-cliente, 04-checklist, 05-pdf-export]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD (Red-Green) for pure financial functions in lib/calculations.ts"
    - "Two batch queries in getSupplierWithDetails — never N+1 per project (PROV-03)"
    - "ANTICIPO_RATE/SALDO_RATE exported constants — never inline 0.70/0.30 in components"
    - "Number(p.monto) coercion at reduce entry point — Supabase returns NUMERIC(12,2) as strings"

key-files:
  created:
    - lib/actions/suppliers.ts
    - components/suppliers/SupplierForm.tsx
    - components/suppliers/SupplierDetail.tsx
    - app/(admin)/proveedores/page.tsx
    - app/(admin)/proveedores/[id]/page.tsx
  modified:
    - lib/calculations.ts
    - lib/calculations.test.ts
    - lib/queries/suppliers.ts

key-decisions:
  - "ANTICIPO_RATE=0.70 and SALDO_RATE=0.30 exported as named constants — zero inline literals in components or app pages"
  - "getSupplierWithDetails uses two batch queries (line_items + payments_supplier) — never N+1 per project"
  - "Number(p.monto) coercion at reduce entry point in calcTotalPagadoProveedor/calcTotalPagadoCliente — Supabase returns NUMERIC as strings"
  - "SupplierDetail LineItemWithProject type accepts unknown for costo_proveedor/cantidad — coerces at computation site"
  - "Supabase join returns projects as array type in TypeScript — handled with Array.isArray check in SupplierDetail"

patterns-established:
  - "Payment rate constants: always exported from lib/calculations.ts, never inlined"
  - "Batch query pattern: load all related data in 2 queries, group in TypeScript, never N+1"
  - "TDD for financial functions: write failing tests first, then add implementation"

requirements-completed: [PROV-01, PROV-02, PROV-03, PROV-04]

# Metrics
duration: 15min
completed: 2026-03-04
---

# Phase 3 Plan 01: Supplier Directory Summary

**6 payment formula functions with Vitest TDD tests, supplier CRUD Server Actions, /proveedores list + /proveedores/[id] detail page with cross-project balance breakdown using two batch queries**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-04T21:55:00Z
- **Completed:** 2026-03-04T22:02:00Z
- **Tasks:** 3
- **Files modified:** 9 (5 created, 4 modified)

## Accomplishments
- Added 6 payment calculation functions to lib/calculations.ts with ANTICIPO_RATE (0.70) and SALDO_RATE (0.30) constants — all covered by 13 new Vitest assertions (35 total passing)
- Created supplier CRUD Server Actions (create, update, delete) with Zod validation and two extended query functions (getSuppliersAll, getSupplierWithDetails with two batch queries, never N+1)
- Built full /proveedores route group: list page with create Dialog and detail page showing cross-project balance breakdown (owed from line item costs, paid from payment records, outstanding = owed - paid)

## Task Commits

Each task was committed atomically:

1. **Task 1: Payment calculation functions + Vitest tests** - `d3dfa4e` (feat + test, TDD)
2. **Task 2: Supplier CRUD actions + extended queries** - `612d69c` (feat)
3. **Task 3: Supplier directory pages, SupplierForm, SupplierDetail, sidebar nav** - `18342b8` (feat)

## Files Created/Modified
- `lib/calculations.ts` - Added ANTICIPO_RATE, SALDO_RATE, calcAnticipo, calcSaldo, calcTotalPagadoCliente, calcSaldoPendienteCliente, calcTotalPagadoProveedor, calcSaldoProveedor
- `lib/calculations.test.ts` - Added describe('payment calculations') block with 13 assertions
- `lib/queries/suppliers.ts` - Extended with getSuppliersAll() and getSupplierWithDetails() (two-batch pattern)
- `lib/actions/suppliers.ts` - New: createSupplierAction, updateSupplierAction, deleteSupplierAction
- `components/suppliers/SupplierForm.tsx` - New: Dialog form for creating suppliers (react-hook-form + Zod)
- `components/suppliers/SupplierDetail.tsx` - New: Cross-project balance breakdown table (groups by project, coerces NUMERIC types)
- `app/(admin)/proveedores/page.tsx` - New: Supplier list page with create Dialog
- `app/(admin)/proveedores/[id]/page.tsx` - New: Supplier detail page (async params, server-side totals computation)

## Decisions Made
- ANTICIPO_RATE=0.70 and SALDO_RATE=0.30 as exported constants — prevents magic number anti-pattern in payment UI
- getSupplierWithDetails uses exactly two Supabase queries (batch 1: line_items with project join; batch 2: payments_supplier) — satisfies PROV-03 N+1 constraint
- Number() coercion in reduce functions at the entry point — handles Supabase returning NUMERIC(12,2) as strings in JSON
- SupplierDetail accepts `unknown` typed fields and coerces with Number() — cleaner than fighting Supabase generated types

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pre-existing ESLint errors blocking build**
- **Found during:** Task 3 (verification with npm run build)
- **Issue:** Build was already failing before this plan due to unused imports/vars in Phase 2 files: unused PIPELINE_STAGES import (proyectos/page.tsx), unused useState (login/page.tsx), unused _totalCosto (LineItemTable.tsx), unused _formData params (ProjectStatusPipeline.tsx), unused _defaultMargenPercent (line-items.ts)
- **Fix:** Removed unused imports and variables in each file; removed unused function params from async closures
- **Files modified:** app/(admin)/proyectos/page.tsx, app/(auth)/login/page.tsx, components/projects/LineItemTable.tsx, components/projects/ProjectStatusPipeline.tsx, lib/actions/line-items.ts
- **Verification:** npm run build succeeds — /proveedores and /proveedores/[id] appear in build output
- **Committed in:** 18342b8 (Task 3 commit)

**2. [Rule 1 - Bug] Fixed TypeScript type for Supabase join returning array**
- **Found during:** Task 3 (TypeScript compilation)
- **Issue:** Supabase's generated type for `projects` join in line_items query returns an array type in TypeScript, but in practice it's a single object (many-to-one relation). SupplierDetail needed to handle both cases.
- **Fix:** Updated LineItemWithProject.projects type to accept `ProjectInfo | ProjectInfo[] | null`; added Array.isArray() guard when extracting project info
- **Files modified:** components/suppliers/SupplierDetail.tsx
- **Verification:** TypeScript compiles with zero errors
- **Committed in:** 18342b8 (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both auto-fixes essential for build success and type safety. No scope creep.

## Issues Encountered
- Supabase TypeScript inferred types treat foreign-key joins as arrays even for many-to-one relations — handled with Array.isArray guard pattern

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Payment calculation layer complete (calcAnticipo, calcSaldo, etc.) — Plans 02 and 03 can reference these functions directly
- Supplier directory fully functional with pre-seeded Innovika and El Roble
- getSupplierWithDetails() provides the data contracts Plans 02/03 need for payment UI
- No blockers for Phase 3 Plans 02 and 03

---
*Phase: 03-pagos-y-proveedores*
*Completed: 2026-03-04*

## Self-Check: PASSED

All required files exist and all task commits are present in git history.

| Check | Result |
|-------|--------|
| lib/calculations.ts | FOUND |
| lib/calculations.test.ts | FOUND |
| lib/actions/suppliers.ts | FOUND |
| lib/queries/suppliers.ts | FOUND |
| app/(admin)/proveedores/page.tsx | FOUND |
| app/(admin)/proveedores/[id]/page.tsx | FOUND |
| components/suppliers/SupplierForm.tsx | FOUND |
| components/suppliers/SupplierDetail.tsx | FOUND |
| .planning/phases/03-pagos-y-proveedores/03-01-SUMMARY.md | FOUND |
| commit d3dfa4e (Task 1) | FOUND |
| commit 612d69c (Task 2) | FOUND |
| commit 18342b8 (Task 3) | FOUND |
