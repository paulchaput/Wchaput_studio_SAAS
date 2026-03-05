# Phase 4: Checklist de Produccion - Research

**Researched:** 2026-03-04
**Domain:** Next.js 15 Server Actions, Supabase RLS, React Client Components (checklist UI)
**Confidence:** HIGH

---

## Summary

Phase 4 adds a 28-task production checklist that is automatically seeded whenever a new project is created. The database table (`checklist_tasks`) and its RLS policy (`admin_all_checklist_tasks`) already exist in the Phase 1 migration — **no new migration is needed for the table itself**. What is needed is: (1) a seed mechanism triggered inside `createProjectAction`, and (2) a `ChecklistPanel` client component on the project detail page.

The seeding approach is straightforward: after the Supabase `insert` that creates a project returns its new `id`, bulk-insert the 28 fixed task rows in a single `supabase.from('checklist_tasks').insert([...])` call. The 28 task names and their phases are static — they do not come from the database, they are defined as a constant in the codebase.

The UI component mirrors the established pattern of other panels on the project detail page (`ClientPaymentPanel`, `SupplierPaymentPanel`): a `'use client'` component that receives its data as props from the Server Component page, uses `react-hook-form` + `zod` for inline editing, and calls Server Actions for mutations. No new UI libraries are needed.

**Primary recommendation:** Seed checklist tasks inside `createProjectAction` via a single bulk insert immediately after the project row is created. Build `ChecklistPanel` as a `'use client'` component receiving `ChecklistTask[]` as props. Expose status/assignee/due_date mutations as Server Actions that `revalidatePath` on the project detail page.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CHEC-01 | When a project is created, 28 checklist tasks are automatically seeded across 4 phases: Comercial (7), Diseño y Especificaciones (6), Producción (9), Entrega y Cierre (8) | Seed inside `createProjectAction` using the returned project `id`; 28 task names defined as a `CHECKLIST_TASKS` constant in `lib/checklist-tasks.ts` |
| CHEC-02 | Each task has: phase, name, assignee (text field), due date, status (Pendiente / En Proceso / Completado / Bloqueado / N/A) | Already modeled in `checklist_tasks` DB table from Phase 1 migration; `ChecklistTask` type to be added to `lib/types.ts` |
| CHEC-03 | User can update the status, assignee, and due date of any task | Server Action `updateChecklistTaskAction(taskId, patch)` + `revalidatePath`; inline editing in `ChecklistPanel` |
| CHEC-04 | Checklist displays grouped by phase with visual progress per phase | Client component groups tasks by `fase`; shows "X / Y completadas" count per group |
| CHEC-05 | Checklist is visible only to admin role (not accountant) | Role check in project detail Server Component using `get_user_role()`; RLS already blocks DB access for accountant |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.49.2 (installed) | DB queries and inserts for checklist_tasks | Already in project; the `checklist_tasks` table and RLS policy are already live |
| react-hook-form | ^7.54.2 (installed) | Inline editing of assignee / due_date fields in ChecklistPanel | Same library used in ClientPaymentPanel and SupplierPaymentPanel |
| zod | ^3.24.2 (installed) | Server Action input validation for task updates | Consistent with all existing actions in `lib/actions/` |
| lucide-react | ^0.478.0 (installed) | Icons for task status badges (CheckCircle2, Clock, AlertCircle, etc.) | Already imported in ClientPaymentPanel |

### Supporting (existing Shadcn/Radix components — already installed)

| Component | Purpose | Source |
|-----------|---------|--------|
| `Card`, `CardHeader`, `CardContent` | Phase group container | `@/components/ui/card` |
| `Badge` or styled `span` | Task status chip | `@/components/ui/badge` (Shadcn) or custom span |
| `Select` | Status dropdown per task | `@radix-ui/react-select` (installed) |
| `Input` | Assignee text field | `@/components/ui/input` |
| `Input type="date"` | Due date field | `@/components/ui/input` |
| `Separator` | Between phases | `@/components/ui/separator` |

