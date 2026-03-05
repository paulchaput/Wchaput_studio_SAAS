---
phase: 05-generacion-de-pdfs
verified: 2026-03-04T23:40:00Z
status: human_needed
score: 7/7 must-haves verified (automated); 3 items require human PDF inspection
human_verification:
  - test: "Open a downloaded cotizacion PDF and confirm zero cost/margin data"
    expected: "No costo_proveedor values, no margen percentages, no internal notes visible anywhere in the PDF"
    why_human: "TypeScript boundary and type tests verify the data shape, but only human eye-inspection of rendered PDF content can confirm the PDF renderer did not accidentally include extra data"
  - test: "Download cotizacion PDF and verify editorial design"
    expected: "White background, Helvetica font, bottom-border-only line item rows (no box borders), table header with thicker bottom border, monochrome palette (black #111827 / light gray #e5e7eb)"
    why_human: "Visual PDF layout cannot be verified programmatically — only a human inspecting the rendered PDF can confirm QUOT-04 design compliance"
  - test: "Log in as accountant and navigate to /proyectos/{id}/orden-compra?supplier_id={valid-uuid}"
    expected: "Browser receives plain text '403 Acceso denegado' (not a PDF download)"
    why_human: "The role guard logic is verified in code, but end-to-end 403 behavior across auth middleware + DB role lookup requires a live browser session as a non-admin user"
---

# Phase 5: Generacion de PDFs Verification Report

**Phase Goal:** Partners can download a client-facing quote PDF that never shows costs, and admin can generate a supplier purchase order PDF that shows supplier costs — both with W Chaput Studio branding.
**Verified:** 2026-03-04T23:40:00Z
**Status:** human_needed (all automated checks pass; 3 visual/runtime items need human confirmation)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Partner can click a download link on the project detail page and receive a PDF | VERIFIED | `page.tsx` line 164-170: `<a href="/proyectos/${id}/cotizacion" download>Descargar Cotizacion PDF</a>` wired to `route.tsx` returning `Content-Type: application/pdf` |
| 2 | Quote PDF shows all QUOT-02 sections (header, client info, line items, subtotal/IVA/total, payment schedule, terms) | VERIFIED | `CotizacionTemplate.tsx` renders: COTIZACION heading, STUDIO_NAME, client block, line items table with `formatMXN(precioVenta)`, totals (subtotal/IVA 16%/TOTAL), Plan de Pagos (70%/30%), Terminos y Condiciones |
| 3 | PDF contains zero cost figures, margin percentages, or costo_/margen fields | VERIFIED | `QuoteLineItem` type has only `{descripcion, referencia, cantidad, precioVenta, totalVenta}` — no `costo_proveedor` or `margen`; TypeScript enforces boundary; confirmed by 2 passing unit tests |
| 4 | PDF visual design uses white background, Helvetica font, bottom-border-only rows, monochrome palette | ? HUMAN NEEDED | `pdf-styles.ts` defines all required styles (`backgroundColor: '#ffffff'`, `fontFamily: 'Helvetica'`, `borderBottomWidth: 1, borderBottomColor: '#e5e7eb'`, `color: '#111827'`), but rendered output requires visual inspection |
| 5 | Cotizacion route returns Content-Type: application/pdf for authenticated users, 401 for unauthenticated | VERIFIED | `route.tsx` line 15: `if (!user) return new Response('No autorizado', { status: 401 })`; line 29: `'Content-Type': 'application/pdf'` |
| 6 | Admin can generate per-supplier OC PDF showing supplier costs | VERIFIED | `orden-compra/route.tsx` wires admin role check → `getProjectLineItemsBySupplier()` → `OrdenCompraTemplate` → `renderToStream`; `OcLineItem` type includes `costoProveedor` and `totalCosto` |
| 7 | Accountant role cannot access OC route (403); OC buttons hidden from non-admin in UI | VERIFIED (code) / ? HUMAN (end-to-end) | `orden-compra/route.tsx` line 27: `if (profile?.role !== 'admin') return new Response('Acceso denegado', { status: 403 })`; `page.tsx` line 171: `{isAdmin && (() => { ... })()}` |

**Score:** 7/7 truths verified at code level; 3 require human confirmation for full closure

---

## Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `lib/pdf/pdf-styles.ts` | VERIFIED | Exists, substantive (117 lines), exports `styles` StyleSheet with all required keys: `page`, `header`, `tableRow`, `tableHeader`, `studioName`, `heading`, `totalsSection`, `grandTotalRow`, `paymentSection`, `termsSection` |
| `lib/pdf/pdf-content.ts` | VERIFIED | Exists, exports `STUDIO_NAME = 'W CHAPUT STUDIO'` and `TERMINOS_Y_CONDICIONES` text constant |
| `lib/pdf/CotizacionTemplate.tsx` | VERIFIED | Exists (141 lines), exports `QuoteLineItem`, `QuoteProjectData`, `CotizacionTemplate`; `QuoteLineItem` has no `costo_proveedor` or `margen` fields; renders all 7 QUOT-02 sections |
| `lib/pdf/CotizacionTemplate.test.ts` | VERIFIED | Exists, 2 tests passing — confirms `QuoteLineItem` has no `costo_proveedor` or `margen`, `QuoteProjectData` correctly typed |
| `lib/pdf/OrdenCompraTemplate.tsx` | VERIFIED | Exists (127 lines), exports `OcLineItem` (with `costoProveedor`, `totalCosto`), `OcSupplierInfo`, `OcProjectData`, `OrdenCompraTemplate`; renders all OC-02 sections |
| `lib/pdf/OrdenCompraTemplate.test.ts` | VERIFIED | Exists, 2 tests passing — confirms `OcLineItem` has `costoProveedor` and `totalCosto`, does not have `margen` |
| `lib/queries/projects.ts` | VERIFIED | Exports `getProjectForQuote()` (maps DB line items to safe `QuoteLineItem[]`) and `getProjectLineItemsBySupplier()` (returns `OcProjectData` with cost data) |
| `app/(admin)/proyectos/[id]/cotizacion/route.tsx` | VERIFIED | Exists (33 lines), auth check, `getProjectForQuote()`, `renderToStream`, `Content-Type: application/pdf`, dynamic filename |
| `app/(admin)/proyectos/[id]/orden-compra/route.tsx` | VERIFIED | Exists (54 lines), auth check, admin role guard (403), UUID validation (400), `getProjectLineItemsBySupplier()`, `renderToStream`, `Content-Type: application/pdf` |
| `app/(admin)/proyectos/[id]/page.tsx` | VERIFIED | Documentos section exists (lines 159-196); cotizacion download link present; per-supplier OC links wrapped in `{isAdmin && (() => { ... })()}` |

**Note on file extensions:** Both route handlers use `.tsx` extension (not `.ts` as originally planned) — required because JSX is used directly in the route handler. This is a correct deviation documented in the SUMMARYs.

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `page.tsx` | `/proyectos/[id]/cotizacion` | `<a href=... download>` | WIRED | Line 165: `href={\`/proyectos/${id}/cotizacion\`}` with `download` attribute |
| `cotizacion/route.tsx` | `lib/pdf/CotizacionTemplate.tsx` | `renderToStream(<CotizacionTemplate project={...} />)` | WIRED | Line 21: `renderToStream(<CotizacionTemplate project={project} /> as any)` |
| `cotizacion/route.tsx` | `lib/queries/projects.ts` | `getProjectForQuote(id)` | WIRED | Line 4 import, line 17: `const project = await getProjectForQuote(id)` |
| `lib/queries/projects.ts` | `lib/calculations.ts` | `calcPrecioVenta`, `calcTotalVenta` per line item | WIRED | Line 2 import, lines 75-76: computed before returning `QuoteLineItem[]` |
| `page.tsx` | `/proyectos/[id]/orden-compra?supplier_id=` | `isAdmin && supplierMap.map() <a href=... download>` | WIRED | Lines 171-194: IIFE guarded by `isAdmin`, Map deduplication, `href={\`/proyectos/${id}/orden-compra?supplier_id=${supplierId}\`}` |
| `orden-compra/route.tsx` | `profiles` table | `supabase.from('profiles').select('role').eq('id', user.id)` | WIRED | Lines 22-29: role check before PDF generation, returns 403 if not admin |
| `orden-compra/route.tsx` | `lib/queries/projects.ts` | `getProjectLineItemsBySupplier(id, supplierId)` | WIRED | Line 4 import, line 37: `const ocData = await getProjectLineItemsBySupplier(id, supplierId)` |
| `orden-compra/route.tsx` | `lib/pdf/OrdenCompraTemplate.tsx` | `renderToStream(<OrdenCompraTemplate data={...} />)` | WIRED | Line 43: `renderToStream(<OrdenCompraTemplate data={ocData} />)` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| QUOT-01 | 05-01-PLAN | User can generate a PDF quote (cotizacion) from a project's line items | SATISFIED | Route `GET /proyectos/[id]/cotizacion` exists, fetches line items via `getProjectForQuote()`, renders via `CotizacionTemplate`, returns PDF stream |
| QUOT-02 | 05-01-PLAN | PDF shows: W Chaput Studio header, COTIZACION heading, client info, line items table, subtotal, IVA 16%, grand total, payment schedule (70%/30%), terms | SATISFIED | All 7 sections present in `CotizacionTemplate.tsx` — verified by direct code inspection |
| QUOT-03 | 05-01-PLAN | PDF never shows supplier costs, margins, internal notes, or costo_/margen fields | SATISFIED | `QuoteLineItem` type enforces boundary at TypeScript level; 2 unit tests confirm at runtime; `getProjectForQuote()` consumes cost data internally, returns only sale prices |
| QUOT-04 | 05-01-PLAN | PDF design: white background, minimal borders, monochrome, bottom-border-only rows | SATISFIED (code) / HUMAN NEEDED (visual) | `pdf-styles.ts` defines all required styles correctly; rendered PDF output requires human inspection |
| QUOT-05 | 05-01-PLAN | User can download PDF from project detail page | SATISFIED | `page.tsx` Documentos section (line 159) has `<a href="...cotizacion" download>Descargar Cotizacion PDF</a>` |
| OC-01 | 05-02-PLAN | User can generate a Purchase Order PDF for a specific supplier on a specific project | SATISFIED | Route `GET /proyectos/[id]/orden-compra?supplier_id={uuid}` exists, validates UUID, fetches supplier-filtered items, renders PDF |
| OC-02 | 05-02-PLAN | PO PDF shows: W Chaput Studio header, supplier contact block, project name, filtered line items with unit cost and total cost | SATISFIED | `OrdenCompraTemplate.tsx` renders all required sections; `OcLineItem` includes `costoProveedor` and `totalCosto` |
| OC-03 | 05-02-PLAN | Purchase Order PDFs accessible only to admin role | SATISFIED (code) / HUMAN NEEDED (live session) | `orden-compra/route.tsx` checks `profiles.role === 'admin'`, returns 403 for non-admin; `page.tsx` hides OC buttons when `isAdmin=false` |

