# Architecture Research

**Domain:** Internal business management app — project management, quoting, payment tracking, financial reporting
**Researched:** 2026-03-03
**Confidence:** MEDIUM (official docs unavailable during research session; based on well-established Next.js 14 + Supabase patterns with high community consensus as of knowledge cutoff Aug 2025)

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                     Next.js 14 App (Vercel)                       │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐    │
│  │  (auth)      │  │  (admin)     │  │  (accountant)        │    │
│  │  /login      │  │  /dashboard  │  │  /resumen            │    │
│  │              │  │  /proyectos  │  │  /flujo-efectivo     │    │
│  │              │  │  /proveedores│  │                      │    │
│  │              │  │  /cotizacion │  │                      │    │
│  └──────────────┘  └──────────────┘  └──────────────────────┘    │
│           │               │                     │                 │
│  ┌────────┴───────────────┴─────────────────────┴──────────┐     │
│  │             Server Components + Server Actions            │     │
│  │    (data fetching, mutations, RLS enforcement)            │     │
│  └──────────────────────────┬───────────────────────────────┘     │
│                             │                                      │
│  ┌──────────────────────────▼───────────────────────────────┐     │
│  │                React PDF (Server-side)                    │     │
│  │          /api/pdf/cotizacion, /api/pdf/orden-compra       │     │
│  └──────────────────────────────────────────────────────────┘     │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│                         Supabase                                   │
│                                                                    │
│  ┌──────────────────┐    ┌──────────────────────────────────┐     │
│  │   Supabase Auth  │    │   Postgres + RLS Policies        │     │
│  │  (JWT, sessions) │    │   (role-gated row access)        │     │
│  └──────────────────┘    └──────────────────────────────────┘     │
└───────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Route group `(auth)` | Login/logout pages, no shared sidebar layout | `app/(auth)/login/page.tsx` |
| Route group `(admin)` | All admin-only pages behind admin layout with sidebar | `app/(admin)/dashboard/page.tsx` |
| Route group `(accountant)` | Accountant-restricted pages, simplified layout | `app/(accountant)/resumen/page.tsx` |
| Server Components | Data fetching from Supabase, RLS enforced automatically | `page.tsx` files — async, no `"use client"` |
| Client Components | Interactive UI: forms, charts, modals | `"use client"` components in `_components/` |
| Server Actions | Mutations: create/update/delete via `action.ts` files | `'use server'` functions, called from forms |
| API Routes | PDF generation only (streaming binary response) | `app/api/pdf/[type]/route.ts` |
| Supabase RLS | Database-level access control per role | Postgres policies on every table |

---

## Database Schema

### Tables

```sql
-- Users are managed by Supabase Auth (auth.users)
-- We extend with a profiles table for role assignment

CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('admin', 'accountant')),
  full_name   text,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE projects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          text NOT NULL,
  cliente_nombre  text NOT NULL,
  cliente_email   text,
  status          text NOT NULL DEFAULT 'Prospecto'
                  CHECK (status IN (
                    'Prospecto', 'Cotizado', 'Anticipo Recibido',
                    'En Producción', 'Entregado', 'Cerrado'
                  )),
  notas           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE line_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  descripcion     text NOT NULL,
  costo_proveedor numeric(12,2) NOT NULL DEFAULT 0,   -- ADMIN ONLY
  margen          numeric(5,4)  NOT NULL DEFAULT 0.50, -- ADMIN ONLY (stored as decimal: 0.50 = 50%)
  precio_venta    numeric(12,2) GENERATED ALWAYS AS
                    (ROUND(costo_proveedor / (1 - margen), 2)) STORED,
  cantidad        integer NOT NULL DEFAULT 1,
  proveedor_id    uuid REFERENCES suppliers(id),
  notas           text,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE suppliers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text NOT NULL,
  contacto    text,
  email       text,
  telefono    text,
  notas       text,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE payments_client (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tipo        text NOT NULL CHECK (tipo IN ('anticipo', 'finiquito', 'otro')),
  monto       numeric(12,2) NOT NULL,
  fecha       date NOT NULL,
  notas       text,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE payments_supplier (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  supplier_id  uuid NOT NULL REFERENCES suppliers(id),
  monto        numeric(12,2) NOT NULL,  -- ADMIN ONLY
  fecha        date NOT NULL,
  notas        text,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE checklist_tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  fase        text NOT NULL CHECK (fase IN (
                'Comercial', 'Diseño y Especificaciones',
                'Producción', 'Entrega y Cierre'
              )),
  tarea       text NOT NULL,
  completado  boolean NOT NULL DEFAULT false,
  completado_at timestamptz,
  orden       integer NOT NULL,
  created_at  timestamptz DEFAULT now()
);
```

