---
phase: 06-dashboard-y-vista-contador
plan: 01
subsystem: dashboard
tags: [dashboard, kpi, aggregation, tdd, server-components]
dependency_graph:
  requires: [lib/calculations.ts, lib/formatters.ts, lib/supabase/server.ts, components/ui/card.tsx, components/ui/table.tsx]
  provides: [lib/queries/dashboard.ts, components/dashboard/KpiCard.tsx, components/dashboard/PipelineSummary.tsx, components/dashboard/SupplierDebtBreakdown.tsx, app/(admin)/dashboard/page.tsx]
  affects: [app/(admin)/dashboard/page.tsx]
tech_stack:
  added: []
  patterns: [TDD pure helper pattern, server-only vitest mock, parallel Promise.all fetch, Supabase joined relation normalization]
key_files:
  created:
    - lib/queries/dashboard.ts
    - lib/queries/dashboard.test.ts
    - components/dashboard/KpiCard.tsx
    - components/dashboard/PipelineSummary.tsx
    - components/dashboard/SupplierDebtBreakdown.tsx
    - __mocks__/server-only.ts
  modified:
    - app/(admin)/dashboard/page.tsx
    - vitest.config.ts
decisions:
  - "Pure helpers (aggregateDashboardKpis, aggregatePipelineSummary, aggregateSupplierDebt) exported separately from server query functions — enables Vitest unit testing without Supabase mocking"
  - "server-only mock added to vitest alias config — allows importing modules with server-only import in test environment while keeping Next.js enforcement in production"
  - "Number() coercion applied at pure helper entry point for all NUMERIC string values from Supabase JSON"
metrics:
  duration: 3 min
  completed_date: "2026-03-05"
  tasks_completed: 2
  files_created: 6
  files_modified: 2
---

# Phase 6 Plan 1: Dashboard KPI Aggregation and Components Summary

**One-liner:** Admin KPI dashboard with 4 cards, pipeline stage summary table, and supplier debt breakdown using pure-helper TDD pattern with server-only vitest mock.

## What Was Built

### Task 1: Aggregation Functions + Unit Tests (TDD)

**Files:** `lib/queries/dashboard.ts`, `lib/queries/dashboard.test.ts`

RED phase: Created 20 failing tests covering all pure helper behaviors — activeProjectCount excludes Cerrado, pipelineValue uses calcTotal(calcSubtotal), pending balances subtracted correctly, all 6 PIPELINE_STAGES always present, Innovika/El Roble/Otros routing, Number() coercion.

GREEN phase: Implemented three pure exported helpers:
- `aggregateDashboardKpis(projects)` — filters Cerrado, computes pipelineValue, totalPendingCliente, totalPendingProveedor using existing calcSubtotal/calcTotal/calcTotalCostoProyecto helpers
- `aggregatePipelineSummary(projects)` — counts per stage using PIPELINE_STAGES, always returns all 6 with 0 for empty stages
- `aggregateSupplierDebt(lineItems, payments)` — normalizes Supabase array/object relations, routes by supplier nombre to Innovika/El Roble/Otros buckets, subtracts paid amounts

Server query functions delegate to pure helpers:
- `getDashboardKpis()` — single joined Supabase query, then aggregateDashboardKpis
- `getPipelineSummary()` — fetches status only, then aggregatePipelineSummary
- `getSupplierDebtBreakdown()` — parallel Promise.all for line_items and payments_supplier, then aggregateSupplierDebt

### Task 2: Dashboard KPI Components + Page

**Files:** `components/dashboard/KpiCard.tsx`, `components/dashboard/PipelineSummary.tsx`, `components/dashboard/SupplierDebtBreakdown.tsx`, `app/(admin)/dashboard/page.tsx`

- **KpiCard** — thin wrapper over Shadcn Card; label in CardTitle (text-sm text-muted-foreground), value in CardContent (text-2xl font-bold), optional sublabel
- **PipelineSummary** — Server Component receiving pipelineCounts prop, renders Shadcn Table with rows in PIPELINE_STAGES order
- **SupplierDebtBreakdown** — Server Component receiving deuda prop, renders Shadcn Table with formatMXN for all values
- **dashboard/page.tsx** — replaces stub with real Server Component: parallel Promise.all fetch of all 3 queries, responsive grid (grid-cols-1 sm:grid-cols-2 lg:grid-cols-4) for 4 KPI cards, two-column section below for pipeline summary and supplier debt

## Verification

1. `npx vitest run lib/queries/dashboard.test.ts` — 20/20 tests pass
2. `npx tsc --noEmit` — 0 errors

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] server-only package blocked Vitest from importing dashboard.ts**

- **Found during:** Task 1 GREEN phase
- **Issue:** `lib/supabase/server.ts` imports `server-only` which throws when running outside Next.js server context. Vitest runs in Node, so importing `lib/queries/dashboard.ts` (which imports `createClient` from supabase/server) failed with "This module cannot be imported from a Client Component module."
- **Fix:** Added `server-only` alias in vitest.config.ts pointing to `__mocks__/server-only.ts` (empty export). This is the standard community pattern for testing Next.js server modules in Vitest. Production Next.js behavior is unaffected.
- **Files modified:** `vitest.config.ts`, `__mocks__/server-only.ts`
- **Commit:** 908ceb6

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 RED | 16bedfb | test(06-01): add failing tests for dashboard aggregation functions |
| Task 1 GREEN | 908ceb6 | feat(06-01): implement dashboard aggregation functions (TDD green) |
| Task 2 | c14b603 | feat(06-01): add dashboard KPI components and update dashboard page |

## Self-Check: PASSED

All created files exist on disk. All task commits (16bedfb, 908ceb6, c14b603) found in git history.