**No new npm installs required.** All dependencies for Phase 4 are already in `package.json`.

---

## Architecture Patterns

### File Layout for Phase 4

```
lib/
├── checklist-tasks.ts        # CHECKLIST_SEED constant — 28 task definitions
├── types.ts                  # Add ChecklistTask interface
├── queries/
│   └── checklist.ts          # getChecklistTasks(projectId)
└── actions/
    └── checklist.ts          # updateChecklistTaskAction(taskId, patch)

components/
└── projects/
    └── ChecklistPanel.tsx    # 'use client' panel, grouped by phase

app/(admin)/proyectos/[id]/
└── page.tsx                  # Add ChecklistPanel (admin-only conditional render)
```

### Pattern 1: Seed on Project Creation

**What:** After `supabase.from('projects').insert(data)` returns the new project `id`, bulk-insert 28 tasks in one call.

**When to use:** Any time a project row is created. The seeding MUST happen inside `createProjectAction` so it is atomic from the user's perspective.

**Example:**
```typescript
// lib/actions/projects.ts (modified createProjectAction)
'use server'
import { CHECKLIST_SEED } from '@/lib/checklist-tasks'

export async function createProjectAction(formData: FormData): Promise<{ error?: string }> {
  // ... existing validation ...

  const supabase = await createClient()

  // 1. Insert the project and retrieve its id
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert(parsed.data)
    .select('id')
    .single()

  if (projectError || !project) {
    return { error: projectError?.message ?? 'Error al crear el proyecto' }
  }

  // 2. Bulk-insert 28 checklist tasks
  const tasks = CHECKLIST_SEED.map((task, index) => ({
    project_id: project.id,
    fase: task.fase,
    nombre: task.nombre,
    sort_order: index,
    status: 'Pendiente' as const,
  }))

  const { error: checklistError } = await supabase
    .from('checklist_tasks')
    .insert(tasks)

  if (checklistError) {
    // Non-fatal: project was created; log but don't block redirect
    console.error('Checklist seed failed:', checklistError.message)
  }

  revalidatePath('/proyectos')
  redirect('/proyectos/' + project.id)
}
```

**Key change from current code:** Current `createProjectAction` calls `.insert(parsed.data)` without `.select('id').single()`. The return value is currently discarded. This must be changed to capture the new `id`.

### Pattern 2: CHECKLIST_SEED Constant

**What:** A static array of `{ fase, nombre }` objects — the single source of truth for the 28 task names.

