---
phase: 04-checklist-de-produccion
plan: 01
subsystem: database
tags: [supabase, typescript, vitest, server-actions, zod]

# Dependency graph
requires:
  - phase: 01-fundacion
    provides: Supabase schema with checklist_tasks table and RLS policies
  - phase: 02-proyectos-y-partidas
    provides: projects table and createProjectAction pattern
  - phase: 03-pagos-y-proveedores
    provides: Server Action patterns (FormData, Zod validation, revalidatePath)
provides:
  - CHECKLIST_SEED constant (30 tasks, 4 phases) in lib/checklist-tasks.ts
  - ChecklistTask interface and ChecklistStatus type in lib/types.ts
  - getChecklistTasks(projectId) query ordered by sort_order ASC
  - updateChecklistTaskAction with UUID + status validation
  - createProjectAction modified to seed 30 checklist tasks and redirect to /proyectos/[id]
  - Idempotent backfill migration for pre-Phase4 projects
affects: [04-02-checklist-panel, 05-pdf, future checklist UI]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TDD red-green for static seed constants and pure utility functions
    - FormData Server Action with Zod patchSchema for partial updates
    - Non-fatal checklist seed in createProjectAction (logs error, does not block redirect)
    - Idempotent migration via NOT IN subquery on project_id

key-files:
  created:
    - lib/checklist-tasks.ts
    - lib/checklist-tasks.test.ts
    - lib/queries/checklist.ts
    - lib/actions/checklist.ts
    - lib/actions/checklist.test.ts
    - supabase/migrations/20260304000003_backfill_checklist.sql
  modified:
    - lib/types.ts
    - lib/actions/projects.ts

key-decisions:
  - "CHECKLIST_SEED is a static TypeScript array (not DB-driven) — zero query cost, single source of truth"
  - "calcPhaseProgress treats N/A as completed — tasks opted-out count toward progress"
  - "Checklist seed in createProjectAction is non-fatal — project creation succeeds even if checklist insert fails"
  - "createProjectAction redirects to /proyectos/[id] (not /proyectos) after seeding"
  - "updateChecklistTaskAction uses patchSchema with optional fields — only provided fields are included in update"
  - "Supabase db push requires interactive password — migration file in place for manual apply"

patterns-established:
  - "Partial update pattern: build update object by checking !== undefined before adding keys"
  - "TDD for data-layer utilities: tests first on static constants, then implementation"

requirements-completed: [CHEC-01, CHEC-02, CHEC-03]

# Metrics
duration: 3min
completed: 2026-03-05
---

# Phase 4 Plan 01: Checklist Data Layer Summary

**Static CHECKLIST_SEED (30 tasks across 4 phases), TypeScript types, Supabase query, validated Server Action, and project creation seeding with idempotent backfill migration**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-05T04:40:29Z
- **Completed:** 2026-03-05T04:42:46Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- CHECKLIST_SEED constant with exactly 30 entries (7 Comercial + 6 Diseño y Especificaciones + 9 Producción + 8 Entrega y Cierre), verified by Vitest tests
- ChecklistTask interface and ChecklistStatus type appended to lib/types.ts for use by ChecklistPanel (Plan 02)
- getChecklistTasks query returning rows ordered by sort_order ASC
- updateChecklistTaskAction with Zod validation rejecting invalid statuses and non-UUID task IDs
- createProjectAction modified to capture project.id, seed 30 checklist tasks, and redirect to /proyectos/[id]
- Idempotent SQL migration backfilling 30 tasks for all pre-Phase4 projects that have zero checklist rows

## Task Commits

Each task was committed atomically:

1. **Task 1: CHECKLIST_SEED constant, ChecklistTask types, and unit test scaffold** - `65c6a65` (feat)
2. **Task 2: getChecklistTasks query, updateChecklistTaskAction, and modified createProjectAction with backfill migration** - `cac41ca` (feat)

**Plan metadata:** (docs commit follows)

_Note: Both tasks used TDD pattern (RED test run, then GREEN implementation)_

## Files Created/Modified
- `lib/checklist-tasks.ts` - CHECKLIST_SEED (30 entries), CHECKLIST_PHASES, ChecklistFase type, calcPhaseProgress
- `lib/checklist-tasks.test.ts` - 8 Vitest tests for seed counts and calcPhaseProgress
- `lib/types.ts` - ChecklistTask interface and ChecklistStatus type appended
- `lib/queries/checklist.ts` - getChecklistTasks(projectId) ordered by sort_order ASC
- `lib/actions/checklist.ts` - updateChecklistTaskAction with Zod validation
- `lib/actions/checklist.test.ts` - 4 Vitest tests for action validation
- `lib/actions/projects.ts` - createProjectAction modified: captures id, seeds checklist, redirects to /proyectos/[id]
- `supabase/migrations/20260304000003_backfill_checklist.sql` - Idempotent backfill migration

## Decisions Made
- CHECKLIST_SEED is a static TypeScript array (not DB-driven) — zero query cost, single source of truth for task definitions
- calcPhaseProgress treats N/A as completed — tasks opted-out still count toward project progress
- Checklist seed in createProjectAction is non-fatal: project creation succeeds even if checklist insert fails (logs error only)
- updateChecklistTaskAction builds the update object dynamically — only fields explicitly provided in FormData are included in the Supabase update call

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- **Supabase db push authentication gate:** `npx supabase db push` prompted for database password interactively and failed (SASL auth error). Migration file `20260304000003_backfill_checklist.sql` is in place and ready to apply when credentials are available. This is expected environment behavior — not a code issue.

## User Setup Required

The backfill migration needs to be applied to Supabase:

```bash
npx supabase db push
```

Requires your Supabase database password (from the Supabase dashboard under Settings > Database).

## Next Phase Readiness
- All data layer exports ready for ChecklistPanel (Plan 02): `getChecklistTasks`, `updateChecklistTaskAction`, `ChecklistTask`, `ChecklistStatus`, `CHECKLIST_PHASES`, `calcPhaseProgress`
- Full Vitest suite passes (47 tests across 4 files)
- TypeScript compiles without errors
- Backfill migration pending manual apply to Supabase

---
*Phase: 04-checklist-de-produccion*
*Completed: 2026-03-05*
