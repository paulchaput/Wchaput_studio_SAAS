---
phase: 05-generacion-de-pdfs
plan: "01"
subsystem: api

tags: [react-pdf, pdf, cotizacion, typescript, nextjs, route-handler]

# Dependency graph
requires:
  - phase: 02-proyectos-y-partidas
    provides: LineItem types, calcSubtotal/calcTotal functions, project detail page structure
  - phase: 03-pagos-y-proveedores
    provides: calcAnticipo, calcSaldo constants used in PDF totals

provides:
  - CotizacionTemplate React-PDF component rendering client-facing quote PDF
  - getProjectForQuote() safe data query — returns QuoteProjectData with no cost/margin fields
  - GET /proyectos/[id]/cotizacion route handler streaming application/pdf
  - Download button on project detail page (Documentos section)
  - QuoteLineItem and QuoteProjectData types enforcing cost-data exclusion at TypeScript boundary

affects: [05-02-ordenes-de-compra, future-pdf-phases]

# Tech tracking
tech-stack:
  added: ["@react-pdf/renderer"]
  patterns:
    - "renderToStream cast as unknown as ReadableStream (established community pattern for Next.js)"
    - "route.tsx (not .ts) for JSX support in Next.js route handlers"
    - "Safe type boundary: costo_proveedor/margen consumed inside query function, never in return type"
    - "TDD for type-safety: QuoteLineItem structural tests confirm no cost fields at runtime"

key-files:
  created:
    - lib/pdf/pdf-content.ts
    - lib/pdf/pdf-styles.ts
    - lib/pdf/CotizacionTemplate.tsx
    - lib/pdf/CotizacionTemplate.test.ts
    - app/(admin)/proyectos/[id]/cotizacion/route.tsx
  modified:
    - lib/queries/projects.ts
    - app/(admin)/proyectos/[id]/page.tsx

key-decisions:
  - "route.tsx (not route.ts) used for cotizacion route handler — JSX requires .tsx extension even in Next.js API routes"
  - "renderToStream element cast as any to resolve DocumentProps vs CotizacionTemplateProps type mismatch — established community pattern"
  - "Built-in Helvetica font used — no Font.register() with local paths (avoids Vercel path resolution issue)"
  - "costo_proveedor and margen fetched from DB inside getProjectForQuote but never appear in QuoteProjectData return type — TypeScript enforces boundary"

patterns-established:
  - "PDF route handler pattern: route.tsx with renderToStream + as unknown as ReadableStream cast"
  - "Safe quote data pattern: fetch cost data server-side, compute sale prices, return only QuoteLineItem[]"

requirements-completed: [QUOT-01, QUOT-02, QUOT-03, QUOT-04, QUOT-05]

# Metrics
duration: 3min
completed: 2026-03-04
---

# Phase 5 Plan 01: Generacion de PDFs Summary

**React-PDF cotizacion route serving client-facing quotes with Helvetica monochrome design and TypeScript-enforced cost data exclusion**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-04T23:25:26Z
- **Completed:** 2026-03-04T23:28:48Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Built complete PDF generation pipeline: template, styles, safe data query, route handler, and download UI
- QuoteLineItem type has zero cost/margin fields — TypeScript prevents accidental exposure at compile time
- GET /proyectos/[id]/cotizacion returns application/pdf with Helvetica design: header, client info, line items, totals (IVA 16%), 70/30 payment schedule, terms

## Task Commits

Each task was committed atomically:

1. **Task 1: Install @react-pdf/renderer, define types, shared styles, content, CotizacionTemplate with test** - `9688885` (feat + test TDD)
2. **Task 2: Add getProjectForQuote query, cotizacion route handler, and download button** - `28f22ac` (feat)

## Files Created/Modified

- `lib/pdf/pdf-content.ts` - STUDIO_NAME and TERMINOS_Y_CONDICIONES static text constants
- `lib/pdf/pdf-styles.ts` - Helvetica-based monochrome StyleSheet (white background, bottom-border rows, #111827 / #e5e7eb palette)
- `lib/pdf/CotizacionTemplate.tsx` - QuoteLineItem and QuoteProjectData types + React-PDF Document component with all 7 sections
- `lib/pdf/CotizacionTemplate.test.ts` - Type safety tests confirming no costo_proveedor or margen in QuoteLineItem
- `lib/queries/projects.ts` - Added getProjectForQuote() — maps DB line items to safe QuoteLineItem, returns QuoteProjectData
- `app/(admin)/proyectos/[id]/cotizacion/route.tsx` - GET handler: auth check, getProjectForQuote(), renderToStream, Content-Type: application/pdf
- `app/(admin)/proyectos/[id]/page.tsx` - Added Documentos section with "Descargar Cotizacion PDF" download link

## Decisions Made

- Used `.tsx` extension for the cotizacion route handler (not `.ts`) — JSX requires it even in Next.js API routes
- Cast `renderToStream(<CotizacionTemplate ... /> as any)` to resolve `DocumentProps` vs `CotizacionTemplateProps` TypeScript mismatch — this is the established community pattern for wrapping Document in a component
- Built-in Helvetica font only — no `Font.register()` with local file paths (avoids Vercel path resolution failures at deploy time)
- `costo_proveedor` and `margen` are fetched from DB (needed for `calcPrecioVenta`) but consumed inside `getProjectForQuote` and never appear in the returned `QuoteProjectData` type

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Route file renamed to .tsx and renderToStream cast fixed**
- **Found during:** Task 2 (route handler creation)
- **Issue:** Plan specified `route.ts` but JSX in route handlers requires `.tsx`; TypeScript error `TS2345` on renderToStream call since `CotizacionTemplateProps` doesn't match `DocumentProps`
- **Fix:** Renamed to `route.tsx`; cast JSX element `as any` for renderToStream parameter (established community pattern)
- **Files modified:** app/(admin)/proyectos/[id]/cotizacion/route.tsx
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** 28f22ac (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug/type error)
**Impact on plan:** Required fix for TypeScript compliance. No scope creep. No behavior change — JSX renders identically.

## Issues Encountered

- TypeScript strict mode rejected the renderToStream call with CotizacionTemplate JSX element due to DocumentProps vs component props type mismatch. Standard community workaround (`as any`) applied since @react-pdf/renderer doesn't export a looser overload.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- GET /proyectos/[id]/cotizacion is live and ready for manual browser testing (log in, open a project, click the download button)
- Phase 5 Plan 02 (Ordenes de Compra) can now add OC download buttons in the Documentos section (placeholder comment left in page.tsx)
- Note: Test @react-pdf/renderer in Vercel preview deployment early — font path resolution may differ from local dev (from STATE.md decisions)

## Self-Check: PASSED

All created files verified present. Both task commits (9688885, 28f22ac) confirmed in git log.

---
*Phase: 05-generacion-de-pdfs*
*Completed: 2026-03-04*