**Example:**
```typescript
// lib/checklist-tasks.ts
export const CHECKLIST_PHASES = [
  'Comercial',
  'Diseño y Especificaciones',
  'Producción',
  'Entrega y Cierre',
] as const

export type ChecklistFase = typeof CHECKLIST_PHASES[number]

export const CHECKLIST_SEED: Array<{ fase: ChecklistFase; nombre: string }> = [
  // Comercial (7)
  { fase: 'Comercial', nombre: 'Reunión inicial con cliente' },
  { fase: 'Comercial', nombre: 'Levantamiento de necesidades' },
  { fase: 'Comercial', nombre: 'Cotización enviada' },
  { fase: 'Comercial', nombre: 'Anticipo recibido' },
  { fase: 'Comercial', nombre: 'Contrato firmado' },
  { fase: 'Comercial', nombre: 'Fecha de entrega confirmada' },
  { fase: 'Comercial', nombre: 'Expediente del cliente abierto' },

  // Diseño y Especificaciones (6)
  { fase: 'Diseño y Especificaciones', nombre: 'Planos o renders aprobados por cliente' },
  { fase: 'Diseño y Especificaciones', nombre: 'Materiales y acabados definidos' },
  { fase: 'Diseño y Especificaciones', nombre: 'Órdenes de compra enviadas a proveedores' },
  { fase: 'Diseño y Especificaciones', nombre: 'Recepción de materiales confirmada' },
  { fase: 'Diseño y Especificaciones', nombre: 'Control de calidad en materiales' },
  { fase: 'Diseño y Especificaciones', nombre: 'Especificaciones técnicas entregadas a producción' },

  // Producción (9)
  { fase: 'Producción', nombre: 'Corte de materiales' },
  { fase: 'Producción', nombre: 'Armado de estructura' },
  { fase: 'Producción', nombre: 'Aplicación de acabados' },
  { fase: 'Producción', nombre: 'Control de calidad intermedio' },
  { fase: 'Producción', nombre: 'Tapizado o revestimiento' },
  { fase: 'Producción', nombre: 'Ensamblaje final' },
  { fase: 'Producción', nombre: 'Revisión dimensional' },
  { fase: 'Producción', nombre: 'Fotografías del producto terminado' },
  { fase: 'Producción', nombre: 'Aprobación interna antes de entrega' },

  // Entrega y Cierre (8)
  { fase: 'Entrega y Cierre', nombre: 'Logística de entrega coordinada' },
  { fase: 'Entrega y Cierre', nombre: 'Instalación en sitio' },
  { fase: 'Entrega y Cierre', nombre: 'Revisión final con cliente' },
  { fase: 'Entrega y Cierre', nombre: 'Finiquito recibido' },
  { fase: 'Entrega y Cierre', nombre: 'Factura / comprobante emitido' },
  { fase: 'Entrega y Cierre', nombre: 'Pagos a proveedores liquidados' },
  { fase: 'Entrega y Cierre', nombre: 'Expediente cerrado en sistema' },
  { fase: 'Entrega y Cierre', nombre: 'Retroalimentación del cliente obtenida' },
]
```

**Note:** The exact task names are a product decision. The list above is a reasonable default for a high-end furniture/design studio. The planner should confirm these names with the user or treat them as the canonical set from requirements (CHEC-01 defines counts, not names).

### Pattern 3: ChecklistPanel Component

**What:** `'use client'` component; receives `ChecklistTask[]` as props; groups by `fase`; renders per-phase progress and per-task status/assignee/due_date editing inline.

**When to use:** Rendered conditionally in `/proyectos/[id]/page.tsx` only when user role is `admin`.

**Structure:**
```typescript
// components/projects/ChecklistPanel.tsx
'use client'

interface ChecklistTask {
  id: string
  fase: string
  nombre: string
  assignee: string | null
  due_date: string | null
  status: 'Pendiente' | 'En Proceso' | 'Completado' | 'Bloqueado' | 'N/A'
  sort_order: number
}

interface ChecklistPanelProps {
  tasks: ChecklistTask[]
  projectId: string
}

// Group tasks by fase, show per-phase: "X / Y Completadas"
// Inline editing: status Select, assignee Input, due_date Input type="date"
// On change: call updateChecklistTaskAction(taskId, { status|assignee|due_date })
```

### Pattern 4: Update Server Action

**What:** Minimal Server Action that accepts task `id` and a patch object with any subset of `{status, assignee, due_date}`.

**Example:**
```typescript
// lib/actions/checklist.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const VALID_STATUSES = ['Pendiente', 'En Proceso', 'Completado', 'Bloqueado', 'N/A'] as const

const patchSchema = z.object({
  taskId: z.string().uuid(),
  projectId: z.string().uuid(),
  status: z.enum(VALID_STATUSES).optional(),
  assignee: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
})

export async function updateChecklistTaskAction(
  formData: FormData
): Promise<{ error?: string }> {
  const raw = Object.fromEntries(formData)
  const parsed = patchSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const { taskId, projectId, ...patch } = parsed.data

  const supabase = await createClient()
  const { error } = await supabase
    .from('checklist_tasks')
    .update(patch)
    .eq('id', taskId)

  if (error) return { error: error.message }

  revalidatePath('/proyectos/' + projectId)
  return {}
}
```

