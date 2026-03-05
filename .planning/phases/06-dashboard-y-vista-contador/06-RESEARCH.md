# Phase 6: Dashboard y Vista Contador - Research

**Researched:** 2026-03-04
**Domain:** Next.js 15 / React 19 dashboard aggregation, Recharts, Supabase RLS views, role-based read-only UI
**Confidence:** HIGH

---

## Summary

Phase 6 is the final phase. It aggregates data already persisted by Phases 1-5 into two distinct views: the admin dashboard (full financial health at a glance, including charts) and the accountant view (cash flow and payment totals, zero cost/margin exposure).

All foundational data tables exist (`projects`, `line_items`, `payments_client`, `payments_supplier`, `suppliers`). RLS is already live: accountant role has SELECT on `projects`, `payments_client`, `payments_supplier`, and `suppliers` but has zero access to `line_items` (default-deny). This means the accountant-safe data boundary is enforced at the DB level without any additional policy work for this phase.

The main new library is Recharts for DASH-04 (monthly revenue/cost/profit bar chart) and DASH-05 (30-day cash flow projection). Recharts 2.15+ declares React 19 as a compatible peer dependency, but requires an `overrides` block in `package.json` for `react-is` to avoid version mismatch warnings. Recharts must always load as a client component via `dynamic({ ssr: false })` because it uses browser DOM APIs. All data fetching stays server-side; only the chart render wrapper is client-side.

**Primary recommendation:** Build three focused server pages (dashboard KPIs, dashboard charts, accountant views) with a single aggregated Supabase query per page. Install Recharts with the `react-is` override. The accountant `/flujo-efectivo` page is a new route in `(accountant)` group that CONT-03 requires and does not yet exist.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | Admin dashboard KPI cards: active project count, total pipeline value (non-Cerrado), total pending client payments, total pending supplier payments | Single aggregated query across `projects`, `payments_client`, `payments_supplier`, `line_items` — compute in TypeScript using existing `calcSubtotal`/`calcTotal` helpers |
| DASH-02 | Pipeline summary: count per status stage | `projects` GROUP BY status — can be done in one Supabase query with JS reduce, or a Postgres RPC function |
| DASH-03 | Supplier debt breakdown: Innovika, El Roble, Others across all active projects | Join `line_items` + `payments_supplier` grouped by `supplier_id`; match to supplier names |
| DASH-04 | Monthly revenue vs. cost vs. profit bar chart (Recharts) | Recharts `BarChart` loaded with `dynamic({ ssr: false })`; monthly data aggregated server-side from `line_items` + `projects` |
| DASH-05 | 30-day cash flow projection: confirmed incoming vs. scheduled supplier payments | Query `payments_client` and `payments_supplier` with `fecha >= TODAY AND fecha <= TODAY+30` |
| CONT-01 | Accountant: project payment summaries (name, client, grand_total, collected, outstanding) — no costs or margins | Query `projects` + `payments_client`; grand_total computed without touching `line_items` (accountant blocked by RLS) — must store or compute grand_total differently (see pitfall below) |
| CONT-02 | Accountant: supplier payment totals (owed, paid, outstanding) — based on payment records only, not line item cost columns | Query `payments_supplier` grouped by `supplier_id`; "owed" is sum of payment amounts ever expected, NOT from `line_items` — requires business decision on how "owed" is defined |
| CONT-03 | Accountant: cash flow list — all client + supplier payments with dates and amounts | Two queries: `payments_client` + `payments_supplier`, merged and sorted by date |
| CONT-04 | Accountant view is read-only — no create/edit/delete controls rendered | UI-only enforcement (DB RLS already blocks writes); no Server Actions in accountant page files |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | ^2.15.x | Bar chart, area chart for dashboard | Specified by DASH-04 requirement; most popular React chart library; SVG-based, composable |
| next/dynamic | built-in Next.js 15 | Wraps Recharts in `{ ssr: false }` | Required because Recharts uses browser DOM APIs; Next.js built-in solution |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Existing Shadcn Card | already installed | KPI card shells | Use `Card`, `CardHeader`, `CardTitle`, `CardContent` already in `components/ui/card.tsx` |
| Existing Shadcn Table | already installed | Accountant tabular views | Use `Table`, `TableRow`, etc. already in `components/ui/table.tsx` |
| Existing `calcSubtotal`/`calcTotal` | lib/calculations.ts | Compute gran_total from line items | Same pattern as `getProjects()` in `lib/queries/projects.ts` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Chart.js, Victory, Nivo | Requirements lock Recharts (DASH-04 explicitly names it) — do not substitute |
| TypeScript aggregation | Postgres aggregate functions / RPC | RPC adds migration complexity; JS aggregation is proven pattern in this codebase (see `getProjects` doing `calcSubtotal` in TS) |