No orphaned requirements: all 8 IDs declared in plans are present in REQUIREMENTS.md and fully mapped to Phase 5.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `cotizacion/route.tsx` | 21 | `as any` cast for renderToStream JSX element | Info | Established community workaround for `@react-pdf/renderer` DocumentProps mismatch; documented in SUMMARY as intentional deviation |

No TODOs, FIXMEs, placeholder returns, or stub implementations found in any phase 5 files.

---

## Human Verification Required

### 1. Quote PDF Content — Zero Cost Leakage

**Test:** Log in as any user. Open a project with at least 2 line items. Click "Descargar Cotizacion PDF" in the Documentos section. Open the downloaded PDF.

**Expected:** PDF contains COTIZACION heading, W CHAPUT STUDIO text (top-right), client name, quote number, date, line items table showing only sale prices (no raw cost figures, no margen percentages), subtotal, "IVA 16%", grand total, "Plan de Pagos" with 70% anticipo and 30% saldo amounts, and the terms and conditions text block. No field labeled costo, margen, or any internal figure should appear anywhere in the document.

**Why human:** TypeScript type boundary and unit tests prove the data shape excludes cost/margin fields, but only visual inspection of the rendered PDF can confirm the React-PDF renderer did not accidentally include debug or extra output.

### 2. Quote PDF Design — QUOT-04 Visual Spec

**Test:** Using the same downloaded PDF from test 1, inspect the visual layout.

**Expected:** White background (not cream or gray), Helvetica font throughout, line item rows separated only by a thin light-gray bottom border (no left/right/top borders forming a box), table header row has a thicker bottom border, all text is black or dark gray — no color accents.

**Why human:** CSS/StyleSheet values in `pdf-styles.ts` match the spec exactly, but rendered PDF output requires a human to confirm the visual appearance matches the editorial design intent.

### 3. Accountant Role — 403 on OC Route

**Test:** Log out. Log in with an accountant-role account. (1) Confirm the project detail page shows "Descargar Cotizacion PDF" but does NOT show any "OC — {SupplierName}" buttons. (2) Navigate directly to: `http://localhost:3000/proyectos/{any-project-id}/orden-compra?supplier_id={any-valid-uuid}`.

**Expected:** (1) OC buttons are absent from the Documentos section. (2) Browser receives a plain text "Acceso denegado" response (HTTP 403) — not a file download.

**Why human:** The `isAdmin` conditional and the 403 route guard are verified in code, but end-to-end auth middleware + Supabase role lookup + HTTP response behavior requires a live browser session under an accountant account to confirm the full chain works.

---

## Automated Test Results

- `npx vitest run lib/pdf` — 4 tests, 2 files, all PASSED
- `npx tsc --noEmit` — zero TypeScript errors

---

## Gaps Summary

No gaps found. All 9 artifacts exist, are substantive (not stubs), and are wired. All 8 key links verified. All 8 requirement IDs accounted for in both plan frontmatter and REQUIREMENTS.md. Three items are flagged for human verification only because they involve visual PDF rendering or live browser authentication — not because of any code deficiency.

---

_Verified: 2026-03-04T23:40:00Z_
_Verifier: Claude (gsd-verifier)_
