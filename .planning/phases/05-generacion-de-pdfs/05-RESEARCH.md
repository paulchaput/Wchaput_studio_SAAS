# Phase 5: Generacion de PDFs - Research

**Researched:** 2026-03-04
**Domain:** PDF generation with @react-pdf/renderer in Next.js 15 App Router
**Confidence:** HIGH (core approach) / MEDIUM (Next.js 15 compatibility path)

---

## Summary

Phase 5 adds two PDF generation flows to the existing project: a client-facing quote (cotizacion) that exposes only sale prices and project info with W Chaput Studio branding, and an admin-only purchase order (orden de compra) per supplier that exposes supplier costs. Both PDFs are generated server-side via Next.js App Router route handlers and downloaded by the user via a standard HTML link.

The primary library is `@react-pdf/renderer` (currently v4.3.2). It is in Next.js's auto-approved `serverExternalPackages` list, which eliminates the bundling configuration problem that plagued older versions. The key compatibility risk — confirmed by multiple GitHub issues — is that `@react-pdf/renderer` can fail in Next.js App Router route handlers due to React version conflicts. The verified working mitigation for this project (React 19 is already installed) is to ensure React 19.0.0 is consistent and to call `renderToStream`, convert the Node stream to a Web `ReadableStream`, and return it via `new Response()`. The existing `next.config.ts` needs no changes because Next.js 15 auto-opts-out `@react-pdf/renderer`.

The security requirement (OC-03) is enforced at the route handler level using the same `createClient()` + `profiles` role check pattern already established in Phases 3 and 4. Zero cost or margin columns must be selected in the `getProjectForQuote()` query (QUOT-03) — this is enforced at the data layer, not the template.

**Primary recommendation:** Use `@react-pdf/renderer` v4 with server-side `renderToStream` converted to a Web `ReadableStream` in Next.js App Router route handlers. Keep PDF templates as pure TypeScript functions in `lib/pdf/`. Enforce cost exclusion at the query layer, not the template.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| QUOT-01 | User can generate a PDF quote (cotizacion) from a project's line items | Route handler at `app/(admin)/proyectos/[id]/cotizacion/route.ts` using `renderToStream` |
| QUOT-02 | PDF shows: logo, COTIZACION heading, client info, line items (sale prices), subtotal, IVA 16%, grand total, payment schedule 70/30, terms | `@react-pdf/renderer` Document/Page/View/Text/Image components with StyleSheet; existing `calcSubtotal`, `calcTotal`, `calcAnticipo`, `calcSaldo` from `lib/calculations.ts` |
| QUOT-03 | PDF never shows supplier costs, margins, internal notes, profit figures | Enforced via `getProjectForQuote()` query that selects zero cost columns; template only receives safe data shape |
| QUOT-04 | Editorial design: white background, minimal borders, monochrome, bottom-border-only rows | `@react-pdf/renderer` StyleSheet supports all needed CSS: borderBottomWidth, borderBottomColor, flexbox layout |
| QUOT-05 | User can download PDF from project detail page | `<a href="/proyectos/[id]/cotizacion">` download link in existing ProyectoDetailPage |
| OC-01 | User can generate a Purchase Order PDF for a specific supplier on a specific project | Route handler at `app/(admin)/proyectos/[id]/orden-compra/route.ts` with `?supplier_id=` query param |
| OC-02 | PO PDF shows: header, supplier name/contact, project name, line items filtered to supplier (description, quantity, unit cost, total cost) | `@react-pdf/renderer` template with supplier-filtered line items from existing `getProjectWithLineItems()` extended with supplier filter |
| OC-03 | Purchase Order PDFs accessible only to admin role | Route handler role check via `createClient()` + `profiles` table query, returning 403 for non-admin |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @react-pdf/renderer | ^4.3.2 | PDF template authoring and server-side rendering | Pre-existing decision (STATE.md Phase 5 note); React component API; in Next.js auto-approved list |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Already in project: `lib/calculations.ts` | — | `calcSubtotal`, `calcTotal`, `calcAnticipo`, `calcSaldo`, `IVA_RATE` | All PDF totals use these; zero new formula code |
| Already in project: `lib/formatters.ts` | — | `formatMXN`, `formatFecha` | All currency and date display in PDF templates |
| Already in project: `lib/supabase/server.ts` | — | `createClient()` for route handler auth + data fetch | Same pattern as pages 3 and 4 |

