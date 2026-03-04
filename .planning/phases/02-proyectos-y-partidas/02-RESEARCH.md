# Phase 2: Proyectos y Partidas - Research

**Researched:** 2026-03-04
**Domain:** Next.js 15 App Router + Supabase + React Hook Form + Zod — project CRUD with 6-stage status pipeline, line-item management with auto-calculated margins/totals, MXN currency formatting, Spanish UI
**Confidence:** HIGH (stack is the same as Phase 1; key patterns verified from live codebase; financial formulas are pure math)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROJ-01 | Create project with name, client, quote number, date, salesperson, estimated delivery, internal notes | Server Action + react-hook-form + zod schema; fields map directly to `public.projects` table columns already created in Phase 1 |
| PROJ-02 | 6-stage pipeline: Prospecto → Cotizado → Anticipo Recibido → En Producción → Entregado → Cerrado | DB CHECK constraint already enforces valid status values; UI pipeline buttons advance/revert status |
| PROJ-03 | User can manually advance or revert project status | Server Action updates `status` column; UI renders step-indicator with forward/back buttons |
| PROJ-04 | Project list with status, client, quote number, and financial summary (total sale value, collected, owed) | Server Component fetches projects + JOIN to aggregate line_item sale totals; financial summary via computed columns |
| PROJ-05 | Project detail page: line items, payments, checklist, documents sections | Server Component with tabbed or sectioned layout; line items sub-component client-side for interactivity |
| PROJ-06 | Edit any project field at any time | Same Server Action as create, parameterized by project ID; pre-filled form |
| PROJ-07 | Dates displayed in DD/MMM/YYYY format throughout | Pure formatter function; `es-MX` locale with `Intl.DateTimeFormat` |
| PART-01 | Add line item: description, reference, dimensions, quantity, supplier (from directory), unit cost | Server Action; supplier dropdown populated from `public.suppliers`; all fields map to `public.line_items` |
| PART-02 | Margin % defaults to 50%, editable per line | `margen` column stored as NUMERIC(5,4) e.g. 0.50; UI shows as "50%" with conversion on read/write |
| PART-03 | Sale price auto-calculated: `precio_venta = costo / (1 - margen)` | Pure function in `lib/calculations.ts`; never stored, always derived |
| PART-04 | Line item total (sale) auto-calculated: `total_venta = precio_venta × cantidad` | Same calculations module |
| PART-05 | Line item total (cost) auto-calculated: `total_costo = costo × cantidad` | Same calculations module |
| PART-06 | Project totals: subtotal (sum of sale totals), IVA 16%, grand total | Pure aggregation over line items array; IVA = subtotal × 0.16; total = subtotal + IVA |
| PART-07 | Project cost and profit: total cost (sum of cost totals), gross profit (subtotal − total cost) | Same aggregation; gross profit excludes IVA (profit on sale price before tax) |
| PART-08 | Edit/delete any line item; all totals recalculate immediately | Optimistic UI or re-fetch after Server Action; `revalidatePath` triggers Server Component re-render |
| PART-09 | All currency as $#,##0.00 MXN | Pure formatter using `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })` |
| UX-01 | All UI labels, field names, status values, navigation in Spanish | Enforced by convention; field labels hardcoded in Spanish; status values defined in DB CHECK constraint |
| UX-02 | Fully responsive and usable on mobile (minimum 375px width) | Tailwind responsive prefixes (`sm:`, `md:`); stacked layout on mobile, side-by-side on desktop |
| UX-05 | Every financial calculation formula-driven — no hardcoded values anywhere | All formulas in `lib/calculations.ts` as pure functions; IVA rate = constant (0.16), default margin = constant (0.50) |
</phase_requirements>

---

## Summary

Phase 2 is the core data entry and calculation layer. Every other phase in the app depends on projects and line items existing with correct financials. The work divides naturally into three concerns: (1) pure calculation/formatting functions that must be correct and testable in isolation, (2) project CRUD with the 6-stage pipeline, and (3) the line-item table on the project detail page where real-time recalculation happens.

The stack is identical to Phase 1 — no new packages are required for the core functionality. Supabase Server Actions handle all writes, Server Components handle all reads. The only architectural decision to make is how "immediate" the totals recalculation feels: fully server-round-trip (simplest, correct, ~200ms delay visible) vs. optimistic client-side calculation with server confirmation (snappier UX, slightly more complex). Given this is an internal tool used by 2 people on desktop/mobile, the server-round-trip approach is recommended — use `revalidatePath` after each line item mutation, which re-runs the Server Component and recalculates all displayed totals from the database.