### Pattern 5: Admin-Only Conditional Render

**What:** Read user role in the Server Component page; only pass checklist data and render `ChecklistPanel` for admin users.

**Example (in `app/(admin)/proyectos/[id]/page.tsx`):**
```typescript
import { createClient } from '@/lib/supabase/server'

// Inside the page function, alongside existing Promise.all:
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

// Call get_user_role() via RPC or use existing profile context
// Pattern used in layout: check role via profiles table
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user!.id)
  .single()

const isAdmin = profile?.role === 'admin'

// Fetch checklist tasks only if admin
const checklistTasks = isAdmin
  ? await getChecklistTasks(id)
  : []

// In JSX:
{isAdmin && (
  <>
    <Separator />
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Checklist de Producción</h2>
      <ChecklistPanel tasks={checklistTasks} projectId={id} />
    </div>
  </>
)}
```

**Note:** The admin layout already protects this route group for `admin` users only (Phase 1). However, CHEC-05 requires the checklist section to not even render for accountant users. Since the `(admin)` layout already redirects non-admins before reaching this page, the conditional render adds defense-in-depth but is mostly cosmetic — the RLS policy is the real enforcer. Keep the conditional render for clarity.

### Anti-Patterns to Avoid

- **Do not seed checklist via a Postgres trigger:** The task names are application-level business logic, not database-level constraints. A trigger would scatter this logic and make it harder to update. Keep the seed in the Server Action.
- **Do not use a separate API route for task updates:** The existing pattern in this project is Server Actions + `revalidatePath`. Do not introduce fetch-based mutations.
- **Do not store the 28 task definitions in the database:** They are static seed data. A `checklist_templates` table would add unnecessary complexity.
- **Do not make ChecklistPanel a Server Component:** It needs `useState` for managing optimistic/immediate UI feedback on status changes.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Grouped list rendering | Custom groupBy utility | Native `Array.reduce` into a `Map<fase, tasks[]>` or `Object.groupBy` (Node 21+) | Trivial with `.reduce`; no library needed |
| Status badge styling | Custom badge component | `<span>` with Tailwind conditional classes or existing Shadcn `Badge` if available | Already have Tailwind; a span with variant classes is sufficient |
| Form state for inline editing | Custom state machine | `react-hook-form` already installed | Consistent with rest of codebase |
| Role check | Custom middleware logic | Supabase RLS (`admin_all_checklist_tasks` policy) + server-side profile check | Already enforced at DB level |

---

## Common Pitfalls

### Pitfall 1: createProjectAction does not capture the inserted project id

**What goes wrong:** Current `createProjectAction` calls `.insert(parsed.data)` and discards the result — it calls `redirect('/proyectos')` not to the specific project. After Phase 4, the redirect should go to the new project detail page, and the checklist seed requires the `id`.

**Why it happens:** The original action did not need the `id` — it redirected to the list. Now we need both the `id` for seeding and to redirect to the detail page.

**How to avoid:** Change the insert call to `.insert(parsed.data).select('id').single()`. This returns the new row's `id`. Then redirect to `/proyectos/${project.id}`.

**Warning signs:** If the checklist panel shows empty after creating a project, the seed step likely failed silently because `project.id` was undefined.

### Pitfall 2: Checklist tasks already exist for projects created before Phase 4

**What goes wrong:** All projects created during Phases 1-3 (while checklist seeding was not yet implemented) will have zero checklist tasks. The UI will show an empty ChecklistPanel.

**Why it happens:** The seed only runs on new project creation. Existing projects were inserted before the seed logic existed.

**How to avoid:** Write a one-time migration SQL or a manual seed script that inserts the 28 tasks for all existing `project_id` values that have no rows in `checklist_tasks`. This is a Wave 0 task in the plan.

**Warning signs:** Project detail page shows "Sin tareas" for projects created before Phase 4 go-live.

### Pitfall 3: Forgetting sort_order on seed insert