### Key Relationships

```
projects
  ├── line_items       (project_id → projects.id)
  │     └── suppliers  (proveedor_id → suppliers.id)
  ├── payments_client  (project_id → projects.id)
  ├── payments_supplier(project_id → projects.id)
  │     └── suppliers  (supplier_id → suppliers.id)
  └── checklist_tasks  (project_id → projects.id)

profiles (extends auth.users)
```

### Financial Calculations (Formula-Driven, Never Hardcoded)

```
precio_venta per line item  = costo_proveedor / (1 - margen)
subtotal per line item      = precio_venta * cantidad
total_sin_iva per project   = SUM(subtotal for all line_items)
iva                         = total_sin_iva * 0.16
total_con_iva               = total_sin_iva + iva
ganancia_bruta per project  = SUM((precio_venta - costo_proveedor) * cantidad)
margen_efectivo             = ganancia_bruta / total_sin_iva

-- Client payments
anticipo_recibido           = SUM(payments_client WHERE tipo='anticipo')
finiquito_recibido          = SUM(payments_client WHERE tipo='finiquito')
saldo_pendiente_cliente     = total_con_iva - (anticipo + finiquito)

-- Supplier payments
pagado_proveedores          = SUM(payments_supplier for project)
adeudo_proveedores          = SUM(costo_proveedor * cantidad) - pagado_proveedores

-- 30-day cash flow
entradas_30d  = SUM(payments_client WHERE fecha BETWEEN now() AND now()+30)
salidas_30d   = SUM(payments_supplier WHERE fecha BETWEEN now() AND now()+30)
```

---

## RLS Policies

### Role-Based Access Strategy

The `profiles.role` column drives all access decisions. Supabase Auth JWT is extended with the role claim via a database hook or the Auth `user_metadata`. The cleanest approach for this app: read `profiles.role` in every RLS policy using `auth.uid()`.

**Confidence: MEDIUM** — The pattern of reading from a `profiles` table inside RLS policies is well-established Supabase practice. Verify exact JWT claim method against current Supabase docs (claims may be injectable via `auth.jwt() -> 'app_metadata'` depending on Supabase version).

```sql
-- Helper function to get current user role (avoids repeating subquery)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

-- =====================
-- PROJECTS table
-- =====================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "admin_all_projects" ON projects
  FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Accountant: read-only, all projects (needs to see cash flow by project)
CREATE POLICY "accountant_read_projects" ON projects
  FOR SELECT
  USING (get_user_role() = 'accountant');

-- =====================
-- LINE_ITEMS table
-- =====================
ALTER TABLE line_items ENABLE ROW LEVEL SECURITY;

-- Admin: full access (sees costo_proveedor and margen)
CREATE POLICY "admin_all_line_items" ON line_items
  FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Accountant: NO ACCESS to line_items at all
-- (costs, margins, and supplier costs are hidden)
-- Note: accountant sees totals only via a view (see below)

-- =====================
-- PAYMENTS_CLIENT table
-- =====================
ALTER TABLE payments_client ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "admin_all_payments_client" ON payments_client
  FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Accountant: read-only (cash flow visibility)
CREATE POLICY "accountant_read_payments_client" ON payments_client
  FOR SELECT
  USING (get_user_role() = 'accountant');

-- =====================
-- PAYMENTS_SUPPLIER table
-- =====================
ALTER TABLE payments_supplier ENABLE ROW LEVEL SECURITY;

-- Admin: full access (supplier costs are sensitive)
CREATE POLICY "admin_all_payments_supplier" ON payments_supplier
  FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Accountant: read-only (balance view — monto is visible for accounting)
CREATE POLICY "accountant_read_payments_supplier" ON payments_supplier
  FOR SELECT
  USING (get_user_role() = 'accountant');

-- =====================
-- SUPPLIERS table
-- =====================
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_suppliers" ON suppliers
  FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "accountant_read_suppliers" ON suppliers
  FOR SELECT
  USING (get_user_role() = 'accountant');

-- =====================
-- CHECKLIST_TASKS table
-- =====================
ALTER TABLE checklist_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_checklist" ON checklist_tasks
  FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Accountant: no access to checklist
-- (operational detail, not financial)

-- =====================
-- PROFILES table
-- =====================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read their own profile
CREATE POLICY "own_profile_read" ON profiles
  FOR SELECT
  USING (id = auth.uid());

-- Admin can read all profiles
CREATE POLICY "admin_read_all_profiles" ON profiles
  FOR SELECT
  USING (get_user_role() = 'admin');
```