The margin formula `precio_venta = costo / (1 - margen)` is non-obvious and must be implemented exactly. A margin of 50% means the sale price is double the cost (`costo / 0.5 = costo × 2`), NOT a simple 50% markup (`costo × 1.5`). This difference is significant: a $100 item with 50% margin sells for $200 (not $150). This formula is locked in PART-03 and must be used consistently in `lib/calculations.ts`, in any validation, and in any display of derived prices.

**Primary recommendation:** Build in the order specified by the roadmap plans — calculations/formatters first (02-01), then project list/create/edit (02-02), then project detail with line items (02-03). The calculations module has zero dependencies and can be written and mentally verified before any UI is built.

---

## Standard Stack

### Core (same as Phase 1 — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.2.9 (installed) | App Router: Server Components + Server Actions | Handles project list (Server Component) + mutations (Server Actions) without extra API routes |
| `@supabase/ssr` | 0.6.1 (installed) | Supabase client for Server Components and Actions | Same pattern as Phase 1; `createClient()` from `lib/supabase/server.ts` |
| `react-hook-form` | 7.54.2 (installed) | Create/edit project form; create/edit line item form | Uncontrolled, minimal re-renders, Zod resolver |
| `zod` | 3.24.2 (installed) | Form validation schemas | Enforces required fields, number ranges, date formats |
| `@hookform/resolvers` | 3.10.0 (installed) | Zod + react-hook-form bridge | Required for `zodResolver` |
| Tailwind CSS | 4.x (installed) | Utility classes for responsive layout | `sm:` / `md:` breakpoints for UX-02 |
| Shadcn/ui components | Installed via CLI | Form, Input, Select, Table, Badge, Dialog | All in repo already; add missing ones as needed |
| `lucide-react` | 0.478.0 (installed) | Icons (edit, delete, plus, chevrons for pipeline) | Consistent with existing sidebar icons |

### Additional Shadcn Components to Add

| Component | Purpose | Install Command |
|-----------|---------|-----------------|
| `select` | Supplier dropdown in line item form | `npx shadcn@latest add select` |
| `table` | Project list, line items table | `npx shadcn@latest add table` |
| `badge` | Pipeline status display | `npx shadcn@latest add badge` |
| `dialog` | Line item create/edit modal | `npx shadcn@latest add dialog` |
| `separator` | Section dividers on project detail | `npx shadcn@latest add separator` |
| `textarea` | Internal notes field | `npx shadcn@latest add textarea` |
| `toast` / `sonner` | Success/error feedback after mutations | `npx shadcn@latest add sonner` |

**Note:** `@radix-ui/react-dialog`, `@radix-ui/react-select`, `@radix-ui/react-separator` are already in `package.json` as peer dependencies — the Shadcn components that use them just need their TSX files copied in.

### No New npm Packages Required

All functionality for Phase 2 is achievable with the installed stack. Do NOT add:
- Date picker library (use `<input type="date">` + formatter — sufficient for internal tool)
- Numeric formatting library (use `Intl.NumberFormat` natively — no library needed)
- State management library (Server Components + Server Actions eliminate client state need)
- Optimistic update library (server round-trip is acceptable for this scale)

---

## Architecture Patterns

### Recommended Project Structure (Phase 2 additions)

```
app/
└── (admin)/
    ├── proyectos/
    │   ├── page.tsx                    # Project list (Server Component)
    │   ├── nuevo/
    │   │   └── page.tsx                # Create project form (Client Component)
    │   └── [id]/
    │       ├── page.tsx                # Project detail (Server Component)
    │       └── editar/
    │           └── page.tsx            # Edit project form (Client Component)

lib/
├── calculations.ts                     # Pure financial formula functions (NEW)
├── formatters.ts                       # MXN currency + date formatters (NEW)
├── actions/
│   ├── auth.ts                         # Existing
│   ├── projects.ts                     # Server Actions: createProject, updateProject, updateProjectStatus (NEW)
│   └── line-items.ts                   # Server Actions: createLineItem, updateLineItem, deleteLineItem (NEW)
└── queries/
    ├── projects.ts                     # Query helpers: getProjects, getProjectById, getProjectWithLineItems (NEW)
    └── suppliers.ts                    # Query helper: getSuppliers (for dropdown) (NEW)

components/
├── ui/                                 # Shadcn/ui (existing + newly added)
├── layout/                             # Existing
└── projects/
    ├── ProjectForm.tsx                 # Create/edit project form (Client Component)
    ├── ProjectStatusPipeline.tsx       # 6-stage pipeline stepper (Client Component)
    ├── LineItemTable.tsx               # Editable line items with totals (Client Component)
    ├── LineItemForm.tsx                # Create/edit line item modal form (Client Component)
    └── ProjectFinancialSummary.tsx     # Subtotal, IVA, grand total, cost, profit (Server or Client)
```