**Installation:**
```bash
npm install recharts
```

Then add to `package.json` to resolve react-is version conflict with React 19:
```json
{
  "overrides": {
    "react-is": "^19.0.0"
  }
}
```

After adding the `overrides` block, run `npm install` again.

---

## Architecture Patterns

### Recommended Project Structure

New files for this phase:

```
app/
  (admin)/
    dashboard/
      page.tsx              # KPI cards + pipeline summary + supplier debt (DASH-01/02/03) — ALREADY EXISTS (stub)
  (admin)/
    dashboard/
      charts/
        page.tsx            # Charts page — OR integrate charts directly in dashboard/page.tsx
components/
  dashboard/
    KpiCard.tsx             # Reusable KPI card (number + label + sublabel)
    PipelineSummary.tsx     # Count-per-stage row (Server Component — static display)
    SupplierDebtBreakdown.tsx  # Innovika / El Roble / Others table (Server Component)
    RevenueChart.tsx        # "use client" — dynamic({ ssr: false }) wrapper for Recharts bar chart (DASH-04)
    CashFlowChart.tsx       # "use client" — Recharts for 30-day projection (DASH-05)
app/
  (accountant)/
    resumen/
      page.tsx              # Project payment summaries (CONT-01) — ALREADY EXISTS (stub)
    flujo-efectivo/
      page.tsx              # Cash flow list (CONT-03) — NEW ROUTE needed
lib/
  queries/
    dashboard.ts            # getDashboardKpis(), getPipelineSummary(), getSupplierDebt(), getMonthlyFinancials(), getCashFlowProjection()
    accountant.ts           # getAccountantProjectSummaries(), getAccountantSupplierTotals(), getAccountantCashFlow()
```

### Pattern 1: Server Page + Client Chart Wrapper

**What:** Server Component page fetches all data, passes pre-aggregated arrays as props to a `"use client"` chart wrapper that renders Recharts.

**When to use:** Every chart in this phase — Recharts cannot run on the server.

**Example:**
```typescript
// app/(admin)/dashboard/page.tsx — Server Component (no "use client")
import dynamic from 'next/dynamic'
import { getDashboardKpis, getMonthlyFinancials } from '@/lib/queries/dashboard'

const RevenueChart = dynamic(() => import('@/components/dashboard/RevenueChart'), { ssr: false })

export default async function DashboardPage() {
  const [kpis, monthlyData] = await Promise.all([
    getDashboardKpis(),
    getMonthlyFinancials(),
  ])
  return (
    <div>
      {/* KPI cards — pure Server Component, no chart lib needed */}
      <KpiCard label="Proyectos Activos" value={kpis.activeProjectCount} />
      {/* Chart — loads client-side only */}
      <RevenueChart data={monthlyData} />
    </div>
  )
}
```

```typescript
// components/dashboard/RevenueChart.tsx
'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface MonthlyDataPoint {
  mes: string         // e.g. "Ene 26"
  ingresos: number
  costos: number
  utilidad: number
}

export default function RevenueChart({ data }: { data: MonthlyDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="mes" />
        <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
        <Tooltip formatter={(v: number) => `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} />
        <Legend />
        <Bar dataKey="ingresos" name="Ingresos" fill="#111" />
        <Bar dataKey="costos" name="Costos" fill="#666" />
        <Bar dataKey="utilidad" name="Utilidad" fill="#999" />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

### Pattern 2: KPI Aggregation Query

**What:** Single Supabase call fetches all projects + related data; TypeScript reduces to KPI numbers. No raw SQL aggregation needed.

