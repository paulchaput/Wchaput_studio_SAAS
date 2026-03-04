---
phase: 02-proyectos-y-partidas
plan: "02"
subsystem: ui
tags: [react, next.js, supabase, react-hook-form, zod, shadcn, server-actions]

# Dependency graph
requires:
  - phase: 02-01
    provides: calcSubtotal, calcTotal, formatMXN, formatFecha from calculations.ts and formatters.ts
  - phase: 01-fundacion
    provides: Supabase client, auth patterns, Project/LineItem types, database schema

provides:
  - createProjectAction, updateProjectAction, updateProjectStatusAction Server Actions
  - getProjects (with line_items financial summary), getProjectById query helpers
  - getSuppliers query for dropdown (used in Plan 03)
  - ProjectForm client component (create/edit modes, Spanish labels, mobile-first)
  - ProjectStatusPipeline component (6-stage stepper with advance/revert form actions)
  - /proyectos list page with status badges and MXN-formatted totals
  - /proyectos/nuevo create page
  - /proyectos/[id]/editar edit page with prefilled form
  - Postgres trigger for updated_at auto-update on projects table

affects: [03-partidas, 04-pagos, 05-pdf, 06-reportes]

# Tech tracking
tech-stack:
  added: [shadcn/badge, shadcn/textarea, shadcn/select, shadcn/table]
  patterns:
    - Server Actions follow { error?: string } return pattern; redirect() called on success
    - Client Components use useForm + zodResolver; call Server Actions from handleSubmit
    - Server Actions bound via .bind(null, id, status) pattern for form action prop
    - Pipeline status uses form actions (no onClick) — works without JavaScript

key-files:
  created:
    - supabase/migrations/20260304000002_updated_at_trigger.sql
    - lib/actions/projects.ts
    - lib/queries/projects.ts
    - lib/queries/suppliers.ts
    - components/projects/ProjectForm.tsx
    - components/projects/ProjectStatusPipeline.tsx
    - app/(admin)/proyectos/page.tsx
    - app/(admin)/proyectos/nuevo/page.tsx
    - app/(admin)/proyectos/[id]/editar/page.tsx
  modified:
    - package.json (added Radix select dependency via shadcn)

key-decisions:
  - "Server Action return type wrapped in void-compatible async wrapper for form action prop compatibility (TypeScript strict)"
  - "Pipeline advance/revert uses Server Actions via .bind() pattern — no inline use server in Client Components"
  - "getProjects computes subtotal/gran_total in TypeScript (not SQL) using calcSubtotal/calcTotal from calculations.ts"
  - "EditarProyectoPage uses params as Promise<{ id: string }> for Next.js 15 async params API"

patterns-established:
  - "Server Action pattern: 'use server', createClient(), zod parse, supabase call, revalidatePath/redirect or return { error }"
  - "Form action wrappers: async (_formData: FormData) => { await serverAction(bound, args) } for type compatibility"
  - "Query helpers: createClient(), select with nested relations, throw on error, return mapped data"
  - "Mobile-first layout: single column inputs with sm:flex-row for button rows"

requirements-completed: [PROJ-01, PROJ-02, PROJ-03, PROJ-04, PROJ-05, PROJ-06, PROJ-07, PART-09, UX-01, UX-02]

# Metrics
duration: 6min
completed: 2026-03-04
---

# Phase 02 Plan 02: Proyectos CRUD Summary

**Project CRUD with 6-stage pipeline (Prospecto to Cerrado), MXN financial totals from line items, and mobile-first forms via react-hook-form + zod Server Actions**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-04T23:37:19Z
- **Completed:** 2026-03-04T23:43:04Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments

- Full project CRUD: create, list, edit routes all functional with Spanish labels
- 6-stage pipeline (Prospecto, Cotizado, Anticipo Recibido, En Produccion, Entregado, Cerrado) with Avanzar/Retroceder form buttons
- Financial totals computed in TypeScript using calcSubtotal/calcTotal from Plan 01 — list page shows MXN-formatted gran_total per project
- Dates displayed via formatFecha (DD/MMM/YYYY) throughout
- Supabase trigger ensures updated_at is auto-set on every project UPDATE