### Pattern 1: Pure Calculation Functions in lib/calculations.ts

**What:** All financial formulas as pure TypeScript functions. No side effects. No Supabase calls. Takes numbers, returns numbers. Testable in isolation.

**When to use:** Always — every calculation in the UI calls these functions. Never inline math anywhere in a component.

```typescript
// lib/calculations.ts

/** Sale price per unit from cost and margin (decimal, e.g. 0.50 for 50%) */
export function calcPrecioVenta(costo: number, margen: number): number {
  if (margen >= 1) throw new Error('Margen must be < 1 (e.g. 0.50 for 50%)')
  return costo / (1 - margen)
}

/** Total sale value for one line item */
export function calcTotalVenta(precioVenta: number, cantidad: number): number {
  return precioVenta * cantidad
}

/** Total cost value for one line item */
export function calcTotalCosto(costoProveedor: number, cantidad: number): number {
  return costoProveedor * cantidad
}

/** Subtotal of project (sum of all line item sale totals) */
export function calcSubtotal(lineItems: Array<{ costo_proveedor: number; margen: number; cantidad: number }>): number {
  return lineItems.reduce((sum, item) => {
    const precioVenta = calcPrecioVenta(item.costo_proveedor, item.margen)
    return sum + calcTotalVenta(precioVenta, item.cantidad)
  }, 0)
}

/** IVA at 16% of subtotal */
export const IVA_RATE = 0.16  // Named constant — never inline 0.16 in components

export function calcIVA(subtotal: number): number {
  return subtotal * IVA_RATE
}

/** Grand total: subtotal + IVA */
export function calcTotal(subtotal: number): number {
  return subtotal + calcIVA(subtotal)
}

/** Total cost across all line items */
export function calcTotalCostoProyecto(lineItems: Array<{ costo_proveedor: number; cantidad: number }>): number {
  return lineItems.reduce((sum, item) => sum + calcTotalCosto(item.costo_proveedor, item.cantidad), 0)
}

/** Gross profit: subtotal (sale) minus total cost — excludes IVA */
export function calcUtilidad(subtotal: number, totalCosto: number): number {
  return subtotal - totalCosto
}

/** Default margin: 50% */
export const DEFAULT_MARGEN = 0.50
```

**Critical formula note:** `precio_venta = costo / (1 - margen)` means:
- 50% margin on $100 cost → $100 / (1 - 0.50) = $100 / 0.50 = **$200**
- NOT $100 × 1.50 = $150 (that would be 33% margin, not 50%)
- This is the "gross margin" formula (profit/sale price), not markup formula (profit/cost)

### Pattern 2: Formatting in lib/formatters.ts

**What:** Pure functions for MXN currency and DD/MMM/YYYY date formatting. Use `Intl` APIs — no library needed.

```typescript
// lib/formatters.ts

/**
 * Formats a number as MXN currency: $1,234.56
 * PART-09: All currency as $#,##0.00 MXN
 */
export function formatMXN(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
  // Output: "$1,234.56" — note: es-MX uses $ symbol, comma thousand sep, period decimal
}

/**
 * Formats an ISO date string (YYYY-MM-DD) as DD/MMM/YYYY in Spanish
 * PROJ-07: Dates displayed in DD/MMM/YYYY format throughout
 * Examples: "04/mar/2026", "15/dic/2025"
 */
export function formatFecha(isoDate: string | null | undefined): string {
  if (!isoDate) return '—'
  // Parse as UTC to avoid timezone shift (date-only strings are UTC midnight)
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date).replace(/ de /g, '/')
  // Intl output: "04 de mar. de 2026" → after replace: "04/mar./2026"
  // Additional cleanup may be needed; verify output and adjust regex
}

/**
 * Converts stored margin decimal to display percentage
 * 0.50 → "50", 0.35 → "35"
 */
export function margenToPercent(margen: number): string {
  return (margen * 100).toFixed(0)
}

/**
 * Converts user-entered percentage string to stored decimal
 * "50" → 0.50, "35" → 0.35
 */
export function percentToMargen(percent: string): number {
  return parseFloat(percent) / 100
}
```

**Date formatting pitfall:** JavaScript `new Date('2026-03-04')` parses ISO date-only strings as **UTC midnight**. Displaying with `toLocaleDateString()` without specifying `timeZone: 'UTC'` will show the previous day in UTC-5 or UTC-6 timezones (Mexico City is UTC-6). Always use `timeZone: 'UTC'` when formatting date-only strings.

### Pattern 3: Server Actions for Project Mutations

**What:** `'use server'` actions in `lib/actions/projects.ts` handle create, update, status change. Use `revalidatePath` to trigger Server Component re-render.

