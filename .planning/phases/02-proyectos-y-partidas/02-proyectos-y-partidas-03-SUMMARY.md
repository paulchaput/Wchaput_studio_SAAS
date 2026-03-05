---
phase: 02-proyectos-y-partidas
plan: "03"
subsystem: ui

tags: [react, nextjs, supabase, shadcn, react-hook-form, zod, line-items, financial-summary]

# Dependency graph
requires:
  - phase: 02-proyectos-y-partidas-01
    provides: calculations.ts (calcPrecioVenta, calcSubtotal, IVA_RATE, DEFAULT_MARGEN), formatters.ts (formatMXN, formatFecha, margenToPercent)
  - phase: 02-proyectos-y-partidas-02
    provides: projects CRUD, getProjectById, getSuppliers, ProjectStatusPipeline, ProjectForm

provides:
  - lib/actions/line-items.ts — createLineItemAction, updateLineItemAction, deleteLineItemAction Server Actions with Zod validation and percent→decimal margen conversion
  - lib/queries/projects.ts — getProjectWithLineItems (project + line_items + suppliers join)
  - components/projects/LineItemForm.tsx — Dialog form for create/edit line items with supplier Select and live precio_venta preview
  - components/projects/LineItemTable.tsx — Table with computed precio_venta/total_venta per row, edit/delete actions
  - components/projects/ProjectFinancialSummary.tsx — Subtotal, IVA (16%), total, costo total, utilidad bruta from calc functions
  - app/(admin)/proyectos/[id]/page.tsx — Project detail Server Component with pipeline, line items section, and financial summary
  - components/ui/dialog.tsx — Shadcn Dialog component (radix-ui based)
  - components/ui/separator.tsx — Shadcn Separator component (radix-ui based)

affects:
  - Phase 3 (Pagos) — project detail page has placeholder comment for Pagos section
  - Phase 4 (Checklist) — project detail page has placeholder for Checklist section
  - Phase 5 (PDF) — financial summary calculations feed into PDF generation

# Tech tracking
tech-stack:
  added: [Shadcn Dialog (radix-ui/react-dialog), Shadcn Separator (radix-ui/react-separator)]
  patterns:
    - margen percent→decimal conversion done exclusively in Zod schema transform (v / 100) — never in components
    - deleteLineItemAction accepts FormData with hidden inputs for type safety (avoids .bind() pattern)
    - Server Actions return { error?: string } — no redirect — page stays on project detail after mutations
    - revalidatePath('/proyectos/'+projectId) called on every mutation to refresh Server Component data
    - Promise.all for parallel server fetches in page Server Component

key-files:
  created:
    - lib/actions/line-items.ts
    - components/projects/LineItemForm.tsx
    - components/projects/LineItemTable.tsx
    - components/projects/ProjectFinancialSummary.tsx
    - app/(admin)/proyectos/[id]/page.tsx
    - components/ui/dialog.tsx
    - components/ui/separator.tsx
  modified:
    - lib/queries/projects.ts (added getProjectWithLineItems)

key-decisions:
  - "deleteLineItemAction accepts FormData (not string args) — uses hidden inputs pattern for type-safe form action assignment"
  - "Shadcn Dialog and Separator components created manually from radix-ui (already installed) rather than npx shadcn@latest add which would fail in this environment"
  - "Zod margen transform (v => v / 100) is the single source of truth for percent→decimal conversion — components always see/display percent integers, DB always stores decimals"
  - "LineItemTable form action wrapper: async (fd) => { await deleteLineItemAction(fd) } satisfies TypeScript void | Promise<void> constraint for form action prop"

patterns-established:
  - "Hidden inputs delete pattern: <form action={async fd => { await deleteAction(fd) }}><input type=hidden name=id /><button type=submit/></form>"
  - "Computed columns pattern: calcPrecioVenta/calcTotalVenta called in component render — NOT stored in DB, NOT computed in query"
  - "Financial summary right-aligned: sm:max-w-sm sm:ml-auto — stacks full-width on mobile"
  - "Line item table: overflow-x-auto wrapper with min-w-[640px] table for mobile horizontal scroll"

requirements-completed: [PROJ-04, PROJ-05, PART-01, PART-02, PART-03, PART-04, PART-05, PART-06, PART-07, PART-08, PART-09, UX-01, UX-02, UX-05]

# Metrics
duration: 27min
completed: 2026-03-05
---

# Phase 2 Plan 03: Line Item Table and Financial Summary Summary

**Editable line item table with gross-margin price calculation and auto-recalculating IVA/subtotal/utilidad summary on project detail page — partners can now build and price complete quotes**

## Performance

- **Duration:** 27 min
- **Started:** 2026-03-05T00:13:11Z
- **Completed:** 2026-03-05T00:39:05Z
- **Tasks:** 2 (+ human-verify checkpoint)
- **Files modified:** 8 created, 1 modified