### Accountant-Safe View (for dashboard totals without exposing costs)

```sql
-- Accountant sees revenue and payment totals, never costs or margins
CREATE VIEW project_financials_accountant AS
SELECT
  p.id,
  p.nombre,
  p.status,
  p.cliente_nombre,
  SUM(pc.monto) FILTER (WHERE pc.tipo = 'anticipo') AS anticipo_recibido,
  SUM(pc.monto) FILTER (WHERE pc.tipo = 'finiquito') AS finiquito_recibido,
  SUM(pc.monto) AS total_cobrado,
  SUM(ps.monto) AS total_pagado_proveedores
FROM projects p
LEFT JOIN payments_client pc ON pc.project_id = p.id
LEFT JOIN payments_supplier ps ON ps.project_id = p.id
GROUP BY p.id, p.nombre, p.status, p.cliente_nombre;

-- RLS on this view enforces accountant-only visibility through the base table policies
```

---

## Recommended Project Structure

```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx              # Login form (Client Component)
│   └── layout.tsx                # Minimal layout — no sidebar
│
├── (admin)/
│   ├── layout.tsx                # Dark sidebar layout — admin nav
│   ├── dashboard/
│   │   └── page.tsx              # KPI cards, charts, pipeline
│   ├── proyectos/
│   │   ├── page.tsx              # Project list
│   │   ├── nuevo/
│   │   │   └── page.tsx          # New project form
│   │   └── [id]/
│   │       ├── page.tsx          # Project detail (partidas, pagos, checklist)
│   │       ├── cotizacion/
│   │       │   └── page.tsx      # Quote preview + PDF download
│   │       └── orden-compra/
│   │           └── page.tsx      # Purchase order preview + PDF download
│   ├── proveedores/
│   │   ├── page.tsx              # Supplier list + per-supplier balance
│   │   └── [id]/
│   │       └── page.tsx          # Supplier detail + payment history
│   └── configuracion/
│       └── page.tsx              # Settings (users, roles)
│
├── (accountant)/
│   ├── layout.tsx                # Simplified layout — accountant nav
│   ├── resumen/
│   │   └── page.tsx              # Cash flow + project balances
│   └── flujo-efectivo/
│       └── page.tsx              # 30-day cash flow view
│
├── api/
│   └── pdf/
│       ├── cotizacion/
│       │   └── route.ts          # PDF generation — quote (no costs)
│       └── orden-compra/
│           └── route.ts          # PDF generation — purchase order
│
├── globals.css
└── layout.tsx                    # Root layout (providers, fonts)

components/
├── ui/                           # Shadcn/ui components (auto-generated)
├── layout/
│   ├── Sidebar.tsx               # Dark sidebar with nav links
│   ├── SidebarNav.tsx            # Navigation item list
│   └── TopBar.tsx                # Mobile header + user menu
├── dashboard/
│   ├── KpiCard.tsx               # KPI summary card
│   ├── RevenueChart.tsx          # Recharts bar chart
│   ├── PipelineList.tsx          # Project status pipeline
│   └── CashFlowChart.tsx         # 30-day cash flow chart
├── proyectos/
│   ├── ProjectCard.tsx           # Project list item
│   ├── ProjectStatusBadge.tsx    # Status pill component
│   ├── LineItemTable.tsx         # Partidas table with calculated fields
│   ├── LineItemRow.tsx           # Individual row (editable)
│   └── ChecklistPanel.tsx        # 4-phase task checklist
├── pagos/
│   ├── ClientPaymentForm.tsx     # Add client payment
│   └── SupplierPaymentForm.tsx   # Add supplier payment
├── proveedores/
│   ├── SupplierCard.tsx          # Supplier list item
│   └── SupplierBalanceTable.tsx  # Per-supplier payment history
└── pdf/
    ├── CotizacionTemplate.tsx    # React PDF template — quote
    └── OrdenCompraTemplate.tsx   # React PDF template — purchase order

lib/
├── supabase/
│   ├── client.ts                 # Browser client (for Client Components)
│   ├── server.ts                 # Server client (for Server Components / Actions)
│   └── middleware.ts             # Session refresh middleware
├── actions/
│   ├── projects.ts               # Server Actions: createProject, updateProject
│   ├── line-items.ts             # Server Actions: addLineItem, updateLineItem
│   ├── payments.ts               # Server Actions: addPayment, updatePayment
│   ├── suppliers.ts              # Server Actions: createSupplier, updateSupplier
│   └── checklist.ts              # Server Actions: toggleTask
├── queries/
│   ├── projects.ts               # Data fetching functions (used in Server Components)
│   ├── dashboard.ts              # Aggregated dashboard queries
│   └── suppliers.ts              # Supplier queries
├── calculations.ts               # Pure financial calculation functions
├── formatters.ts                 # MXN currency, date formatters
└── types.ts                      # TypeScript types matching DB schema

middleware.ts                     # Auth guard: redirect to /login if no session
```