```typescript
// lib/actions/projects.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const projectSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  cliente_nombre: z.string().min(1, 'El cliente es requerido'),
  numero_cotizacion: z.string().optional(),
  fecha_cotizacion: z.string().optional(),          // ISO date from <input type="date">
  salesperson: z.string().optional(),
  fecha_entrega_estimada: z.string().optional(),    // ISO date from <input type="date">
  notas: z.string().optional(),
})

export async function createProjectAction(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()

  const parsed = projectSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const { error } = await supabase.from('projects').insert(parsed.data)
  if (error) return { error: error.message }

  revalidatePath('/proyectos')
  redirect('/proyectos')
}

export async function updateProjectStatusAction(
  projectId: string,
  newStatus: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', projectId)

  if (error) return { error: error.message }
  revalidatePath(`/proyectos/${projectId}`)
  return {}
}
```

### Pattern 4: Server Component for Project List with Financial Summary

**What:** The project list (PROJ-04) shows a financial summary per project — total sale value and collected amounts. These are aggregated via Supabase queries, not computed client-side.

```typescript
// app/(admin)/proyectos/page.tsx
import { createClient } from '@/lib/supabase/server'
import { formatMXN } from '@/lib/formatters'

export default async function ProyectosPage() {
  const supabase = await createClient()

  // Fetch projects — financial summary computed from line_items JOIN
  // The subtotal is calculated in TypeScript after fetching (not in SQL)
  // because the pricing formula requires application-level computation
  const { data: projects } = await supabase
    .from('projects')
    .select(`
      id,
      nombre,
      cliente_nombre,
      numero_cotizacion,
      fecha_cotizacion,
      status,
      line_items (
        costo_proveedor,
        margen,
        cantidad
      )
    `)
    .order('created_at', { ascending: false })

  // Compute subtotals in TypeScript (avoids SQL expression complexity)
  // ...
}
```

**Alternative — SQL computed totals:** Supabase supports computed columns or views. For Phase 2, computing in TypeScript after fetch is simpler and avoids a complex SQL expression for the margin formula. Phase 6 (dashboard aggregations) may warrant a DB view.

### Pattern 5: Line Item Table with Server Action Delete

**What:** Line item table is a Client Component that shows computed values. Mutations go through Server Actions. After each mutation, `revalidatePath` causes the parent Server Component to re-fetch and re-render with updated totals.

```typescript
// components/projects/LineItemTable.tsx
'use client'
import { deleteLineItemAction } from '@/lib/actions/line-items'
import { calcPrecioVenta, calcTotalVenta, calcTotalCosto } from '@/lib/calculations'
import { formatMXN } from '@/lib/formatters'
import type { LineItem, Supplier } from '@/lib/types'

interface LineItemTableProps {
  lineItems: LineItem[]
  suppliers: Supplier[]
  projectId: string
}

export function LineItemTable({ lineItems, suppliers, projectId }: LineItemTableProps) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="pb-2">Descripción</th>
          <th className="pb-2">Qty</th>
          <th className="pb-2">Costo Unit.</th>
          <th className="pb-2">Margen</th>
          <th className="pb-2">Precio Venta</th>
          <th className="pb-2 text-right">Total Venta</th>
          <th className="pb-2"></th>
        </tr>
      </thead>
      <tbody>
        {lineItems.map((item) => {
          const precioVenta = calcPrecioVenta(item.costo_proveedor, item.margen)
          const totalVenta = calcTotalVenta(precioVenta, item.cantidad)
          return (
            <tr key={item.id} className="border-b">
              <td className="py-2">{item.descripcion}</td>
              <td className="py-2">{item.cantidad}</td>
              <td className="py-2">{formatMXN(item.costo_proveedor)}</td>
              <td className="py-2">{(item.margen * 100).toFixed(0)}%</td>
              <td className="py-2">{formatMXN(precioVenta)}</td>
              <td className="py-2 text-right">{formatMXN(totalVenta)}</td>
              <td className="py-2">
                <form action={deleteLineItemAction.bind(null, item.id, projectId)}>
                  <button type="submit" className="text-destructive text-xs">Eliminar</button>
                </form>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
```

### Pattern 6: Pipeline Status Stepper

**What:** The 6-stage pipeline is displayed as a horizontal stepper. Advance and revert buttons call a Server Action. The current status is highlighted.

