# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-03)

**Core value:** Partners can see the financial health of every active project and the business as a whole, generate client-facing PDFs that never expose internal costs, and track every payment to and from every stakeholder.
**Current focus:** Phase 1 — Fundacion

## Current Position

Phase: 1 of 6 (Fundacion)
Plan: 1 of 3 in current phase
Status: In progress
Last activity: 2026-03-04 — Completed 01-01 (Initial Schema Migration)

Progress: [#░░░░░░░░░] 5%

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: 2 min
- Total execution time: 2 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-fundacion | 1/3 | 2 min | 2 min |

**Recent Trend:**
- Last 5 plans: 01-01 (2 min)
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Phase 1]: Use NUMERIC(12,2) for all money columns — never FLOAT (resolve before any data is written)
- [Phase 1]: Use profiles table approach for RLS role resolution (not JWT claims) — safer for greenfield, no custom Auth hook needed
- [Phase 1]: Use @supabase/ssr (not deprecated @supabase/auth-helpers-nextjs) — verify cookie handler API at implementation
- [Phase 5]: Test @react-pdf/renderer in Vercel preview deployment early — font path resolution differs from local dev
- [01-01]: SECURITY DEFINER SET search_path='' on handle_new_user trigger — required to cross auth schema boundary silently on signup
- [01-01]: get_user_role() marked STABLE — Postgres caches result per statement, prevents N+1 profile lookups per RLS row evaluation
- [01-01]: Zero accountant policies on line_items — RLS default-deny enforces AUTH-04 at DB level without application logic
- [01-01]: Suppliers Innovika and El Roble seeded in migration — immediately available without separate seed run

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: @supabase/ssr cookie handler API (getAll/setAll signature) changed in 2024 — verify against current Supabase docs before writing middleware.ts and lib/supabase/server.ts
- [Phase 5]: @react-pdf/renderer v3.x renderToBuffer vs renderToStream API — verify at implementation time

## Session Continuity

Last session: 2026-03-04
Stopped at: Completed 01-01-PLAN.md — Initial Schema Migration
Resume file: None