### No New Dependencies Required
The project already has React 19 (`"react": "^19.0.0"` in package.json). Only `@react-pdf/renderer` needs to be installed.

**Installation:**
```bash
npm install @react-pdf/renderer
```

> Note: `@types/react-pdf` does not exist separately — types ship with the package.

---

## Architecture Patterns

### Recommended Project Structure
```
app/
└── (admin)/
    └── proyectos/
        └── [id]/
            ├── cotizacion/
            │   └── route.ts          # GET → PDF stream (QUOT-01, QUOT-05)
            └── orden-compra/
                └── route.ts          # GET ?supplier_id= → PDF stream (OC-01, OC-03)

lib/
├── pdf/
│   ├── CotizacionTemplate.tsx        # React-PDF Document component (QUOT-02, QUOT-04)
│   ├── OrdenCompraTemplate.tsx       # React-PDF Document component (OC-02)
│   └── pdf-styles.ts                 # Shared StyleSheet constants
└── queries/
    └── projects.ts                   # Add getProjectForQuote() (QUOT-03)
```

### Pattern 1: Route Handler — Serve PDF Stream

**What:** Next.js App Router route handler converts a `@react-pdf/renderer` Node stream to a Web `ReadableStream` and returns it via `new Response()`.

**When to use:** Both cotizacion and orden-compra routes use this pattern identically.

```typescript
// app/(admin)/proyectos/[id]/cotizacion/route.ts
import { renderToStream } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { CotizacionTemplate } from '@/lib/pdf/CotizacionTemplate'
import { getProjectForQuote } from '@/lib/queries/projects'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('No autorizado', { status: 401 })

  const project = await getProjectForQuote(id)
  if (!project) return new Response('Proyecto no encontrado', { status: 404 })

  const stream = await renderToStream(<CotizacionTemplate project={project} />)

  return new Response(stream as unknown as ReadableStream, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="cotizacion-${project.numero_cotizacion ?? id}.pdf"`,
    },
  })
}
```

> Source: react-pdf.org/node (official docs), confirmed working with React 19 per GitHub issue #3074

### Pattern 2: Admin-Only Route Guard

**What:** Route handler checks role via `profiles` table before generating PDF — same pattern as ChecklistPanel (Phase 4).

```typescript
// app/(admin)/proyectos/[id]/orden-compra/route.ts
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single()