```typescript
// components/projects/ProjectStatusPipeline.tsx
'use client'
import { updateProjectStatusAction } from '@/lib/actions/projects'

const PIPELINE_STAGES = [
  'Prospecto',
  'Cotizado',
  'Anticipo Recibido',
  'En Producción',
  'Entregado',
  'Cerrado',
] as const

type ProjectStatus = typeof PIPELINE_STAGES[number]

interface ProjectStatusPipelineProps {
  projectId: string
  currentStatus: ProjectStatus
}

export function ProjectStatusPipeline({ projectId, currentStatus }: ProjectStatusPipelineProps) {
  const currentIndex = PIPELINE_STAGES.indexOf(currentStatus)

  async function advance() {
    const next = PIPELINE_STAGES[currentIndex + 1]
    if (next) await updateProjectStatusAction(projectId, next)
  }

  async function revert() {
    const prev = PIPELINE_STAGES[currentIndex - 1]
    if (prev) await updateProjectStatusAction(projectId, prev)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 flex-wrap">
        {PIPELINE_STAGES.map((stage, i) => (
          <div
            key={stage}
            className={[
              'px-3 py-1 rounded-full text-xs font-medium',
              i < currentIndex && 'bg-muted text-muted-foreground',
              i === currentIndex && 'bg-primary text-primary-foreground',
              i > currentIndex && 'bg-muted/40 text-muted-foreground/40',
            ].filter(Boolean).join(' ')}
          >
            {stage}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {currentIndex > 0 && (
          <form action={revert}>
            <button type="submit" className="text-sm text-muted-foreground underline">
              Retroceder
            </button>
          </form>
        )}
        {currentIndex < PIPELINE_STAGES.length - 1 && (
          <form action={advance}>
            <button type="submit" className="text-sm font-medium">
              Avanzar a {PIPELINE_STAGES[currentIndex + 1]}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
```

### Anti-Patterns to Avoid

- **Inlining 0.16 for IVA:** Define `IVA_RATE = 0.16` as a named constant in `calculations.ts`. Searching for `0.16` in code must yield exactly one result. This enforces UX-05 (no hardcoded values).
- **Calculating price in SQL:** The formula `costo / (1 - margen)` is possible in Postgres but fragile. Compute in TypeScript where it's testable and refactorable.
- **Storing computed columns:** `precio_venta`, `total_venta`, `total_costo`, `subtotal`, `iva`, `total` are never stored in the DB. They are always derived from `costo_proveedor`, `margen`, and `cantidad`. Storing them causes drift when a line item is edited.
- **Client-side Supabase for mutations:** All writes must go through Server Actions. Never call `supabase.from('projects').insert()` from a Client Component directly — this bypasses server-side validation.
- **Using `FLOAT` for margin display:** The stored value is `NUMERIC(5,4)` e.g. `0.5000`. Display as integer percent (`50%`). The `percentToMargen` / `margenToPercent` pair handles conversion.
- **`new Date(isoDate)` without timezone for display:** Use `new Date(Date.UTC(year, month-1, day))` or pass `timeZone: 'UTC'` to avoid off-by-one day errors in MX timezone.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form state and validation | Custom `useState` for each field | `react-hook-form` + `zod` (already installed) | Handles validation, dirty state, submission, error display — ~100 LOC saved |
| Currency formatting | Custom string manipulation | `Intl.NumberFormat('es-MX', { style: 'currency' })` | Handles thousands separator, decimal place, MX locale — no library needed |
| Date formatting | Custom date parsing | `Intl.DateTimeFormat('es-MX')` | Built-in; handles Spanish month abbreviations |
| Select/dropdown for supplier | Custom `<select>` styling | Shadcn `<Select>` (Radix-based, already peer-dep installed) | Accessible, keyboard navigable, matches design system |
| Modal for line item form | Custom modal state | Shadcn `<Dialog>` (Radix-based, already peer-dep installed) | Focus trap, escape key, accessible |
| Success/error toast | Custom notification state | Shadcn `sonner` toast | Zero-effort ephemeral feedback after Server Action |
| Data table | Custom `<table>` + sorting | Plain `<table>` with Tailwind (Shadcn Table primitive) | No sorting needed in Phase 2; keep it simple; avoid TanStack Table overhead |

**Key insight:** The installed stack (react-hook-form + zod + Shadcn) eliminates the need for any custom form, modal, or notification infrastructure. The Radix primitives already in `package.json` just need their TSX wrapper files copied in via `npx shadcn@latest add`.

---

## Common Pitfalls

### Pitfall 1: Wrong Margin Formula — Markup vs. Gross Margin
**What goes wrong:** Implementing `precio_venta = costo * (1 + margen)` (markup) instead of `costo / (1 - margen)` (gross margin). For a 50% margin: markup gives $150, gross margin gives $200. The app shows consistently wrong prices that partners will notice immediately when checking financials.
**Why it happens:** "50% margin" is ambiguous in common usage; many developers default to the markup interpretation.
**How to avoid:** The formula is explicitly specified in PART-03: `precio_venta = costo / (1 - margen)`. Write a test for this: `calcPrecioVenta(100, 0.50)` must equal `200`, not `150`.
**Warning signs:** A $100 item with 50% margin shows as $150 (not $200) in the UI.