## Task Commits

Each task was committed atomically:

1. **Task 1: Supabase migration + Server Actions + query helpers** - `8648d84` (feat)
2. **Task 2: ProjectForm, ProjectStatusPipeline, and page routes** - `b32d664` (feat)

## Files Created/Modified

- `supabase/migrations/20260304000002_updated_at_trigger.sql` - Postgres BEFORE UPDATE trigger for projects.updated_at
- `lib/actions/projects.ts` - createProjectAction, updateProjectAction, updateProjectStatusAction Server Actions
- `lib/queries/projects.ts` - getProjects (with nested line_items + financial summary), getProjectById
- `lib/queries/suppliers.ts` - getSuppliers for dropdown in line item form (Plan 03 dependency)
- `components/projects/ProjectForm.tsx` - Client Component with react-hook-form + zod, create/edit modes, all Spanish labels
- `components/projects/ProjectStatusPipeline.tsx` - 6-stage pipeline stepper with Server Action form buttons
- `app/(admin)/proyectos/page.tsx` - Server Component list with responsive table, status badges, MXN totals
- `app/(admin)/proyectos/nuevo/page.tsx` - Simple wrapper rendering ProjectForm in create mode
- `app/(admin)/proyectos/[id]/editar/page.tsx` - Server Component fetching project and rendering ProjectForm in edit mode
- `components/ui/badge.tsx` - Shadcn badge (installed)
- `components/ui/textarea.tsx` - Shadcn textarea (installed)
- `components/ui/select.tsx` - Shadcn select (installed)
- `components/ui/table.tsx` - Shadcn table (installed)

## Decisions Made

- **Async params for Next.js 15:** `params` typed as `Promise<{ id: string }>` and awaited — required for Next.js 15 async params API in page components
- **Form action type compatibility:** Wrapped Server Actions in `async (_formData: FormData) => { ... }` lambdas for ProjectStatusPipeline — TypeScript strict mode requires `void | Promise<void>` return from form action prop
- **Financial computation in TypeScript:** getProjects maps project data to include `subtotal` and `gran_total` computed via calcSubtotal/calcTotal — avoids complex SQL and keeps computation logic centralized in calculations.ts

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript incompatibility in ProjectStatusPipeline form actions**
- **Found during:** Task 2 (TypeScript compile check)
- **Issue:** Server Action bound with `.bind()` returns `Promise<{ error?: string }>` but HTML form `action` prop expects `(formData: FormData) => void | Promise<void>`
- **Fix:** Wrapped bound actions in arrow functions discarding the return value
- **Files modified:** `components/projects/ProjectStatusPipeline.tsx`
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** b32d664 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 TypeScript type compatibility bug)
**Impact on plan:** Essential fix for compilation. No scope creep.

## Issues Encountered

None — all issues resolved inline via deviation rules.

## User Setup Required

None — no external service configuration required for this plan. The Supabase migration (`20260304000002_updated_at_trigger.sql`) must be applied to the database (`npx supabase db push`) before the trigger takes effect.

## Next Phase Readiness

- All project CRUD routes are operational
- ProjectStatusPipeline component ready to embed in the project detail page (Plan 03)
- getSuppliers query ready for Plan 03 line item form supplier dropdown
- Plan 03 can now build the line item table and project detail page on top of this foundation

## Self-Check: PASSED

All files verified present:
- migration, actions/projects.ts, queries/projects.ts, queries/suppliers.ts
- ProjectForm.tsx, ProjectStatusPipeline.tsx
- proyectos/page.tsx, nuevo/page.tsx, [id]/editar/page.tsx

All commits verified: 8648d84, b32d664

---
*Phase: 02-proyectos-y-partidas*
*Completed: 2026-03-04*