**When to use:** DASH-01 (active count, pipeline value, pending payments).

**Example:**
```typescript
// lib/queries/dashboard.ts
import { createClient } from '@/lib/supabase/server'
import { calcSubtotal, calcTotal, calcTotalPagadoCliente, calcTotalPagadoProveedor, calcTotalCostoProyecto } from '@/lib/calculations'

export async function getDashboardKpis() {
  const supabase = await createClient()

  const { data: projects } = await supabase
    .from('projects')
    .select(`
      id, status,
      line_items ( costo_proveedor, margen, cantidad ),
      payments_client ( monto ),
      payments_supplier ( monto )
    `)

  const active = (projects ?? []).filter(p => p.status !== 'Cerrado')

  let pipelineValue = 0
  let totalPendingCliente = 0
  let totalPendingProveedor = 0

  for (const p of active) {
    const subtotal = calcSubtotal(p.line_items ?? [])
    const granTotal = calcTotal(subtotal)
    const totalCosto = calcTotalCostoProyecto(p.line_items ?? [])
    const pagadoCliente = calcTotalPagadoCliente(p.payments_client ?? [])
    const pagadoProveedor = calcTotalPagadoProveedor(p.payments_supplier ?? [])

    pipelineValue += granTotal
    totalPendingCliente += (granTotal - pagadoCliente)
    totalPendingProveedor += (totalCosto - pagadoProveedor)
  }

  return {
    activeProjectCount: active.length,
    pipelineValue,
    totalPendingCliente,
    totalPendingProveedor,
  }
}
```

### Pattern 3: Accountant-Safe Query (no line_items)

**What:** Accountant queries NEVER touch `line_items`. The accountant RLS blocks it entirely. Grand total for accountant must come from `payments_client` data or a stored column — NOT from recalculating from line item costs.

**When to use:** All CONT-xx requirements.

**Critical insight:** For CONT-01, "grand total" is needed but accountant cannot access `line_items`. Two options:
1. Add a computed/stored `gran_total` column to `projects` table (updated by trigger on line_item mutations)
2. Derive "grand total" from the context of how much the client was invoiced (70% anticipo = gran_total * 0.70 → infer gran_total from first anticipo payment if recorded)

**Recommended approach:** Option 1 — add a `gran_total NUMERIC(12,2)` column to `projects` and keep it updated. This is the cleanest solution. Alternatively, the CONT-01 "grand total" shown to accountant can be fetched admin-side during project creation/update (a Supabase function or trigger keeps it in sync).

**Simpler alternative** (no migration): Only show `gran_total` to accountant when admin has fetched and stored it. Since admin can read `line_items`, admin computes it; accountant reads it from `projects`. This requires a migration to add the column.

```typescript
// lib/queries/accountant.ts
import { createClient } from '@/lib/supabase/server'
import { calcTotalPagadoCliente } from '@/lib/calculations'

export async function getAccountantProjectSummaries() {
  const supabase = await createClient()
  // Accountant can read: projects (id, nombre, cliente_nombre, status)
  // Accountant CANNOT read: line_items
  // gran_total must come from a stored column or be omitted
  const { data: projects } = await supabase
    .from('projects')
    .select(`
      id, nombre, cliente_nombre, status, gran_total,
      payments_client ( monto )
    `)
    .neq('status', 'Cerrado')
    .order('created_at', { ascending: false })

  return (projects ?? []).map(p => {
    const collected = calcTotalPagadoCliente(p.payments_client ?? [])
    const granTotal = Number(p.gran_total ?? 0)
    return {
      id: p.id,
      nombre: p.nombre,
      clienteNombre: p.cliente_nombre,
      granTotal,
      collected,
      outstanding: granTotal - collected,
    }
  })
}
```

### Pattern 4: 30-Day Cash Flow Projection (DASH-05)

**What:** Query both payment tables for records where `fecha` falls within the next 30 days. Return as merged, date-sorted array.