### Pitfall 2: Off-By-One Day in Date Display
**What goes wrong:** `new Date('2026-03-04')` creates a UTC midnight date. Displaying it with `toLocaleDateString()` in the `America/Mexico_City` timezone (UTC-6) yields March 3, not March 4.
**Why it happens:** JavaScript parses ISO date-only strings (no time component) as UTC midnight. Timezone conversion subtracts 6 hours, moving it to the previous day.
**How to avoid:** Use `new Date(Date.UTC(year, month-1, day))` from the split ISO string, and pass `timeZone: 'UTC'` to `Intl.DateTimeFormat`. Alternatively, append `T12:00:00` to the string before parsing.
**Warning signs:** Dates in the UI are consistently one day behind the stored value.

### Pitfall 3: Stale Totals After Line Item Mutation
**What goes wrong:** After adding, editing, or deleting a line item, the financial summary (subtotal, IVA, grand total) still shows the old values.
**Why it happens:** Forgetting `revalidatePath('/proyectos/[id]')` in the Server Action after a line item mutation. The Server Component caches its render and doesn't re-fetch.
**How to avoid:** Every Server Action that mutates `line_items` must call `revalidatePath` with the full project detail path, including the dynamic segment.
**Warning signs:** Totals don't update until the page is manually refreshed.

### Pitfall 4: Margin Stored as Integer vs. Decimal
**What goes wrong:** The user enters "50" (meaning 50%) in the UI, and this value is stored as `50` in the database instead of `0.50`. `calcPrecioVenta(100, 50)` computes `100 / (1 - 50) = 100 / (-49) = -2.04`.
**Why it happens:** Forgetting the `percentToMargen` conversion before writing to the DB.
**How to avoid:** Always convert user input "50" → `parseFloat("50") / 100` = `0.50` before any insert/update. Add a Zod `transform` to handle this automatically.
**Warning signs:** Sale prices are negative or astronomically large.

### Pitfall 5: Line Items Not Filtered by Project on Detail Page
**What goes wrong:** The project detail page shows all line items from all projects, not just the current project's items.
**Why it happens:** Missing `.eq('project_id', projectId)` in the Supabase query.
**How to avoid:** Always filter: `supabase.from('line_items').select('*').eq('project_id', id)`. The DB schema does not enforce this at the query level — it's an application responsibility.

### Pitfall 6: Financial Summary Shows Gross Total Including IVA in Profit Calc
**What goes wrong:** Calculating gross profit as `grand_total - total_cost` (which includes IVA in the profit figure) instead of `subtotal - total_cost`.
**Why it happens:** Confusion about whether profit is pre-tax or post-tax. PART-07 specifies `gross profit = subtotal − total cost`, meaning IVA is excluded from the profit calculation.
**How to avoid:** Use `calcUtilidad(subtotal, totalCosto)` — not `calcUtilidad(grandTotal, totalCosto)`. IVA is a tax collected on behalf of the government, not revenue for the business.
**Warning signs:** Profit figures are higher than expected by 16%.

### Pitfall 7: Server Action bind() Misuse for IDs
**What goes wrong:** Using `.bind(null, id)` to pass a project or line item ID to a Server Action inside a form works — but TypeScript doesn't validate the bound argument type at compile time.
**Why it happens:** `bind()` is typed as `any` in TypeScript's standard lib.
**How to avoid:** For forms with IDs to pass, prefer hidden inputs (`<input type="hidden" name="id" value={id} />`) which are visible and type-safe with `formData.get('id')`, or use dedicated Server Action functions per entity.

---

## Code Examples

### Financial Calculations (verified math)

```typescript
// lib/calculations.ts — verified formulas
// PART-03: precio_venta = costo / (1 - margen)
calcPrecioVenta(100, 0.50) // → 200.00  (NOT 150)
calcPrecioVenta(100, 0.35) // → 153.85
calcPrecioVenta(100, 0.00) // → 100.00  (no margin = cost = sale price)

// PART-06: IVA at 16%
calcIVA(1000) // → 160.00
calcTotal(1000) // → 1160.00

// PART-07: gross profit
calcUtilidad(1000, 600) // → 400.00  (profit on sale, before IVA)
```

### MXN Formatter (verified output)

```typescript
// lib/formatters.ts
formatMXN(1234.56)   // → "$1,234.56"
formatMXN(0)         // → "$0.00"
formatMXN(145000)    // → "$145,000.00"
```

### Server Action with Zod + Margin Conversion

