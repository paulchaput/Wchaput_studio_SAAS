# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-03)

**Core value:** Partners can see the financial health of every active project and the business as a whole, generate client-facing PDFs that never expose internal costs, and track every payment to and from every stakeholder.
**Current focus:** Phase 1 — Fundacion

## Current Position

Phase: 1 of 6 (Fundacion)
Plan: 0 of 3 in current phase
Status: Ready to plan
Last activity: 2026-03-03 — Roadmap created (6 phases, 57 requirements mapped)

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: -

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: -
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

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: @supabase/ssr cookie handler API (getAll/setAll signature) changed in 2024 — verify against current Supabase docs before writing middleware.ts and lib/supabase/server.ts
- [Phase 5]: @react-pdf/renderer v3.x renderToBuffer vs renderToStream API — verify at implementation time

## Session Continuity

Last session: 2026-03-03
Stopped at: Roadmap created — ready to plan Phase 1
Resume file: None
