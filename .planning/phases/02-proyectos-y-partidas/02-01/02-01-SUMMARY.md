---
phase: 02-proyectos-y-partidas
plan: "01"
subsystem: testing
tags: [vitest, typescript, financial-calculations, formatters, tdd, pure-functions]

# Dependency graph
requires:
  - phase: 01-fundacion
    provides: lib/types.ts with LineItem and Project interfaces used in calculations

provides:
  - lib/calculations.ts — pure financial formula functions with IVA_RATE, DEFAULT_MARGEN, PIPELINE_STAGES constants
  - lib/formatters.ts — MXN currency formatter and date formatter (DD/MMM/YYYY) with timezone safety
  - lib/calculations.test.ts — 14 unit tests for all formula functions
  - lib/formatters.test.ts — 8 unit tests for formatters
  - vitest.config.ts — test runner configuration for Next.js 15 + TypeScript

affects:
  - 02-02 (line item forms that call calcPrecioVenta, calcSubtotal, formatMXN)
  - 02-03 (project summary page showing calcUtilidad, calcTotal, formatFecha)
  - 03-pagos (payment displays using formatMXN, formatFecha)
  - 04-reportes (PDF generation using all formatters and calculation functions)

# Tech tracking
tech-stack:
  added: [vitest ^4.0.18]
  patterns:
    - "Gross margin formula: precioVenta = costo / (1 - margen). Never use markup formula (costo * (1 + margen))"
    - "All monetary constants (IVA_RATE=0.16, DEFAULT_MARGEN=0.50) exported from calculations.ts — never inline in components"
    - "Date.UTC used in formatFecha to prevent timezone off-by-one (Mexico City = UTC-6)"
    - "margen stored as decimal (0.50), percentages only in UI display via margenToPercent/percentToMargen"

key-files:
  created:
    - lib/calculations.ts
    - lib/formatters.ts
    - lib/calculations.test.ts
    - lib/formatters.test.ts
    - vitest.config.ts
  modified:
    - package.json (added vitest devDependency)

key-decisions:
  - "Gross margin formula (costo / (1 - margen)) not markup — calcPrecioVenta(100, 0.50) === 200, proven by test"
  - "calcPrecioVenta throws if margen >= 1 to prevent division by zero or negative prices"
  - "formatFecha uses Date.UTC + getUTCDate/getUTCFullYear to guarantee no timezone shift regardless of server locale"
  - "IVA_RATE = 0.16 exported as named constant — zero occurrences allowed in components/ or app/"
  - "calcUtilidad(subtotal, totalCosto) operates on pre-IVA subtotal — IVA is excluded from gross profit"

patterns-established:
  - "TDD Red-Green: failing tests committed first (86e5d97), then implementation (26648da)"
  - "All financial pure functions have zero side effects and zero external dependencies"

requirements-completed: [PART-02, PART-03, PART-04, PART-05, PART-06, PART-07, PART-09, PROJ-07, UX-05]

# Metrics
duration: 8min
completed: 2026-03-04
---

# Phase 2 Plan 01: Financial Calculations and MXN/Date Formatters Summary

**Vitest-tested pure-function library for gross-margin pricing, IVA calculations, and Mexico-timezone-safe date/currency formatters — 22 tests green**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-04T10:36:00Z
- **Completed:** 2026-03-04T10:44:00Z
- **Tasks:** 4 (install + vitest.config, RED tests, GREEN calculations, GREEN formatters)
- **Files modified:** 7

## Accomplishments

- Established the gross margin formula as an undeniable, tested fact: `calcPrecioVenta(100, 0.50) === 200` (not 150)
- All 22 vitest unit tests pass: 14 for calculations, 8 for formatters
- Timezone-safe `formatFecha` using `Date.UTC` prevents off-by-one date display for Mexico City servers (UTC-6)
- Enforced single source of truth for `IVA_RATE = 0.16` — zero occurrences in components or app directories

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Vitest + write failing RED tests** - `86e5d97` (test)
2. **Task 2: Implement calculations.ts and formatters.ts (GREEN)** - `26648da` (feat)

_Note: TDD tasks committed in two waves: RED phase (86e5d97) then GREEN phase (26648da)_

## Files Created/Modified

- `lib/calculations.ts` — Pure functions: calcPrecioVenta, calcTotalVenta, calcTotalCosto, calcSubtotal, calcIVA, calcTotal, calcTotalCostoProyecto, calcUtilidad; constants: IVA_RATE, DEFAULT_MARGEN, PIPELINE_STAGES
- `lib/formatters.ts` — formatMXN (Intl.NumberFormat MXN), formatFecha (Date.UTC timezone-safe), margenToPercent, percentToMargen
- `lib/calculations.test.ts` — 14 unit tests covering all formula functions and constants
- `lib/formatters.test.ts` — 8 unit tests covering currency formatting, date formatting, margen conversion
- `vitest.config.ts` — Node environment, @ alias to project root
- `package.json` — Added vitest ^4.0.18 as devDependency
- `package-lock.json` — Updated lockfile

## Decisions Made

- **Gross margin not markup:** `precioVenta = costo / (1 - margen)` gives 200 for costo=100, margen=0.50. This is the Mexico furniture industry standard (margen is a portion of the sale price, not a markup on cost). A test makes this non-negotiable.
- **calcPrecioVenta throws at margen >= 1:** Division by zero protection and prevents negative prices.
- **formatFecha uses Date.UTC:** `new Date('2026-03-04')` parses as midnight UTC, which becomes 6pm previous day in UTC-6. Using `Date.UTC(year, month, day)` + `getUTCDate()` guarantees the displayed date matches the stored string.
- **IVA_RATE single source of truth:** Any component importing 0.16 directly will fail the grep check — all callers must import from calculations.ts.
- **calcUtilidad excludes IVA:** `utilidad = subtotal - totalCosto`. IVA is a tax collected for the government, not part of the company's profit.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All financial formula functions are available for import by Phase 2 Plans 02 and 03
- `PIPELINE_STAGES` exported for use in status dropdowns and pipeline UI
- No blockers — all tests green, all constants exported correctly

## Self-Check: PASSED

All created files exist on disk. Both task commits verified in git log.

---
*Phase: 02-proyectos-y-partidas*
*Completed: 2026-03-04*