### Structure Rationale

- **Route groups `(auth)`, `(admin)`, `(accountant)`:** Different layouts per user context without polluting the URL. Admin sees the dark sidebar; accountant sees a minimal version; auth pages have no nav at all. Middleware enforces which route group a user can access based on their role.
- **`lib/actions/` vs `app/api/`:** Server Actions handle all CRUD mutations. The only API routes are PDF endpoints, which need to stream binary (PDF) responses — something Server Actions cannot do cleanly.
- **`lib/queries/`:** Centralizes data fetching functions called from Server Components. Keeps page files clean.
- **`components/pdf/`:** React PDF templates live alongside other components; they are imported only in API routes and rendered server-side.
- **`lib/calculations.ts`:** All financial math is pure TypeScript (no side effects). Tested independently. Never hardcodes IVA or margin — always parametric.

---

## Architectural Patterns

### Pattern 1: Server Components as Default, Client Components for Interactivity

**What:** Pages (`page.tsx`) are async Server Components that fetch data directly from Supabase and pass it as props to Client Components only where user interaction is needed (forms, charts, modals).

**When to use:** Always. The only reason to add `"use client"` is when you need `useState`, `useEffect`, event handlers, or browser APIs.

**Trade-offs:** Better initial performance and automatic RLS enforcement (server-side Supabase client uses the user's JWT). Downside: streaming/suspense patterns add complexity for loading states.

**Example:**
```typescript
// app/(admin)/proyectos/[id]/page.tsx — Server Component
import { getProjectWithLineItems } from '@/lib/queries/projects'
import { LineItemTable } from '@/components/proyectos/LineItemTable'

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const project = await getProjectWithLineItems(params.id)
  // RLS enforced: if user is accountant, this query returns no line_items (policy blocks it)
  return <LineItemTable project={project} />
}
```

### Pattern 2: Server Actions for All Mutations

**What:** Form submissions and data mutations use Next.js Server Actions (`'use server'`) instead of client-side fetch to API endpoints. Actions validate input, call Supabase, and revalidate the relevant path.

**When to use:** Every create, update, delete operation. Not for PDF streaming.

**Trade-offs:** Simpler than building API routes for mutations. Works with progressive enhancement. Downside: error handling UX requires care (use `useFormState` or `useActionState` in client wrappers).

**Example:**
```typescript
// lib/actions/projects.ts
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProjectStatus(projectId: string, status: string) {
  const supabase = createServerClient()
  const { error } = await supabase
    .from('projects')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', projectId)

  if (error) throw new Error(error.message)
  revalidatePath(`/proyectos/${projectId}`)
}
```

### Pattern 3: API Routes for PDF Generation Only

**What:** PDF generation uses `app/api/pdf/[type]/route.ts` because it needs to stream a binary PDF response with `Content-Type: application/pdf`. Server Actions return serializable data — they cannot stream binary.

**When to use:** Only for PDF endpoints. Keep API routes minimal.

**Trade-offs:** Adds one API route pattern to maintain, but it is the correct tool. React PDF renders on the server inside the route handler.

**Example:**
```typescript
// app/api/pdf/cotizacion/route.ts
import { renderToBuffer } from '@react-pdf/renderer'
import { CotizacionTemplate } from '@/components/pdf/CotizacionTemplate'
import { getProjectForQuote } from '@/lib/queries/projects'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId')!
  // Supabase server client — RLS applies. Quote query only fetches precio_venta, not costo_proveedor.
  const project = await getProjectForQuote(projectId)

  const buffer = await renderToBuffer(<CotizacionTemplate project={project} />)

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="cotizacion-${project.nombre}.pdf"`,
    },
  })
}
```

### Pattern 4: Middleware for Role-Based Routing

**What:** `middleware.ts` at the project root intercepts all requests, reads the Supabase session, checks the user's role from the JWT or profiles table, and redirects unauthorized access.

**When to use:** Every request to `(admin)` or `(accountant)` route groups.

**Trade-offs:** Centralizes auth logic. Must be kept lightweight (runs on every request in edge runtime). Do not query the database in middleware — read from the JWT claims only.

**Example:**
```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res: response })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Role comes from user_metadata or app_metadata set at signup
  const role = session.user.user_metadata?.role ?? session.user.app_metadata?.role

  // Accountant trying to access admin routes
  if (request.nextUrl.pathname.startsWith('/dashboard') && role !== 'admin') {
    return NextResponse.redirect(new URL('/resumen', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login).*)'],
}
```

### Pattern 5: Supabase Server Client (Cookies-Based Auth)

**What:** Use `@supabase/ssr` (the current recommended package) to create a Supabase client in Server Components and Server Actions that reads the session from cookies. The browser client (`createBrowserClient`) is only used in Client Components that need real-time or client-side auth state.

**When to use:** Always prefer the server client in Server Components and Actions. The browser client is for interactive components only.

**Confidence: MEDIUM** — `@supabase/ssr` replaced `@supabase/auth-helpers-nextjs` as the recommended approach. Verify which package is current at implementation time; both patterns work but `@supabase/ssr` is the newer standard.

---

## Data Flow

### Request Flow — Admin Viewing a Project

```
User navigates to /proyectos/[id]
    ↓