**What goes wrong:** Tasks are stored without `sort_order`, and the DB or Supabase client returns them in insertion order (non-deterministic in Postgres). The grouped display scrambles across refreshes.

**Why it happens:** `checklist_tasks` has a `sort_order INTEGER NOT NULL DEFAULT 0` column. If all rows get `sort_order = 0`, ordering is undefined.

**How to avoid:** When mapping `CHECKLIST_SEED` to insert rows, assign `sort_order: index`. The query in `getChecklistTasks` should `order('sort_order', { ascending: true })`.

### Pitfall 4: Inline editing causes full page re-render flash

**What goes wrong:** Each task status change calls a Server Action that triggers `revalidatePath`, causing a full server round-trip and visible page refresh.

**Why it happens:** `revalidatePath` invalidates the entire page cache. For a task list with 28 items, this is visually jarring.

**How to avoid:** In the `ChecklistPanel` client component, apply optimistic local state before awaiting the server action. Update the local task array immediately on change, then fire the server action in the background. If the action errors, revert.

**Warning signs:** A visible flicker/spinner after every status dropdown change.

### Pitfall 5: Accountant can still query checklist_tasks via Supabase JS directly

**What goes wrong:** The RLS policy `admin_all_checklist_tasks` blocks accountant at DB level (no SELECT policy for accountant role). However, if the page Server Component fetches tasks before checking role, it will correctly get an empty array (RLS returns nothing), which may cause confusion during development.

**Why it happens:** RLS returns empty result for unauthorized roles, not an error. This is the correct behavior — no data leaks — but it can mask missing role checks during development.

**How to avoid:** Always check `isAdmin` in the Server Component before calling `getChecklistTasks`. Log a warning if the query returns empty but the user is admin.

---

## Code Examples

### getChecklistTasks query

```typescript
// lib/queries/checklist.ts
import { createClient } from '@/lib/supabase/server'
import type { ChecklistTask } from '@/lib/types'

export async function getChecklistTasks(projectId: string): Promise<ChecklistTask[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('checklist_tasks')
    .select('id, fase, nombre, assignee, due_date, status, sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data ?? []
}
```

### ChecklistTask type addition to lib/types.ts

```typescript
// Add to lib/types.ts
export type ChecklistStatus = 'Pendiente' | 'En Proceso' | 'Completado' | 'Bloqueado' | 'N/A'
export type ChecklistFase = 'Comercial' | 'Diseño y Especificaciones' | 'Producción' | 'Entrega y Cierre'

export interface ChecklistTask {
  id: string
  project_id?: string
  fase: ChecklistFase
  nombre: string
  assignee: string | null
  due_date: string | null  // ISO date string
  status: ChecklistStatus
  sort_order: number
}
```

### Phase progress calculation (pure function, no library)

```typescript
// Inside ChecklistPanel.tsx
function calcPhaseProgress(tasks: ChecklistTask[]): { completed: number; total: number } {
  return {
    completed: tasks.filter(t => t.status === 'Completado' || t.status === 'N/A').length,
    total: tasks.length,
  }
}
```

### Grouping tasks by phase