```typescript
export async function getCashFlowProjection() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

  const [clientRes, supplierRes] = await Promise.all([
    supabase
      .from('payments_client')
      .select('monto, fecha, tipo')
      .gte('fecha', today)
      .lte('fecha', in30)
      .order('fecha'),
    supabase
      .from('payments_supplier')
      .select('monto, fecha')
      .gte('fecha', today)
      .lte('fecha', in30)
      .order('fecha'),
  ])

  const incoming = (clientRes.data ?? []).map(p => ({
    fecha: p.fecha,
    tipo: 'entrada' as const,
    monto: Number(p.monto),
    label: p.tipo,
  }))
  const outgoing = (supplierRes.data ?? []).map(p => ({
    fecha: p.fecha,
    tipo: 'salida' as const,
    monto: Number(p.monto),
    label: 'Pago proveedor',
  }))

  return [...incoming, ...outgoing].sort((a, b) => a.fecha.localeCompare(b.fecha))
}
```

### Anti-Patterns to Avoid

- **Calling `line_items` from accountant context:** RLS will silently return empty arrays (not an error), making totals appear as zero. This is a silent data corruption bug. All accountant queries must not join `line_items`.
- **Rendering Recharts in a Server Component:** Next.js will throw at build time. Always wrap with `dynamic({ ssr: false })` and mark the component file `'use client'`.
- **Inline number literals for financial calculations:** Use `calcSubtotal`, `calcTotal`, `calcTotalPagadoCliente` from `lib/calculations.ts`. UX-05 prohibits hardcoded values.
- **Separate queries per project in a loop (N+1):** Fetch all projects with nested `line_items`, `payments_client`, `payments_supplier` in a single joined query. The existing `getSupplierWithDetails` pattern (two batch queries, no loop) is the established precedent.
- **Triggering a re-render on every Recharts prop change:** Pass stable arrays computed server-side. Do not compute data in client components.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bar chart rendering | Custom SVG bar chart | `recharts` `BarChart` | Axis scaling, responsive resize, tooltip formatting are non-trivial |
| Currency axis ticks | Custom tick formatter | Recharts `tickFormatter` prop | Built-in, composable |
| KPI card layout | Custom card component | Existing `Card` / `CardHeader` / `CardContent` from `components/ui/card.tsx` | Already in codebase, consistent style |
| Client payment sums | Manual reduce in component | `calcTotalPagadoCliente` from `lib/calculations.ts` | Established single source of truth |
| Date range filtering | Manual date arithmetic | `gte`/`lte` Supabase filter with ISO date strings | Already pattern established in payment queries |

**Key insight:** All chart data computation belongs in server-side query functions (`lib/queries/dashboard.ts`). Client components receive pre-aggregated arrays and only handle rendering.

---

## Common Pitfalls

### Pitfall 1: gran_total Not Available to Accountant

**What goes wrong:** CONT-01 requires showing "grand total" per project to the accountant. Grand total is computed from `line_items` (costo_proveedor + margen). Accountant has zero RLS access to `line_items`. If you try to compute it client-side for accountant, you get zero.

**Why it happens:** RLS default-deny on `line_items` for accountant role — intentional security design from Phase 1.

**How to avoid:** Add a `gran_total NUMERIC(12,2)` column to `projects` table via migration. Update it in the Server Action whenever a line item is created/edited/deleted (already happens in admin context where `line_items` is accessible). Accountant reads `gran_total` from `projects` directly — never touches `line_items`.

**Warning signs:** Accountant page shows $0.00 grand totals for all projects.

### Pitfall 2: Recharts Hydration Mismatch

**What goes wrong:** If Recharts is imported normally (not via `dynamic`), Next.js tries to server-render it, Recharts calls `window` or `document` during render, throws a runtime error or hydration mismatch.

**Why it happens:** Recharts is a browser-only library internally using D3 and DOM measurement APIs.

**How to avoid:** Always wrap chart components in `dynamic(() => import('@/components/dashboard/RevenueChart'), { ssr: false })`. The import statement goes in the Server Component page; the component file itself has `'use client'` at the top.

**Warning signs:** `ReferenceError: window is not defined` during `next build`, or React hydration warning in browser console.

### Pitfall 3: react-is Version Conflict With React 19

