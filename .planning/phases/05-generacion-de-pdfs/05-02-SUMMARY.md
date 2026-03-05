---
phase: 05-generacion-de-pdfs
plan: "02"
subsystem: pdf
tags: [react-pdf, purchase-order, admin, role-guard, pdf-generation]

# Dependency graph
requires:
  - phase: 05-01
    provides: CotizacionTemplate, pdf-styles.ts, pdf-content.ts, renderToStream pattern, @react-pdf/renderer
  - phase: 02-proyectos-y-partidas
    provides: line_items table with proveedor_id and costo_proveedor fields
  - phase: 01-fundacion
    provides: profiles table role-based auth, createClient, admin/accountant roles

provides:
  - OrdenCompraTemplate React-PDF component with OcLineItem/OcSupplierInfo/OcProjectData types
  - getProjectLineItemsBySupplier(projectId, supplierId) query returning OcProjectData
  - GET /proyectos/[id]/orden-compra?supplier_id={uuid} — admin-only PDF route (403 for accountant, 400 without valid UUID)
  - Per-supplier OC download buttons in Documentos section (isAdmin-gated)

affects:
  - 06-dashboard (PDF generation complete for both client and internal documents)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Admin-only PDF route with profiles role check before PDF generation
    - UUID regex validation for query params at HTTP layer
    - Per-supplier download link derivation from lineItems array using Map deduplication
    - Array.isArray normalization for Supabase joined relation type inference

key-files:
  created:
    - lib/pdf/OrdenCompraTemplate.tsx
    - lib/pdf/OrdenCompraTemplate.test.ts
    - app/(admin)/proyectos/[id]/orden-compra/route.tsx
  modified:
    - lib/queries/projects.ts
    - app/(admin)/proyectos/[id]/page.tsx

key-decisions:
  - "OrdenCompraTemplate uses OcLineItem with costoProveedor (not margen) — admin-only cost visibility confirmed by type shape test"
  - "route.tsx (not route.ts) for orden-compra route — JSX requires .tsx extension, same as cotizacion route"
  - "Supabase joined suppliers relation typed as array — normalized with Array.isArray check before property access"
  - "lineItems.forEach explicit type annotation for li parameter — prevents implicit any in strict TypeScript"

patterns-established:
  - "Admin-only PDF route: check auth -> check role === 'admin' -> validate UUID param -> query -> render"
  - "Per-supplier OC link: Map<supplierId, supplierNombre> deduplication from lineItems array"

requirements-completed: [OC-01, OC-02, OC-03]

# Metrics
duration: 3min
completed: 2026-03-05
---

# Phase 5 Plan 02: Orden de Compra PDF Summary

**Admin-only purchase order PDF flow using OrdenCompraTemplate with supplier cost data, role-gated route handler (403 for accountant), UUID-validated supplier_id param, and per-supplier OC download buttons on the project detail page.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-05T05:32:41Z
- **Completed:** 2026-03-05T05:36:30Z
- **Tasks:** 2 auto + 1 checkpoint (auto-approved)
- **Files modified:** 5

## Accomplishments
- OrdenCompraTemplate React-PDF component renders supplier block (nombre, contacto, email, telefono), project reference, line items table (costo unit. + total), and grand total cost row
- getProjectLineItemsBySupplier query fetches supplier-filtered line items with cost data — never exposes margen
- Admin-only route enforces role check before PDF generation — accountant receives 403 Acceso denegado
- Per-supplier OC download links derived from unique suppliers in lineItems array, visible only when isAdmin=true
- Type shape tests confirm OcLineItem has costoProveedor field and does NOT have margen

## Task Commits

Each task was committed atomically:

1. **Task 1: OrdenCompraTemplate component and test, getProjectLineItemsBySupplier query** - `2138b5d` (feat)
2. **Task 2: Admin-only orden-compra route handler and OC download buttons in page.tsx** - `acec7be` (feat)
3. **Checkpoint: human-verify** - Auto-approved (auto_advance=true)

## Files Created/Modified
- `lib/pdf/OrdenCompraTemplate.tsx` - React-PDF Document component for supplier purchase order with OcLineItem/OcSupplierInfo/OcProjectData types
- `lib/pdf/OrdenCompraTemplate.test.ts` - Type shape tests confirming admin-only cost fields present (no margen)
- `lib/queries/projects.ts` - Added getProjectLineItemsBySupplier() — supplier-filtered line items with cost data
- `app/(admin)/proyectos/[id]/orden-compra/route.tsx` - GET handler: admin role guard, supplier_id UUID validation, renderToStream
- `app/(admin)/proyectos/[id]/page.tsx` - Per-supplier OC download links (isAdmin-gated) in Documentos section

## Decisions Made
- `route.tsx` (not `route.ts`) for orden-compra route — JSX requires .tsx extension even for Next.js route handlers (same pattern as cotizacion from 05-01)
- Supabase types joined `suppliers` relation as array — normalized with `Array.isArray()` check before property access to satisfy TypeScript strict mode
- Explicit type annotation `li: { suppliers?: ... }` in forEach callback — prevents implicit `any` TypeScript error in page.tsx where lineItems inferred from Supabase return
- OcLineItem shape intentionally includes `costoProveedor` and excludes `margen` — type boundary enforced at query layer (cost computed, margin never forwarded)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Supabase array type for joined suppliers relation**
- **Found during:** Task 1 (getProjectLineItemsBySupplier query)
- **Issue:** TypeScript error TS2339 — Supabase infers `suppliers` from JOIN as `{ id, nombre, ... }[]` (array), but code accessed `.nombre` directly
- **Fix:** Added `Array.isArray(rawSupplier) ? rawSupplier[0] : rawSupplier` normalization before property access
- **Files modified:** lib/queries/projects.ts
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** `2138b5d` (Task 1 commit)

**2. [Rule 1 - Bug] Fixed implicit any in forEach callback parameter**
- **Found during:** Task 2 (page.tsx update)
- **Issue:** TypeScript error TS7006 — `li` parameter in lineItems.forEach had implicit `any` type
- **Fix:** Added explicit inline type annotation: `(li: { suppliers?: { id: string; nombre: string } | null })`
- **Files modified:** app/(admin)/proyectos/[id]/page.tsx
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** `acec7be` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 — TypeScript type errors)
**Impact on plan:** Both auto-fixes required for TypeScript compilation. No scope creep — direct result of current task changes.

## Issues Encountered
None beyond the TypeScript type errors documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 5 complete: both PDF flows implemented (CotizacionTemplate for clients, OrdenCompraTemplate for suppliers)
- PDF generation tested and role-gated: accountant cannot access order purchase PDFs
- Ready for Phase 6 (Dashboard) — all financial data and PDF generation complete

---
*Phase: 05-generacion-de-pdfs*
*Completed: 2026-03-05*
