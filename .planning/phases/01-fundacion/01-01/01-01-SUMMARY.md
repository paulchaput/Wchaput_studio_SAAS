---
phase: 01-fundacion
plan: "01"
subsystem: database

tags: [supabase, postgres, rls, sql, row-level-security]

# Dependency graph
requires: []
provides:
  - "Supabase migration: profiles, projects, line_items, payments_client, payments_supplier, suppliers, checklist_tasks tables"
  - "NUMERIC(12,2) money columns on all financial data"
  - "handle_new_user trigger with SECURITY DEFINER SET search_path=''"
  - "get_user_role() SECURITY DEFINER STABLE helper function"
  - "RLS enabled on all 7 tables with admin/accountant access policies"
  - "Accountant blocked from line_items at DB level (AUTH-04)"
  - "Innovika and El Roble suppliers seeded at schema level"
  - "seed.sql with manual user setup instructions"
affects:
  - 01-fundacion
  - 02-gestion-proyectos
  - 03-proveedores
  - 04-checklist
  - 05-pdf
  - 06-reportes

# Tech tracking
tech-stack:
  added: [supabase, postgres]
  patterns:
    - "NUMERIC(12,2) for all money columns — no FLOAT or bare DECIMAL"
    - "SECURITY DEFINER SET search_path='' for cross-schema triggers"
    - "get_user_role() helper with STABLE for cached RLS evaluation per statement"
    - "(SELECT public.get_user_role()) wrapper pattern in RLS policies"
    - "RLS default-deny: no policy = no access for accountant on line_items"

key-files:
  created:
    - supabase/migrations/20260303000001_initial_schema.sql
    - supabase/seed.sql
  modified: []

key-decisions:
  - "NUMERIC(12,2) for all money columns — prevents floating-point rounding errors in financial calculations"
  - "profiles table approach for role resolution (not JWT claims) — safer for greenfield, no custom Auth hook needed"
  - "SECURITY DEFINER SET search_path='' on handle_new_user trigger — required to cross auth schema boundary silently"
  - "get_user_role() STABLE function — Postgres caches result per statement, avoids N+1 profile lookups in RLS"
  - "Zero accountant policies on line_items — RLS default-deny enforces AUTH-04 at DB level without application logic"
  - "Suppliers Innovika and El Roble seeded in migration — immediately available without separate seed run"

patterns-established:
  - "RLS pattern: (SELECT public.get_user_role()) = 'role' in USING/WITH CHECK"
  - "Trigger pattern: SECURITY DEFINER SET search_path = '' for cross-schema operations"
  - "Money columns: NUMERIC(12,2) NOT NULL DEFAULT 0 everywhere"

requirements-completed: [AUTH-03, AUTH-04, AUTH-05]

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 1 Plan 01: Initial Database Schema Summary

**Supabase Postgres schema with NUMERIC(12,2) money columns, SECURITY DEFINER trigger for auto-profile creation, and RLS policies blocking accountant from line_items at the database level**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-04T13:33:02Z
- **Completed:** 2026-03-04T13:34:52Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- Migration file with 7 tables using NUMERIC(12,2) on all money columns — zero FLOAT occurrences in SQL statements
- RLS enabled on all 7 tables with admin full CRUD and accountant read-only on financial tables; accountant has zero policies on line_items (AUTH-04 enforced at DB level)
- handle_new_user trigger with SECURITY DEFINER SET search_path='' auto-creates profile row on signup, seeding role from raw_user_meta_data
- get_user_role() SECURITY DEFINER STABLE helper for cached per-statement role resolution in all RLS policies
- seed.sql documenting manual user creation steps via Supabase Auth dashboard with correct metadata format

## Task Commits

Each task was committed atomically:

1. **Tasks 1 + 2: Create initial schema migration with tables, trigger, and RLS** - `b4651a3` (feat)
2. **Task 3: Create seed.sql with user setup instructions** - `2ebdcc2` (feat)

## Files Created/Modified

- `supabase/migrations/20260303000001_initial_schema.sql` - Complete schema: profiles, projects, line_items, payments_client, payments_supplier, suppliers, checklist_tasks tables with all constraints, get_user_role() helper, RLS enabled + policies, and Innovika/El Roble supplier seed data
- `supabase/seed.sql` - Step-by-step instructions for creating admin and accountant users via Supabase Auth dashboard

## Decisions Made

- NUMERIC(12,2) on all money columns (costo_proveedor, margen, monto) — eliminates floating-point rounding errors in financial calculations; cannot be changed retroactively without data migration
- profiles table approach for role resolution (not JWT claims) — safer for greenfield, avoids custom Auth hook complexity
- SECURITY DEFINER SET search_path='' on handle_new_user — required to INSERT into public.profiles from auth schema trigger context; omitting causes silent signup failure
- get_user_role() marked STABLE — Postgres caches result per statement, prevents N+1 profile lookups per row during RLS evaluation
- Zero accountant policies on line_items — enforces AUTH-04 at the database level without any application-layer logic; RLS default-deny guarantees the restriction

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- `grep "NUMERIC(12,2)"` — 5 matches (3 comment lines, 3 actual column definitions: costo_proveedor, monto x2)
- `grep "FLOAT"` — 1 match, only in header comment (`No FLOAT. No bare DECIMAL.`), zero in SQL statements
- `grep "ENABLE ROW LEVEL SECURITY"` — 7 ALTER TABLE statements (profiles, projects, line_items, payments_client, payments_supplier, suppliers, checklist_tasks)
- `grep "get_user_role"` — 19 occurrences (function definition + all policy usages)
- `grep "SECURITY DEFINER SET search_path"` — 2 occurrences (handle_new_user trigger + get_user_role function)
- `grep "admin_all_line_items"` — 1 occurrence (admin-only policy)
- accountant policies on line_items — ZERO (correct, RLS default-deny enforces AUTH-04)

## Issues Encountered

None - all tasks executed cleanly.

## User Setup Required

**External services require manual configuration.** See `supabase/seed.sql` for:
- Creating admin user via Supabase Auth dashboard with metadata `{ "role": "admin", "full_name": "Paul Chaput" }`
- Creating accountant user with metadata `{ "role": "accountant", "full_name": "Contador" }`
- Verifying profiles table shows 2 rows after user creation
- Required .env.local variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

## Next Phase Readiness

- Schema is ready for Phase 1 Plan 02 (Next.js app shell + Supabase client setup)
- All tables exist with correct types and RLS — application code can immediately use them
- handle_new_user trigger is in place — creating users via Auth dashboard automatically seeds profiles
- Concern: @supabase/ssr cookie handler API (getAll/setAll signature) changed in 2024 — verify against current docs before writing middleware.ts in Phase 1 Plan 02

---
*Phase: 01-fundacion*
*Completed: 2026-03-04*