**What goes wrong:** `npm install recharts` installs `react-is@18.x` as a transitive dependency. React 19 expects `react-is@19.x`. This causes peer dependency warnings and potential runtime mismatches.

**Why it happens:** Recharts 2.x pinned `react-is` to 18 range before React 19 existed.

**How to avoid:** Add `"overrides": { "react-is": "^19.0.0" }` to `package.json` before or after installing recharts. Run `npm install` again after adding the override.

**Warning signs:** `npm warn` lines about `react-is` peer dependency during install.

### Pitfall 4: Monthly Aggregation With No Sales in a Month

**What goes wrong:** The monthly revenue chart (DASH-04) will have gaps in months with no closed projects. If months are derived only from actual data, the X-axis skips empty months and the chart looks broken.

**Why it happens:** SQL/JS GROUP BY only returns rows where data exists.

**How to avoid:** Generate a fixed 12-month or 6-month array of month labels server-side, then left-join/merge actual data into it. Months with no data get value `0`.

**Warning signs:** Bar chart X-axis jumps from "Ene" to "Mar" skipping "Feb".

### Pitfall 5: Accountant Sidebar Missing "Flujo de Efectivo" Link

**What goes wrong:** CONT-03 requires a cash flow page at `/flujo-efectivo` (accountant group). If the sidebar nav is not updated, there is no way to reach this page.

**Why it happens:** `SidebarNav.tsx` has a hardcoded `accountantNavItems` array with only `{ label: 'Resumen', href: '/resumen' }`.

**How to avoid:** Add `{ label: 'Flujo de Efectivo', href: '/flujo-efectivo' }` to `accountantNavItems` in `components/layout/SidebarNav.tsx`. Also add the route `app/(accountant)/flujo-efectivo/page.tsx`.

**Warning signs:** Accountant can only access `/resumen`, no navigation to cash flow.

### Pitfall 6: CONT-02 "Total Owed" Definition

**What goes wrong:** CONT-02 says supplier total owed is "based on payment records only, not on cost columns from line items." This means "owed" for the accountant view is NOT the line item costs total — it is the expected amount as recorded in `payments_supplier`. This is a different number from the admin supplier debt view (which uses line item costs as the ground truth).

**Why it happens:** Accountant cannot see line item costs. The only source of "owed" visible to accountant is whatever payment records exist.

**How to avoid:** For accountant, supplier "owed" = SUM of all `payments_supplier.monto` across all projects per supplier (payments already made count as owed-and-fulfilled). This is a cash accounting view. Document the distinction clearly in the UI with a label like "Pagado a proveedores" rather than "Total adeudado."

---

## Code Examples

Verified patterns from this project's existing conventions:

### Monthly Aggregation — Server Side

```typescript
// lib/queries/dashboard.ts
// Source: codebase pattern established in lib/queries/projects.ts

export async function getMonthlyFinancials() {
  const supabase = await createClient()

  // Fetch all projects with line_items for revenue/cost computation
  const { data: projects } = await supabase
    .from('projects')
    .select(`
      id, fecha_cotizacion, status,
      line_items ( costo_proveedor, margen, cantidad )
    `)
    .not('fecha_cotizacion', 'is', null)

  // Build 6-month window
  const months: { key: string; label: string }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' })
    months.push({ key, label })
  }

  const byMonth: Record<string, { ingresos: number; costos: number }> = {}
  months.forEach(m => { byMonth[m.key] = { ingresos: 0, costos: 0 } })

  for (const p of projects ?? []) {
    if (!p.fecha_cotizacion) continue
    const key = p.fecha_cotizacion.substring(0, 7)
    if (!byMonth[key]) continue
    const subtotal = calcSubtotal(p.line_items ?? [])
    const totalCosto = calcTotalCostoProyecto(p.line_items ?? [])
    byMonth[key].ingresos += subtotal
    byMonth[key].costos += totalCosto
  }

  return months.map(m => ({
    mes: m.label,
    ingresos: byMonth[m.key].ingresos,
    costos: byMonth[m.key].costos,
    utilidad: byMonth[m.key].ingresos - byMonth[m.key].costos,
  }))
}
```

### Pipeline Count — Server Side