```typescript
// lib/actions/line-items.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { DEFAULT_MARGEN } from '@/lib/calculations'

const lineItemSchema = z.object({
  project_id: z.string().uuid(),
  descripcion: z.string().min(1, 'La descripción es requerida'),
  referencia: z.string().optional(),
  dimensiones: z.string().optional(),
  cantidad: z.coerce.number().int().positive('La cantidad debe ser mayor a 0'),
  proveedor_id: z.string().uuid().optional().nullable(),
  costo_proveedor: z.coerce.number().nonnegative('El costo no puede ser negativo'),
  // User enters "50" for 50% — transform to 0.50 for storage
  margen: z.coerce.number().min(0).max(99).transform(v => v / 100).default(DEFAULT_MARGEN * 100),
})

export async function createLineItemAction(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()

  const parsed = lineItemSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const { error } = await supabase.from('line_items').insert(parsed.data)
  if (error) return { error: error.message }

  revalidatePath(`/proyectos/${parsed.data.project_id}`)
  return {}
}

export async function deleteLineItemAction(
  lineItemId: string,
  projectId: string
): Promise<void> {
  const supabase = await createClient()
  await supabase.from('line_items').delete().eq('id', lineItemId)
  revalidatePath(`/proyectos/${projectId}`)
}
```

### Date Formatter (safe for Mexico City timezone)

```typescript
// lib/formatters.ts
export function formatFecha(isoDate: string | null | undefined): string {
  if (!isoDate) return '—'
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  // es-MX short month: "ene", "feb", "mar" ... "dic"
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
  // Sample output: "4 de mar. de 2026"
  // Post-process to DD/MMM/YYYY: "04/mar/2026" if needed
}
```

### Supabase Query for Project Detail with Line Items

```typescript
// lib/queries/projects.ts
import { createClient } from '@/lib/supabase/server'

export async function getProjectWithLineItems(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      line_items (
        id,
        descripcion,
        referencia,
        dimensiones,
        cantidad,
        costo_proveedor,
        margen,
        proveedor_id,
        created_at,
        suppliers (
          id,
          nombre
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| API Routes for mutations | Server Actions (`'use server'`) | Next.js 13.4+ stable | No separate endpoint; action colocated with form; handles redirect and revalidation |
| Client-side fetch for data | Server Components | Next.js 13+ | No useEffect, no loading state; data fetched on server at render time |
| useState for form | `react-hook-form` | Ecosystem standard | Uncontrolled, no re-renders per keystroke |
| Manual `fetch()` for Supabase | Supabase JS SDK + RLS | Always | Type-safe, RLS enforced automatically at DB level |
| Storing computed prices in DB | Derive from source data at read time | Best practice for financial apps | Eliminates data drift; single source of truth is `costo_proveedor` + `margen` + `cantidad` |

**Deprecated/outdated for this project:**
- `getServerSideProps`: Not available in App Router. Use Server Components.
- `useEffect` + `useState` for data fetching: Replaced by Server Components.
- `pages/api/` routes for mutations: Replaced by Server Actions.

---

## Open Questions

1. **Project list financial summary — query strategy**
   - What we know: The subtotal requires `costo / (1 - margen) * cantidad` per line item — a formula that can be computed in SQL (Postgres supports it) or in TypeScript after fetching.
   - What's unclear: Whether Supabase's `select()` with nested relations will be more efficient than a custom RPC function for the project list view with many projects.
   - Recommendation: For Phase 2, fetch projects with nested `line_items` and compute totals in TypeScript. If performance becomes an issue in Phase 6 (dashboard with aggregates), add a Postgres view. Do not over-engineer now.

2. **Line item edit UX — modal vs. inline editing**
   - What we know: Both approaches work with Server Actions. Modal (Dialog) is more explicit and avoids accidental edits. Inline editing gives faster flow but requires managing edit state per row.
   - What's unclear: User preference — which feels more natural on mobile (375px).
   - Recommendation: Use a modal (Shadcn Dialog) for line item create and edit. Simpler state management, clear intent, works well on mobile. The roadmap explicitly calls out Dialog components.

3. **`updated_at` timestamp — manual update or DB trigger**
   - What we know: The `projects` table has an `updated_at` column. The current schema does not have an auto-update trigger on it.
   - What's unclear: Whether to add a Postgres trigger (`BEFORE UPDATE SET updated_at = NOW()`) or manually set it in each Server Action.
   - Recommendation: Add a migration in Phase 2 with `CREATE OR REPLACE FUNCTION update_updated_at()` trigger on the `projects` table. This is a 4-line migration and prevents forgetting to set `updated_at` in every Server Action.

---

## Validation Architecture

`workflow.nyquist_validation` is absent from `config.json` — treating as enabled.

### Test Framework

No test framework is currently installed in the project. The calculations module (`lib/calculations.ts`) and formatters (`lib/formatters.ts`) are pure functions ideal for unit tests. The simplest addition is Vitest, which works natively with Next.js 15 and TypeScript without additional configuration.

| Property | Value |
|----------|-------|
| Framework | Vitest (not yet installed) |
| Config file | `vitest.config.ts` — see Wave 0 |
| Quick run command | `npx vitest run --reporter=verbose lib/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PART-03 | `calcPrecioVenta(100, 0.50)` === 200 | unit | `npx vitest run lib/calculations.test.ts` | ❌ Wave 0 |
| PART-04 | `calcTotalVenta(200, 3)` === 600 | unit | `npx vitest run lib/calculations.test.ts` | ❌ Wave 0 |
| PART-05 | `calcTotalCosto(100, 3)` === 300 | unit | `npx vitest run lib/calculations.test.ts` | ❌ Wave 0 |
| PART-06 | `calcIVA(1000)` === 160; `calcTotal(1000)` === 1160 | unit | `npx vitest run lib/calculations.test.ts` | ❌ Wave 0 |
| PART-07 | `calcUtilidad(1000, 600)` === 400 | unit | `npx vitest run lib/calculations.test.ts` | ❌ Wave 0 |
| PART-09 | `formatMXN(1234.56)` === "$1,234.56" | unit | `npx vitest run lib/formatters.test.ts` | ❌ Wave 0 |
| PROJ-07 | `formatFecha('2026-03-04')` contains "04" and "mar" | unit | `npx vitest run lib/formatters.test.ts` | ❌ Wave 0 |
| UX-05 | No magic numbers in calculations.ts | static/lint | Review: grep for `0\.16` in components/ (must be 0) | manual |
| PROJ-02 | All 6 pipeline stages exist and are ordered | unit | Test `PIPELINE_STAGES` array in calculations/constants | ❌ Wave 0 |
| PROJ-01 | Create project form requires name + client | integration/manual | Submit form with empty required fields — verify error | manual |
| PROJ-03 | Advance and revert status work | integration/manual | Click advance button on project detail — verify DB update | manual |
| UX-02 | Mobile 375px layout renders | manual | DevTools responsive mode at 375px width | manual |