middleware.ts — validates session + role (admin OK)
    ↓
app/(admin)/proyectos/[id]/page.tsx (Server Component, async)
    ↓
lib/queries/projects.ts → getProjectWithLineItems(id)
    ↓
Supabase server client (cookies-based session)
    ↓
Postgres: SELECT with JOIN (line_items, payments_client, payments_supplier)
    RLS enforced: admin policy → full access
    ↓
Data returned to page → passed as props to Client Components
    ↓
LineItemTable.tsx (Client Component) renders table with calculated fields
```

### Request Flow — Accountant Viewing Cash Flow

```
User navigates to /resumen
    ↓
middleware.ts — validates session + role (accountant OK)
    ↓
app/(accountant)/resumen/page.tsx (Server Component)
    ↓
lib/queries/dashboard.ts → getAccountantDashboard()
    ↓
Supabase server client
    ↓
Postgres: SELECT from payments_client, payments_supplier, projects
    RLS enforced: accountant policy → no line_items returned
    No costo_proveedor, no margen fields exposed
    ↓
Aggregated totals only → passed to dashboard components
```

### Request Flow — PDF Generation

```
User clicks "Descargar Cotización"
    ↓
Client Component → fetch('/api/pdf/cotizacion?projectId=xxx')
    ↓
app/api/pdf/cotizacion/route.ts (API Route handler)
    ↓
lib/queries/projects.ts → getProjectForQuote(id)
    Query selects ONLY: nombre, cliente_nombre, line_items (descripcion, precio_venta, cantidad)
    NEVER fetches: costo_proveedor, margen
    ↓
renderToBuffer(<CotizacionTemplate project={...} />) — React PDF, server-side
    ↓