```typescript
export async function getPipelineSummary() {
  const supabase = await createClient()
  const { data: projects } = await supabase
    .from('projects')
    .select('status')

  const counts: Record<string, number> = {}
  PIPELINE_STAGES.forEach(s => { counts[s] = 0 })
  for (const p of projects ?? []) {
    if (counts[p.status] !== undefined) counts[p.status]++
  }
  return counts
}
```

### Supplier Debt Breakdown — Server Side (DASH-03)

```typescript
export async function getSupplierDebtBreakdown() {
  const supabase = await createClient()

  // All line_items with supplier names (admin only — admin sees line_items)
  const { data: lineItems } = await supabase
    .from('line_items')
    .select(`
      costo_proveedor, cantidad, proveedor_id,
      projects ( status ),
      suppliers ( id, nombre )
    `)

  const { data: supplierPayments } = await supabase
    .from('payments_supplier')
    .select('supplier_id, monto')

  // Compute owed per supplier from line items (active projects only)
  const owedBySupplier: Record<string, { nombre: string; owed: number; paid: number }> = {}
  for (const li of lineItems ?? []) {
    const proj = Array.isArray(li.projects) ? li.projects[0] : li.projects
    if (!proj || proj.status === 'Cerrado') continue
    const supplierId = li.proveedor_id ?? 'unknown'
    const supplierRaw = Array.isArray(li.suppliers) ? li.suppliers[0] : li.suppliers
    const nombre = supplierRaw?.nombre ?? 'Sin proveedor'
    if (!owedBySupplier[supplierId]) owedBySupplier[supplierId] = { nombre, owed: 0, paid: 0 }
    owedBySupplier[supplierId].owed += Number(li.costo_proveedor) * li.cantidad
  }
  for (const pay of supplierPayments ?? []) {
    const id = pay.supplier_id ?? 'unknown'
    if (owedBySupplier[id]) owedBySupplier[id].paid += Number(pay.monto)
  }

  // Group: Innovika, El Roble, Others
  const result = { Innovika: 0, 'El Roble': 0, Otros: 0 }
  for (const [, v] of Object.entries(owedBySupplier)) {
    const outstanding = v.owed - v.paid
    if (v.nombre === 'Innovika') result.Innovika += outstanding
    else if (v.nombre === 'El Roble') result['El Roble'] += outstanding
    else result.Otros += outstanding
  }
  return result
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Recharts peer dep excluded React 19 | Recharts 2.15+ supports React 19 with `react-is` override | Late 2024 | Install works; just needs `overrides` block |
| `next/dynamic` only in Pages Router | `next/dynamic` with `ssr: false` fully supported in App Router | Next.js 13+ | Use it — no workaround needed in this project |
| Views with `SECURITY DEFINER` (bypass RLS) | Views with `security_invoker = true` (obey RLS) | Postgres 15+ | If a DB view is used for accountant data, set `security_invoker = true` |

**Deprecated/outdated:**
- `import('recharts')` without `dynamic` wrapper: throws at SSR — do not do this
- `@supabase/auth-helpers-nextjs`: already avoided in this project (Phase 1 decision: use `@supabase/ssr`)

---

## Open Questions

1. **gran_total stored vs. computed**
   - What we know: Accountant cannot touch `line_items`; CONT-01 needs grand total per project
   - What's unclear: Whether to add a `gran_total` column via migration (cleanest) or show a placeholder `—` if not computable for accountant
   - Recommendation: Add `gran_total NUMERIC(12,2)` column to `projects` via new migration; update it in all line item Server Actions (add/edit/delete) where admin context already has access to `line_items`. This is a one-time migration with targeted updates to three Server Actions.

2. **CONT-02 supplier "owed" definition**
   - What we know: Requirements say "based on payment records only, not cost columns from line items"
   - What's unclear: Does "owed" mean what has been paid (historical cash out), or what remains outstanding?
   - Recommendation: For accountant view, "owed" = total payments already made (historical cash out). Outstanding = what has been paid historically. If nothing has been paid, show zero. This is cash-basis accounting. Label columns clearly: "Total Pagado" not "Total Adeudado."

3. **DASH-04 — month grouping basis (created_at vs. fecha_cotizacion vs. payment date)**
   - What we know: Revenue is generated when client pays; cost is incurred when line items are created; both are approximations
   - What's unclear: Which date drives the monthly bar chart X-axis
   - Recommendation: Use `fecha_cotizacion` (quote date) as the project revenue month proxy, and `payments_supplier.fecha` for cost timing. This is the most business-meaningful grouping.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.x |
| Config file | `/Users/paulchaput/primer_proyecto_claudecode/vitest.config.ts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | KPI aggregation sums active projects correctly | unit | `npx vitest run lib/queries/dashboard.test.ts` | ❌ Wave 0 |
| DASH-02 | Pipeline summary returns correct count per stage | unit | `npx vitest run lib/queries/dashboard.test.ts` | ❌ Wave 0 |
| DASH-03 | Supplier debt breakdown correctly buckets Innovika/El Roble/Others | unit | `npx vitest run lib/queries/dashboard.test.ts` | ❌ Wave 0 |
| DASH-04 | Monthly aggregation fills zero for months with no data | unit | `npx vitest run lib/queries/dashboard.test.ts` | ❌ Wave 0 |
| DASH-05 | 30-day cash flow projection filter returns only within-range payments | unit | `npx vitest run lib/queries/dashboard.test.ts` | ❌ Wave 0 |
| CONT-01 | Accountant project summary computes collected/outstanding correctly | unit | `npx vitest run lib/queries/accountant.test.ts` | ❌ Wave 0 |
| CONT-02 | Accountant supplier totals use payment records not line item costs | unit | `npx vitest run lib/queries/accountant.test.ts` | ❌ Wave 0 |
| CONT-03 | Cash flow list merges and sorts client + supplier payments by date | unit | `npx vitest run lib/queries/accountant.test.ts` | ❌ Wave 0 |
| CONT-04 | Accountant pages render no mutation controls (manual verification) | manual | Review rendered HTML — no form actions, no delete buttons | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `lib/queries/dashboard.test.ts` — covers DASH-01 through DASH-05 (pure function tests with mock data)
- [ ] `lib/queries/accountant.test.ts` — covers CONT-01, CONT-02, CONT-03

