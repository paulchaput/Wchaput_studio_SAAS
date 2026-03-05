---
phase: 06-dashboard-y-vista-contador
plan: "02"
subsystem: ui
tags: [recharts, dashboard, charts, typescript, vitest, tdd]

# Dependency graph
requires:
  - phase: 06-01
    provides: dashboard KPI queries, lib/queries/dashboard.ts with server query pattern

provides:
  - Recharts installed with react-is override for React 19
  - MonthlyDataPoint and CashFlowEntry types exported from lib/queries/dashboard.ts
  - aggregateMonthlyFinancials() pure helper — 6-month window, no X-axis gaps
  - aggregateCashFlow() pure helper — 30-day window, sorted by fecha
  - getMonthlyFinancials() server query
  - getCashFlowProjection() server query
  - RevenueChart client component (Recharts BarChart, monochrome fill)
  - CashFlowChart client component (styled table with entrada/salida coloring)
  - Dashboard page updated with dynamic imports (ssr: false) and chart sections

affects:
  - any future dashboard enhancements

# Tech tracking
tech-stack:
  added:
    - recharts@3.7.0
    - react-is override ^19.0.0 (package.json overrides)
  patterns:
    - next/dynamic with ssr:false for Recharts client-only components
    - Pure helper aggregation functions exported separately from server queries for unit testing
    - UTC-based date arithmetic to avoid timezone off-by-one errors

key-files:
  created:
    - components/dashboard/RevenueChart.tsx
    - components/dashboard/CashFlowChart.tsx
  modified:
    - lib/queries/dashboard.ts
    - lib/queries/dashboard.test.ts
    - app/(admin)/dashboard/page.tsx
    - package.json
    - package-lock.json

key-decisions:
  - "Recharts Tooltip formatter typed as (v: number | undefined) => string — Recharts generic Formatter type allows undefined value"
  - "UTC-based date arithmetic in aggregateCashFlow — avoids off-by-one when local timezone differs from UTC"
  - "aggregateMonthlyFinancials uses fecha_cotizacion substring(0,7) as month key — consistent with RESEARCH.md Pattern approach"
  - "CashFlowChart renders as styled table (not area chart) — cleaner for sparse 30-day data as noted in plan"

patterns-established:
  - "Pattern 1: next/dynamic({ ssr: false }) for any Recharts components — prevents SSR hydration mismatch"
  - "Pattern 2: Pure helpers accept optional today: Date parameter — enables deterministic unit tests without mocking Date.now()"

requirements-completed:
  - DASH-04
  - DASH-05

# Metrics
duration: 4min
completed: 2026-03-05
---

# Phase 6 Plan 02: Dashboard Charts Summary

**Recharts bar chart (6-month revenue/cost/profit) and 30-day cash flow projection table added to admin dashboard using next/dynamic SSR-off imports**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-05T07:56:07Z
- **Completed:** 2026-03-05T08:00:30Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Installed Recharts 3.7.0 with react-is override for React 19 compatibility
- Added aggregateMonthlyFinancials() and aggregateCashFlow() pure helpers with full TDD (37 tests pass)
- Created RevenueChart (BarChart with monochrome ingresos/costos/utilidad bars) and CashFlowChart (dated entrada/salida table) client components
- Wired dashboard page with dynamic imports (ssr:false) and server-side data fetch via Promise.all

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Recharts + add monthly and cash flow queries (TDD)** - `938f6a6` (feat)
2. **Task 2: Chart components + dashboard page update** - `6d81977` (feat)

**Plan metadata:** (see docs commit below)

_Note: TDD task had RED (tests added failing) then GREEN (implementation) within single commit after fix applied_

## Files Created/Modified
- `components/dashboard/RevenueChart.tsx` - Client component wrapping Recharts BarChart for monthly revenue/cost/profit
- `components/dashboard/CashFlowChart.tsx` - Client component rendering 30-day cash flow as a styled table
- `lib/queries/dashboard.ts` - Added MonthlyDataPoint, CashFlowEntry types, aggregateMonthlyFinancials, aggregateCashFlow pure helpers, getMonthlyFinancials, getCashFlowProjection server queries
- `lib/queries/dashboard.test.ts` - Added 17 new tests for monthly financials and cash flow helpers (37 total)
- `app/(admin)/dashboard/page.tsx` - Added dynamic imports, chart data fetches, chart card sections
- `package.json` - Added recharts dependency and react-is override
- `package-lock.json` - Updated lock file

## Decisions Made
- Recharts Tooltip `formatter` typed as `(v: number | undefined) => string` — Recharts Formatter generic allows undefined value; explicit handling required for TypeScript strict mode
- UTC-based date arithmetic in `aggregateCashFlow` — `getUTCDate()` instead of `getDate()` prevents timezone off-by-one for Mexico City (UTC-6) environment
- CashFlowChart renders as a table, not an area chart — sparse 30-day data is cleaner as a list per plan guidance

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Recharts Tooltip formatter TypeScript type error**
- **Found during:** Task 2 (TypeScript check after creating RevenueChart)
- **Issue:** `(v: number) => string` not assignable to Recharts `Formatter<number, NameType>` because value can be `undefined`
- **Fix:** Changed to `(v: number | undefined) => (v != null ? formatMXN(v) : '')`
- **Files modified:** `components/dashboard/RevenueChart.tsx`
- **Verification:** `npx tsc --noEmit` exits 0
- **Committed in:** `6d81977` (Task 2 commit)

**2. [Rule 1 - Bug] Fixed UTC date arithmetic in aggregateCashFlow upper bound**
- **Found during:** Task 1 (GREEN phase — "today+30 inclusive upper bound" test failed)
- **Issue:** `today.getDate()` uses local time; `getUTCDate()` required for consistent test results
- **Fix:** Changed window calculation to use `getUTCFullYear()`, `getUTCMonth()`, `getUTCDate()`
- **Files modified:** `lib/queries/dashboard.ts`
- **Verification:** All 37 tests pass
- **Committed in:** `938f6a6` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - bug)
**Impact on plan:** Both auto-fixes required for correctness. No scope creep.

## Issues Encountered
None — both issues caught immediately by tests and TypeScript check.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DASH-04 (monthly revenue/cost/profit bar chart) and DASH-05 (30-day cash flow projection) requirements satisfied
- All 6 phases and 13 plans complete — milestone v1.0 delivered
- No blockers or concerns

## Self-Check: PASSED

All artifacts verified:
- FOUND: components/dashboard/RevenueChart.tsx
- FOUND: components/dashboard/CashFlowChart.tsx
- FOUND: lib/queries/dashboard.ts
- FOUND: .planning/phases/06-dashboard-y-vista-contador/06-02-SUMMARY.md
- FOUND: commit 938f6a6
- FOUND: commit 6d81977

---
*Phase: 06-dashboard-y-vista-contador*
*Completed: 2026-03-05*