## Accomplishments
- Complete line item CRUD: create, edit, delete with Server Actions and Zod validation including critical percent→decimal margen conversion
- Project detail page with all sections: metadata header, 6-stage pipeline, line items table, financial summary, internal notes
- Financial summary correctly computes: subtotal (sum of precio_venta * qty), IVA (16% via IVA_RATE constant), total, total costo, utilidad bruta — all from lib/calculations.ts, zero literal 0.16 in components or app files
- All 22 vitest tests still green (Phase 2 Plan 01 calculations and formatters)

## Task Commits

Each task was committed atomically:

1. **Task 1: Line item Server Actions and getProjectWithLineItems query** - `33bb71b` (feat)
2. **Task 2: LineItemForm, LineItemTable, ProjectFinancialSummary, project detail page** - `094e6a9` (feat)

**Plan metadata:** `b20ecab` (docs: complete line items and financial summary plan)

## Files Created/Modified
- `lib/actions/line-items.ts` — Three Server Actions (create/update/delete) with Zod validation; margen transform is the only percent→decimal conversion point
- `lib/queries/projects.ts` — Added getProjectWithLineItems with line_items + suppliers join
- `components/projects/LineItemForm.tsx` — Dialog with react-hook-form; creates or edits a line item; shows live precio_venta preview on blur
- `components/projects/LineItemTable.tsx` — Table rendering all line items with computed prices; edit opens LineItemForm in edit mode; delete uses hidden inputs FormData pattern
- `components/projects/ProjectFinancialSummary.tsx` — All financial totals computed from calc functions; no inline constants
- `app/(admin)/proyectos/[id]/page.tsx` — Server Component; parallel fetch of project+suppliers; renders all page sections
- `components/ui/dialog.tsx` — Shadcn Dialog (manually created from radix-ui)
- `components/ui/separator.tsx` — Shadcn Separator (manually created from radix-ui)

## Decisions Made
- `deleteLineItemAction` accepts `FormData` (not string arguments) so it satisfies the form `action` prop type `(formData: FormData) => void | Promise<void>`. Hidden inputs pass `lineItemId` and `projectId`.
- TypeScript rejected `action={deleteLineItemAction}` because the Server Action returns `Promise<{error?:string}>` not `Promise<void>`. Fixed with inline wrapper `async (fd) => { await deleteLineItemAction(fd) }`.
- Shadcn Dialog and Separator created manually — the `radix-ui` package (monorepo re-export) was already installed, so writing components directly was faster and more reliable than the CLI add command.
- Zod `margen` transform (`v => v / 100`) is the single source of truth for percent→decimal conversion. Components always work with percentage integers (50 = 50%), the DB always stores decimals (0.50).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript error: deleteLineItemAction form action prop type mismatch**
- **Found during:** Task 2 (LineItemTable implementation)
- **Issue:** `action={deleteLineItemAction}` fails TypeScript because the action returns `Promise<{error?: string}>` not `Promise<void>`, but the plan instructed using hidden inputs pattern without specifying the wrapper
- **Fix:** Wrapped with `async (fd) => { await deleteLineItemAction(fd) }` inline, which satisfies `(formData: FormData) => void | Promise<void>`
- **Files modified:** components/projects/LineItemTable.tsx
- **Verification:** `npx tsc --noEmit` exits clean
- **Committed in:** `094e6a9` (Task 2 commit)

**2. [Rule 3 - Blocking] Shadcn Dialog and Separator created manually**
- **Found during:** Task 2 setup (before component creation)
- **Issue:** The plan instructed `npx shadcn@latest add dialog` and `npx shadcn@latest add separator`, but `dialog.tsx` and `separator.tsx` were missing. The radix-ui packages were already installed.
- **Fix:** Created both components manually following the Shadcn new-york style patterns consistent with the existing `select.tsx` component
- **Files modified:** components/ui/dialog.tsx (created), components/ui/separator.tsx (created)
- **Verification:** TypeScript compiles, components render correctly
- **Committed in:** `33bb71b` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both auto-fixes necessary for TypeScript correctness and component availability. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Project detail page complete with line items and financial summary
- Phase 3 (Pagos) placeholder comment in page.tsx at correct insertion point
- All financial calculation functions proven by 22 vitest tests
- Human verification checkpoint approved — Phase 3 (Pagos y Proveedores) can begin

## Self-Check: PASSED

All key files present: lib/actions/line-items.ts, components/projects/LineItemForm.tsx, components/projects/LineItemTable.tsx, components/projects/ProjectFinancialSummary.tsx, app/(admin)/proyectos/[id]/page.tsx, SUMMARY.md

All commits verified: 33bb71b (Task 1), 094e6a9 (Task 2), b20ecab (Plan metadata)

---
*Phase: 02-proyectos-y-partidas*
*Completed: 2026-03-05*