Note: The query functions in `lib/queries/dashboard.ts` and `lib/queries/accountant.ts` should be structured so the pure aggregation logic (reduce/map over data arrays) is extractable for unit testing, even if the Supabase fetch itself cannot be unit tested without mocking.

---

## Sources

### Primary (HIGH confidence)
- Project codebase — `lib/calculations.ts`, `lib/queries/projects.ts`, `lib/queries/suppliers.ts`, `lib/queries/payments.ts`, `lib/types.ts`, `supabase/migrations/20260303000001_initial_schema.sql` — establishes all existing patterns, schema, and RLS state
- `components/layout/SidebarNav.tsx` — confirms accountant nav currently only has `/resumen`; `/flujo-efectivo` route must be added

### Secondary (MEDIUM confidence)
- [recharts/recharts Issue #4558](https://github.com/recharts/recharts/issues/4558) — React 19 support; `react-is` override required
- [shadcn/ui React 19 docs](https://ui.shadcn.com/docs/react-19) — confirms `overrides.react-is` pattern for npm
- [Next.js SSR/CSR Data Visualizations](https://dzone.com/articles/mastering-ssr-and-csr-in-nextjs) — confirms `dynamic({ ssr: false })` pattern for Recharts in App Router
- [Supabase RLS on Views](https://supabase.com/docs/guides/database/postgres/row-level-security) — `security_invoker = true` for views on Postgres 15+

### Tertiary (LOW confidence)
- WebSearch results on monthly aggregation patterns — general community practice, consistent with codebase conventions

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Recharts is named in requirements; all other dependencies already in codebase
- Architecture: HIGH — query patterns directly derived from existing `lib/queries/*.ts` files; proven in project
- Pitfalls: HIGH — gran_total/accountant access gap is a certain issue that must be solved; Recharts SSR is a known documented issue
- Open questions: MEDIUM — gran_total strategy and CONT-02 "owed" definition need a planner/dev decision before implementation

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable libraries; Recharts React 19 situation may improve but workaround is confirmed working)