Response: binary PDF stream with Content-Type: application/pdf
    ↓
Browser: PDF download
```

### Mutation Flow — Adding a Line Item

```
User fills out LineItemForm (Client Component)
    ↓
form action → Server Action: addLineItem(formData)
    ↓
lib/actions/line-items.ts
    - Parse + validate formData
    - createServerClient() — session from cookies
    - supabase.from('line_items').insert(...)
    - RLS check: admin? → INSERT allowed
    ↓
revalidatePath(`/proyectos/${projectId}`)
    ↓
Next.js re-fetches page data → updated LineItemTable renders
```

### State Management

This app has minimal global state needs. No Redux or Zustand required.

```
Server State (Supabase via Server Components):
  - All project, payment, supplier data
  - Fetched fresh on each page navigation
  - Revalidated via revalidatePath() after mutations

Local UI State (React useState in Client Components):
  - Form input values
  - Modal open/close
  - Chart hover state

No global client-side state store needed.
```

---

## PDF Generation Architecture

**Library:** `@react-pdf/renderer` (React PDF)
**Rendering:** Server-side only — never in the browser
**Location:** `app/api/pdf/` route handlers call `renderToBuffer()`
**Template location:** `components/pdf/` — JSX components using React PDF primitives

### Quote Template Rules (Cotizacion)

- Shows: project name, client name, line item descriptions, `precio_venta`, quantities, subtotals, IVA, total
- Never shows: `costo_proveedor`, `margen`, any internal notes
- Data source: `getProjectForQuote()` — a dedicated query that explicitly selects only safe columns
- Style: Clean, editorial, monochrome. Studio logo at top.

### Purchase Order Template Rules (Orden de Compra)

- Shows: project name, supplier name, line items filtered by supplier, quantities, `costo_proveedor`
- Note: purchase orders are internal documents — they DO show costs (to the supplier, not the client)
- RLS: only admin can generate purchase orders (accountant cannot access line_items)

### Why Not Client-Side PDF Generation

React PDF can run in the browser, but server-side is strongly preferred because:
1. No risk of accidentally exposing cost/margin data in client JavaScript bundles
2. Consistent rendering across devices
3. Vercel's serverless environment handles it cleanly
4. Client does not need to download the React PDF library

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase Auth | `@supabase/ssr` cookies-based | Session managed via middleware + server client |
| Supabase Postgres | Supabase JS client with RLS | Direct queries — no ORM layer needed |
| Vercel | Next.js native deployment | API routes run as serverless functions |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Server Components ↔ Client Components | Props (serializable data only) | No direct function passing across boundary |
| Client Components ↔ Server Actions | `action=` on form elements or direct call | `"use server"` functions are called directly |
| Server Actions ↔ Supabase | Supabase server client | Session from cookies, RLS auto-enforced |
| API Routes ↔ React PDF | `renderToBuffer()` | Import templates, render, stream |
| Middleware ↔ Supabase Auth | `supabase.auth.getSession()` | Read session from cookies — no DB call in middleware |

---

## Build Order

The following sequence is required by dependency:

**1. Foundation (must be first)**
- Supabase project setup: tables, foreign keys, RLS policies
- Profiles table + role assignment on signup
- `lib/supabase/server.ts` and `lib/supabase/client.ts`
- Middleware auth guard
- Route group layouts `(auth)`, `(admin)`, `(accountant)`

**2. Auth Flow**
- Login page + Supabase Auth integration
- Role-based redirect after login
- Session persistence test (both roles)

**3. Core Data Layer**
- `lib/queries/` functions for each entity
- `lib/actions/` Server Actions for mutations
- `lib/calculations.ts` with all financial formulas
- `lib/formatters.ts` (MXN, dates)

**4. Projects CRUD (admin)**
- Project list, create, detail page
- Line item table with calculated fields
- Project status pipeline

**5. Payments Tracking**
- Client payment forms and history
- Supplier payment forms and history

**6. Suppliers Directory**
- Supplier list, create, balance view

**7. Checklist**
- 4-phase task list, toggle completion

**8. PDF Generation**
- Quote template (cotizacion)
- Purchase order template (orden de compra)
- API routes + download buttons

**9. Dashboard**
- KPI cards (revenue, costs, profit, pipeline counts)
- Recharts bar/line charts
- 30-day cash flow

**10. Accountant Views**
- Simplified layout
- Cash flow + payment totals (no costs)
- Access control verification

**Rationale:** Database schema and RLS must exist before any feature can be built or tested. Auth must work before role-gating any page. Core data layer (queries + actions) is shared across all features and must be stable before building UI on top. PDF is deferred until data is settled (the template reflects the final schema). Dashboard is last because it aggregates across all other entities.

---

## Scaling Considerations

This is a 2-person internal tool managing 4-8 projects. Scale is not a concern. However:

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (2 users, <10 projects) | Monolith is correct. No caching needed. Direct Supabase queries. |
| Future (team grows to 10 users) | Add Supabase connection pooling (PgBouncer is built-in). Still no architecture change needed. |
| Never needed | Microservices, Redis, message queues — premature and harmful for this context |

### Scaling Priorities (if ever needed)

1. **First bottleneck:** Dashboard aggregation queries if project count grows to hundreds — fix with materialized views or denormalized summary columns
2. **Second bottleneck:** PDF generation under concurrent load — add a queue (but irrelevant at this scale)

---

## Anti-Patterns

### Anti-Pattern 1: Fetching Data in Client Components

**What people do:** Add `"use client"` to page files, then call Supabase directly with `useEffect` + state.

**Why it's wrong:** Bypasses RLS enforcement path through server-side cookies. Exposes data fetching to the client. Adds unnecessary loading spinners. Slower (extra network round trip: browser → Next.js → Supabase vs Server Component → Supabase directly).

**Do this instead:** Keep page files as Server Components. Fetch in `lib/queries/`. Pass data as props.

### Anti-Pattern 2: Computing Financial Figures in the UI Layer

**What people do:** Calculate `precio_venta`, totals, IVA in component JSX with inline arithmetic.

**Why it's wrong:** Duplicates business logic. Hard to test. Easy to create inconsistencies across quote PDF, dashboard, and project detail.

**Do this instead:** All formulas live in `lib/calculations.ts`. Components receive computed values as props. PDF templates receive pre-computed totals.

### Anti-Pattern 3: Exposing Cost Columns in Quote Query

**What people do:** Write a single `getProject()` function that fetches all columns, then "filter" the display in the UI to hide costs.

**Why it's wrong:** `costo_proveedor` and `margen` would travel through the network to the client even if not displayed. A compromised PDF template or developer error could expose them.

**Do this instead:** `getProjectForQuote()` is a dedicated function that selects only `descripcion`, `precio_venta`, `cantidad` from `line_items`. Never fetches cost columns for client-facing outputs.

### Anti-Pattern 4: Putting Role Logic Only in the UI

**What people do:** Show/hide UI elements based on role in React, but let Supabase queries run without RLS.

**Why it's wrong:** UI-only gating is trivially bypassed. The database must enforce access — not the presentation layer.

**Do this instead:** RLS policies on every table as described above. The UI role-checks are a second layer for UX (hiding irrelevant nav items), not the security boundary.

### Anti-Pattern 5: Using API Routes for Form Mutations

**What people do:** Create `POST /api/projects` handlers for every mutation, requiring manual session validation on each route.

**Why it's wrong:** More code, more surface area, session cookies must be manually forwarded. Server Actions handle this automatically.

**Do this instead:** Use Server Actions for all mutations. Reserve API routes exclusively for PDF streaming.

---

## Sources

- Next.js 14 App Router documentation — route groups, Server Components, Server Actions (official docs; confidence HIGH for patterns described, MEDIUM for specific API names which may have minor version drift)
- Supabase documentation — RLS policies, `@supabase/ssr`, auth helpers (MEDIUM confidence — `@supabase/ssr` vs `@supabase/auth-helpers-nextjs` package name should be verified at implementation time)
- React PDF (`@react-pdf/renderer`) — server-side `renderToBuffer` pattern (MEDIUM confidence — verify current API; `renderToBuffer` is the established server-side method)
- Project context: `/Users/paulchaput/primer_proyecto_claudecode/.planning/PROJECT.md`

---
*Architecture research for: W Chaput Studio — Project Management App*
*Researched: 2026-03-03*