### Sampling Rate
- **Per task commit:** `npx vitest run lib/` (calculations + formatters only — fast)
- **Per wave merge:** `npx vitest run` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `vitest` and `@vitest/ui` must be installed: `npm install -D vitest`
- [ ] `vitest.config.ts` — config file at project root
- [ ] `lib/calculations.test.ts` — covers PART-03 through PART-07, UX-05 (pure function tests)
- [ ] `lib/formatters.test.ts` — covers PART-09, PROJ-07 (pure formatter tests)

---

## Sources

### Primary (HIGH confidence)

- Live codebase — `/supabase/migrations/20260303000001_initial_schema.sql` — `projects` and `line_items` tables confirmed; column names, types, and CHECK constraints verified directly
- Live codebase — `/lib/types.ts` — TypeScript interfaces for `Project`, `LineItem`, `Supplier` confirmed
- Live codebase — `/package.json` — all installed packages and versions confirmed (react-hook-form 7.54.2, zod 3.24.2, @supabase/ssr 0.6.1, Next.js 15.2.9)
- MDN Web Docs — `Intl.NumberFormat` with `es-MX` locale and `currency: 'MXN'` — standard browser API, no library needed
- MDN Web Docs — `Intl.DateTimeFormat` with `es-MX` locale — Spanish month abbreviations confirmed
- Phase 1 RESEARCH.md — architecture patterns (Server Actions, revalidatePath, createClient pattern) all verified and locked in

### Secondary (MEDIUM confidence)

- REQUIREMENTS.md — PART-03 formula `precio_venta = costo / (1 - margen)` is authoritative source for the margin calculation
- Next.js docs — `revalidatePath` API for cache invalidation after Server Action mutations
- Supabase docs — nested select with foreign key relationships (the `select('*, line_items(*)')` pattern)

### Tertiary (LOW confidence)

- None — all critical claims verified against primary sources

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages confirmed installed in package.json; no new packages needed
- Financial formulas: HIGH — formula specified verbatim in REQUIREMENTS.md PART-03; math verified
- Architecture patterns: HIGH — same patterns established and working in Phase 1; codebase confirmed
- Pitfalls: HIGH — timezone issue is a documented JavaScript behavior; all others derived from schema + formula analysis
- Test framework (Vitest): MEDIUM — Vitest works with Next.js 15 + TypeScript; no version conflict expected with installed deps; not yet installed so exact config unverified

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (30 days — stack is stable; Supabase and Next.js APIs unlikely to change at this scale)