if (profile?.role !== 'admin') {
  return new Response('Acceso denegado', { status: 403 })
}
```

### Pattern 3: Safe Data Query — Zero Cost Exposure

**What:** A new `getProjectForQuote()` function in `lib/queries/projects.ts` that explicitly does NOT select cost or margin columns.

```typescript
// lib/queries/projects.ts — new function
export async function getProjectForQuote(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select(`
      id, nombre, cliente_nombre, numero_cotizacion,
      fecha_cotizacion, salesperson, fecha_entrega_estimada,
      line_items (
        id, descripcion, referencia, dimensiones,
        cantidad, costo_proveedor, margen
        /* costo_proveedor and margen still fetched server-side to compute sale price */
        /* but the TypeScript type returned to the template omits them */
      )
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}
```

> IMPORTANT: The template receives a TypeScript type that only exposes computed sale price and quantity — never raw `costo_proveedor` or `margen`. The route handler computes `precioVenta` via `calcPrecioVenta()` before passing to the template.

### Pattern 4: PDF Template — Editorial Design

**What:** React-PDF Document component using StyleSheet with flexbox layout for table rows, bottom-border-only rows, monochrome palette.

```typescript
// lib/pdf/CotizacionTemplate.tsx
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { backgroundColor: '#ffffff', padding: 40, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  heading: { fontSize: 28, fontWeight: 'bold', marginBottom: 16 },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#111827',
    paddingVertical: 6,
  },
  cell: { fontSize: 9, color: '#111827' },
  totalsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
})
```

> Source: react-pdf.org/styling

### Anti-Patterns to Avoid

- **Putting cost data in the template's type signature:** Even if the route strips it at runtime, a typed prop that accepts `costo_proveedor` is a leak waiting to happen. Use a dedicated `QuoteLineItem` type with only `descripcion`, `cantidad`, `precioVenta`, `totalVenta`.
- **Using `renderToBuffer` without React 19:** The issues tracker confirms this fails with React version mismatches. `renderToStream` is more robust.
- **Generating PDFs client-side with `PDFDownloadLink`:** This would require shipping the entire library to the browser and runs into RSC boundary issues. Server-side route handlers are the correct approach.
- **Inline `font.register()` in the template file:** Font registration is global and runs once. Put it in a module-level call in the template file, not inside the component render.
- **Using `export const runtime = 'edge'`:** `@react-pdf/renderer` requires Node.js (Yoga layout engine). Edge runtime will break it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF layout engine | Custom HTML→PDF converter (puppeteer, wkhtmltopdf) | `@react-pdf/renderer` | PDF spec is complex; font embedding, page breaks, Unicode — all handled |
| Currency formatting in PDF | New format function | Existing `formatMXN()` from `lib/formatters.ts` | Single source of truth already tested |
| Financial calculations | New totals math | Existing `calcSubtotal`, `calcTotal`, `calcAnticipo`, `calcSaldo` from `lib/calculations.ts` | Prevents drift from UI values |
| Admin role check | Custom middleware | `profiles` table query pattern (same as ProyectoDetailPage) | Already pattern-established across Phases 3–4 |

**Key insight:** PDF templates are purely presentational. All calculation logic lives in `lib/calculations.ts`. The template receives pre-computed values.

---

## Common Pitfalls

### Pitfall 1: React Version Mismatch Breaks `renderToStream`
**What goes wrong:** `TypeError: ba.Component is not a constructor` or `Minified React error #31` in the route handler.
**Why it happens:** `@react-pdf/renderer` uses `react-reconciler` which accesses React internals. If two different React versions exist in `node_modules` (e.g., your app uses React 19 but a UI library peer-depends on React 18), the reconciler picks up 18.x and fails.
**How to avoid:** This project already has `"react": "^19.0.0"` and `"react-dom": "^19.0.0"`. Verify after installing `@react-pdf/renderer` that no nested React 18 appears: `npm ls react`.
**Warning signs:** PDF route returns 500 with constructor error in logs.

### Pitfall 2: Cost Data Leaking Into Quote PDF
**What goes wrong:** `costo_proveedor` or `margen` appears in the PDF output, violating QUOT-03.
**Why it happens:** The template is passed the full `LineItem` type which includes cost fields.
**How to avoid:** Define a dedicated `QuoteLineItem` type: `{ descripcion: string; referencia: string | null; cantidad: number; precioVenta: number; totalVenta: number }`. The route handler maps raw line items to this type before passing to the template. TypeScript will catch any cost field access in the template.
**Warning signs:** Template prop type accepts `costo_proveedor` field.

### Pitfall 3: Font Path Resolution Fails on Vercel
**What goes wrong:** Custom font files at `public/fonts/...` resolve correctly in local dev but return 404 in Vercel preview deployments.
**Why it happens:** In server-side rendering, `Font.register({ src: '/fonts/...' })` is a relative URL. Node.js route handlers don't have a base URL, so the path is unresolvable unless it is an absolute URL or an absolute filesystem path.
**How to avoid:** Use an absolute URL for fonts (e.g., Google Fonts CDN URL), or use the built-in `Helvetica` / `Helvetica-Bold` / `Helvetica-Oblique` fonts that are bundled with `@react-pdf/renderer` (no registration needed). The editorial monochrome design (QUOT-04) suits Helvetica well.
**Warning signs:** PDF generates locally but shows wrong/missing font on Vercel. STATE.md already flags this: "Test @react-pdf/renderer in Vercel preview deployment early."

### Pitfall 4: No `await` on `renderToStream`
**What goes wrong:** Route handler returns before the PDF is generated; response body is empty.
**Why it happens:** `renderToStream` is async and returns a Promise.
**How to avoid:** Always `const stream = await renderToStream(...)`.

### Pitfall 5: `renderToStream` TypeScript Type
**What goes wrong:** TypeScript error when passing Node stream to `new Response()` which expects `ReadableStream`.
**Why it happens:** `renderToStream` returns a Node.js `PassThrough` stream, not a Web API `ReadableStream`.
**How to avoid:** Cast: `stream as unknown as ReadableStream`. This is the established community pattern (multiple GitHub issue confirmations).

### Pitfall 6: Orden de Compra Missing `supplier_id` Validation
**What goes wrong:** Route returns PDFs with all line items, not filtered to the specific supplier.
**Why it happens:** `supplier_id` query param not validated, or filtering logic wrong.
**How to avoid:** `const supplierId = new URL(request.url).searchParams.get('supplier_id')`. Validate as UUID using Zod before filtering. Return 400 if missing.

---

## Code Examples

### Render PDF Route Handler (Minimal)
```typescript
// Source: react-pdf.org/node + GitHub issues #3074, #2350
import { renderToStream } from '@react-pdf/renderer'
import { MyDocument } from '@/lib/pdf/MyDocument'

export async function GET() {
  const stream = await renderToStream(<MyDocument />)
  return new Response(stream as unknown as ReadableStream, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="document.pdf"',
    },
  })
}
```

### Editorial Table Row (Bottom-Border-Only)
```typescript
// Source: react-pdf.org/styling
import { View, Text, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 8,
    alignItems: 'center',
  },
  col: { fontSize: 9, color: '#111827' },
})

function LineItemRow({ item }: { item: QuoteLineItem }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.col, { flex: 4 }]}>{item.descripcion}</Text>
      <Text style={[styles.col, { flex: 1, textAlign: 'right' }]}>{item.cantidad}</Text>
      <Text style={[styles.col, { flex: 2, textAlign: 'right' }]}>{formatMXN(item.precioVenta)}</Text>
      <Text style={[styles.col, { flex: 2, textAlign: 'right' }]}>{formatMXN(item.totalVenta)}</Text>
    </View>
  )
}
```

### Using Built-in Helvetica (No Font Registration Needed)
```typescript
// Source: react-pdf.org/fonts — Helvetica is bundled, no Font.register() call required
const styles = StyleSheet.create({
  body: { fontFamily: 'Helvetica', fontSize: 10 },
  bold: { fontFamily: 'Helvetica-Bold' },
  italic: { fontFamily: 'Helvetica-Oblique' },
})
```

### Download Link in ProyectoDetailPage
```tsx
// Add to existing page.tsx — QUOT-05
<a
  href={`/proyectos/${id}/cotizacion`}
  className="inline-flex items-center gap-2 text-sm font-medium border px-3 py-1.5 rounded hover:bg-muted"
  download
>
  Descargar Cotización PDF
</a>

{/* Admin only — OC-01, OC-03 */}
{isAdmin && suppliers.map(supplier => (
  <a
    key={supplier.id}
    href={`/proyectos/${id}/orden-compra?supplier_id=${supplier.id}`}
    download
  >
    OC — {supplier.nombre}
  </a>
))}
```

### Supplier-Filtered Line Items for Orden de Compra
```typescript
// lib/queries/projects.ts — extend getProjectWithLineItems
export async function getProjectLineItemsBySupplier(
  projectId: string,
  supplierId: string
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('line_items')
    .select(`
      id, descripcion, referencia, dimensiones,
      cantidad, costo_proveedor,
      suppliers ( id, nombre, contacto, email, telefono )
    `)
    .eq('project_id', projectId)
    .eq('proveedor_id', supplierId)

  if (error) throw error
  return data ?? []
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `serverComponentsExternalPackages` (experimental) | `serverExternalPackages` (stable) | Next.js 15.0.0 | Config rename; no functional change |
| React 18 + react-pdf → crashes | React 19 + react-pdf v4.1.0+ → works | react-pdf v4.1.0 (2024) | React 19 support added explicitly |
| `renderToBuffer` (primary server API) | `renderToStream` (more compatible) | Ongoing | Buffer requires more careful async handling; stream is more composable |
| `Font.register()` with local paths | Built-in fonts (Helvetica) or CDN URLs | Always best practice | Eliminates Vercel path resolution bug |

**Deprecated/outdated:**
- `experimental.serverComponentsExternalPackages`: Renamed to `serverExternalPackages` in Next.js 15.
- `@joshuajaco/react-pdf-renderer-bundled`: A community workaround fork — unnecessary with React 19.

---

## Open Questions

1. **W Chaput Studio logo file location and format**
   - What we know: QUOT-02 requires the logo at top-right. `@react-pdf/renderer` supports PNG and JPEG via `<Image src="..." />`.
   - What's unclear: Is there a logo file in `public/`? What format?
   - Recommendation: During Plan execution, check `public/` for logo assets. If absent, use text-only header ("W CHAPUT STUDIO") until logo is provided.

2. **Terms and conditions text (QUOT-02)**
   - What we know: The spec says the PDF includes "terms and conditions."
   - What's unclear: The exact text has not been specified in REQUIREMENTS.md.
   - Recommendation: Use a placeholder constant in `lib/pdf/pdf-content.ts` that can be updated without touching the template.

3. **Orden de Compra — how to surface per-supplier download buttons**
   - What we know: A project can have line items from multiple suppliers.
   - What's unclear: Should the UI show one OC button per supplier that has line items on this project, or a single OC that covers all suppliers?
   - Recommendation: REQUIREMENTS.md (OC-01) says "for a specific supplier on a specific project" — one button per supplier that has line items. Filter to suppliers actually present in `lineItems`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.18 |
| Config file | `vitest.config.ts` (exists at project root) |
| Quick run command | `npx vitest run lib/pdf` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| QUOT-01 | Route handler returns 200 with Content-Type: application/pdf | manual | Browser/curl test | ❌ Wave 0 |
| QUOT-02 | Template receives correct data shape (logo, client info, totals, payment schedule) | unit | `npx vitest run lib/pdf/CotizacionTemplate.test` | ❌ Wave 0 |
| QUOT-03 | `getProjectForQuote()` mapped type has no costo/margen fields | unit | TypeScript compile check (tsc --noEmit) | ❌ (tsc exists) |
| QUOT-04 | Editorial styles defined correctly in StyleSheet | unit | `npx vitest run lib/pdf/pdf-styles.test` | ❌ Wave 0 |
| QUOT-05 | Download link renders in project detail page | manual | Visual check on page load | — |
| OC-01 | Route handler returns PDF with supplier-filtered line items | manual | Browser/curl test | — |
| OC-02 | OrdenCompraTemplate receives correct supplier data shape | unit | `npx vitest run lib/pdf/OrdenCompraTemplate.test` | ❌ Wave 0 |
| OC-03 | Non-admin request returns 403 | unit | `npx vitest run app/.../orden-compra/route.test` | ❌ Wave 0 |

> Note: react-pdf template rendering tests verify data shape and prop types, not pixel-perfect PDF output. PDF visual output must be verified manually in browser.

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `lib/pdf/CotizacionTemplate.test.ts` — covers QUOT-02 data shape
- [ ] `lib/pdf/OrdenCompraTemplate.test.ts` — covers OC-02 data shape
- [ ] No framework install needed — Vitest already configured

---

## Sources

### Primary (HIGH confidence)
- `react-pdf.org/node` — Official server-side rendering API (`renderToStream`, `renderToFile`, `renderToString`)
- `react-pdf.org/styling` — StyleSheet API, supported CSS properties, flexbox layout
- `react-pdf.org/fonts` — Font registration, built-in fonts (Helvetica), TTF/WOFF only
- `react-pdf.org/compatibility` — Next.js 14.1.1+ required; React 19 supported since v4.1.0; Node.js 18/20/21 tested
- `nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages` — `@react-pdf/renderer` is in Next.js auto-approved list (no config needed)

### Secondary (MEDIUM confidence)
- [GitHub issue #3074](https://github.com/diegomura/react-pdf/issues/3074) — "upgrading to react 19 resolved the issue" — multiple confirmations
- [GitHub issue #2994](https://github.com/diegomura/react-pdf/issues/2994) — Root cause: React version mismatch in monorepos
- [GitHub issue #2350](https://github.com/diegomura/react-pdf/issues/2350) — `stream as unknown as ReadableStream` cast pattern, confirmed working

### Tertiary (LOW confidence)
- Community reports via WebSearch — `renderToStream` + `new Response(stream as unknown as ReadableStream)` pattern; not in official docs but confirmed by multiple issue threads

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `@react-pdf/renderer` is the pre-existing decision and is in Next.js auto-approved list
- Architecture: HIGH — Route handler pattern consistent with existing codebase; React 19 resolves compatibility issue
- Pitfalls: HIGH — Font path and React version issues confirmed via official compatibility docs and multiple verified issue threads
- Data safety (QUOT-03): HIGH — Enforced via TypeScript type at data boundary, not template logic

**Research date:** 2026-03-04
**Valid until:** 2026-06-04 (stable library; Next.js auto-approved list is stable)