```typescript
// Inside ChecklistPanel.tsx
const FASE_ORDER: ChecklistFase[] = [
  'Comercial',
  'Diseño y Especificaciones',
  'Producción',
  'Entrega y Cierre',
]

const grouped = FASE_ORDER.map(fase => ({
  fase,
  tasks: tasks.filter(t => t.fase === fase).sort((a, b) => a.sort_order - b.sort_order),
}))
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Seed via Postgres trigger | Seed in Server Action after insert | Task names stay in application code; easier to update |
| Separate page for checklist | Panel section within project detail | Consistent with existing ClientPaymentPanel / SupplierPaymentPanel pattern |
| useState for each field | react-hook-form for inline edit | Consistent with rest of codebase; built-in validation |

---

## Open Questions

1. **What are the exact 28 task names?**
   - What we know: CHEC-01 defines the count per phase (7+6+9+8=28) but not the task names
   - What's unclear: The names above are suggested defaults for a furniture studio; user may want different names
   - Recommendation: Use the names from `CHECKLIST_SEED` above as the default and note they can be edited in `lib/checklist-tasks.ts`. Do not block implementation on this.

2. **Should existing projects get a backfill seed?**
   - What we know: Projects created in Phases 2 and 3 have no checklist tasks
   - What's unclear: Whether the user wants to manually seed those projects or leave them empty
   - Recommendation: Include a migration SQL snippet in the plan that inserts the 28 tasks for all existing projects. Make it idempotent (only insert where `NOT EXISTS`).

3. **Inline editing vs. modal editing for task fields?**
   - What we know: CHEC-03 says "update status, assignee, and due date" — no specification of UX
   - What's unclear: Whether inline table editing or a dialog per task is preferred
   - Recommendation: Inline editing (matching the table-row pattern in `LineItemTable`) is lower friction for a 28-task list. Use a `<Select>` for status, `<Input>` for assignee, `<Input type="date">` for due date — all inline in the task row.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.18 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run lib/checklist-tasks.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHEC-01 | CHECKLIST_SEED has exactly 28 entries with correct phase distribution (7+6+9+8) | unit | `npx vitest run lib/checklist-tasks.test.ts` | Wave 0 |
| CHEC-01 | Each seed entry has required fields: `fase` and `nombre` (non-empty strings) | unit | `npx vitest run lib/checklist-tasks.test.ts` | Wave 0 |
| CHEC-02 | `ChecklistTask` type has all required fields (verified at TypeScript compile time) | type-check | `npx tsc --noEmit` | N/A (compile) |
| CHEC-03 | `updateChecklistTaskAction` validates input — rejects invalid status values | unit | `npx vitest run lib/actions/checklist.test.ts` | Wave 0 |
| CHEC-04 | `calcPhaseProgress` returns correct completed/total counts | unit | `npx vitest run lib/checklist-tasks.test.ts` | Wave 0 |
| CHEC-05 | No accountant SELECT policy on `checklist_tasks` (DB-level) | manual | Verify in Supabase dashboard or migration SQL review | N/A |

### Sampling Rate

- **Per task commit:** `npx vitest run lib/checklist-tasks.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `lib/checklist-tasks.test.ts` — covers CHEC-01 seed count/distribution and calcPhaseProgress
- [ ] `lib/actions/checklist.test.ts` — covers CHEC-03 action validation (mock Supabase client)

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection — `supabase/migrations/20260303000001_initial_schema.sql` — confirmed `checklist_tasks` table and `admin_all_checklist_tasks` RLS policy already exist
- Direct codebase inspection — `lib/actions/projects.ts` — confirmed `createProjectAction` needs modification to return `id`
- Direct codebase inspection — `lib/actions/payments-client.ts`, `components/projects/ClientPaymentPanel.tsx` — confirmed Server Action + `revalidatePath` pattern to follow
- Direct codebase inspection — `lib/types.ts` — confirmed `ChecklistTask` type is absent and must be added
- Direct codebase inspection — `package.json` — confirmed all required packages already installed (no new installs needed)
- Direct codebase inspection — `vitest.config.ts` — confirmed Vitest with node environment, `@` alias to project root

### Secondary (MEDIUM confidence)

- Supabase JS v2 docs pattern: `.insert([...]).select('id').single()` to retrieve generated UUID after insert — consistent with `@supabase/supabase-js` v2 API

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed; no external research needed
- Architecture patterns: HIGH — directly derived from existing codebase patterns (ClientPaymentPanel, createProjectAction)
- Pitfalls: HIGH — identified from code analysis (missing id capture, existing projects without tasks, sort_order)
- Task names: LOW — 28 task names are suggested defaults, not confirmed by user

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable project; no fast-moving external dependencies)
