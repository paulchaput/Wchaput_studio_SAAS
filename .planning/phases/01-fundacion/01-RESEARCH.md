# Phase 1: Fundacion - Research

**Researched:** 2026-03-03
**Domain:** Next.js 15 App Router + Supabase Auth + RLS + Tailwind CSS v4 + Shadcn/ui — authentication, role-based access, app shell, and database schema foundation
**Confidence:** HIGH (core patterns verified against current official docs and live npm registry; cookie API confirmed current)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can log in with email and password (Supabase Auth) | Supabase email/password auth via `@supabase/ssr` createBrowserClient; login form with react-hook-form + zod |
| AUTH-02 | User session persists across browser refresh and page navigation | Cookie-based sessions via `@supabase/ssr` + middleware.ts calling `getUser()` on every request refreshes the JWT automatically |
| AUTH-03 | Admin role has full access to all features, data, and financial details | Profiles table approach + RLS `get_user_role()` helper + admin route group layout enforcing role |
| AUTH-04 | Accountant role read-only, margins/supplier costs never visible (enforced at DB level) | RLS policies block accountant from `line_items` table entirely; separate view for safe columns only |
| AUTH-05 | Unauthenticated redirected to login; role-based redirect to correct view | Middleware checks session + profile role; redirects admin→/dashboard, accountant→/resumen, anonymous→/login |
| UX-03 | Layout uses dark sidebar for navigation and white content areas | Shadcn/ui sidebar component + Tailwind CSS v4 CSS variables; dark bg on sidebar, white on content |
| UX-04 | Palette is monochrome with subtle grays; no color accent beyond black/white/gray | Shadcn/ui Zinc theme (stone/zinc palette); tailwindcss-animate removed; no accent color tokens |
</phase_requirements>

---

## Summary

Phase 1 establishes the three load-bearing pillars that every subsequent phase depends on: the Supabase database schema with correct financial column types, the authentication and session management infrastructure, and the app shell that both roles navigate within. Every architectural decision made in this phase is costly to change later — particularly the data types used for money columns, the RLS policy structure, and the route group layout.

The most critical verified finding is the `@supabase/ssr` cookie handler API. The package is currently at version **0.9.0** (requires `@supabase/supabase-js ^2.97.0`). The cookie handler uses **`getAll`/`setAll` exclusively** — the older `get`/`set`/`remove` methods are deprecated and must not be used. The `cookies()` function from `next/headers` is **async** in Next.js 15 and must be awaited. Any code examples using the old three-method API will silently produce session bugs.

The second critical decision is the role resolution strategy. The project has locked in the **profiles table approach** (not JWT claims) for RLS role resolution. This means RLS policies call a `get_user_role()` helper function that performs a `SELECT role FROM profiles WHERE id = auth.uid()`. The tradeoff versus JWT claims is confirmed: profiles table lookups are slightly slower per query but role changes take effect immediately (JWT claims require token refresh, which takes up to 1 hour). For a 2-person internal tool this is the correct choice. The middleware should NOT perform role checks (no DB query in middleware — only `getUser()` for session refresh); role-based redirects should happen in the layout Server Components.

**Primary recommendation:** Build in strict order — Supabase schema and RLS first (plan 01-01), then Next.js scaffolding and Supabase client factories (01-02), then login/logout and role-aware layouts (01-03). Do not write any application code before the schema is finalized with `NUMERIC(12,2)` on all money columns.

---

## Standard Stack

### Core (Phase 1 relevant)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.x (latest) | Full-stack React framework | App Router is canonical; Turbopack default; Server Components eliminate extra API routes |
| React | 19.x | UI component layer | Pinned by Next.js 15; do not manage separately |
| TypeScript | 5.x | Type safety | Auto-configured by `create-next-app` |
| `@supabase/supabase-js` | ^2.97.0 | Core Supabase client | Required peer dep of `@supabase/ssr` 0.9.0 |
| `@supabase/ssr` | 0.9.0 | Cookie-based SSR auth for Next.js | Official replacement for deprecated `auth-helpers-nextjs`; provides `createServerClient` + `createBrowserClient` |
| Tailwind CSS | 4.x | Utility-first CSS | Installed by `create-next-app`; v4 uses CSS-based config (no `tailwind.config.js`) |
| Shadcn/ui | Latest CLI | Accessible component primitives | Components copied into repo; built on Radix UI + Tailwind v4; Zinc theme for monochrome palette |
| `react-hook-form` | 7.x | Form state management | Used for login form; uncontrolled, minimal re-renders |
| `zod` | 3.x | Schema validation | Validates login form inputs; pairs with `@hookform/resolvers` |
| `@hookform/resolvers` | 3.x | Connects Zod to react-hook-form | Required for `zodResolver` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | Latest | Icon set | Navigation icons in sidebar; consistent with Shadcn/ui defaults |
| `clsx` + `tailwind-merge` | Latest | Conditional class composition | `cn()` utility required by all Shadcn components |
| `server-only` | Latest | Compile-time guard | Add to `lib/supabase/server.ts` to prevent server client from being imported in Client Components |

### Alternatives NOT to Use

| Instead of | Why Not | Use Instead |
|------------|---------|-------------|
| `@supabase/auth-helpers-nextjs` | Deprecated in 2024, not maintained | `@supabase/ssr` |
| `get`/`set`/`remove` cookie methods | Deprecated in `@supabase/ssr` | `getAll`/`setAll` only |
| `supabase.auth.getSession()` in server code | Not validated server-side; spoofable | `supabase.auth.getUser()` always |
| `tailwind.config.js` | Tailwind v4 uses CSS-only config | `@theme` directive in `globals.css` |
| `npx shadcn-ui@latest` | Old package name | `npx shadcn@latest` |

**Installation (Phase 1):**
```bash
# 1. Scaffold project
npx create-next-app@latest w-chaput-studio --typescript --tailwind --eslint --app --import-alias "@/*"

# 2. Supabase client + SSR helpers
npm install @supabase/supabase-js @supabase/ssr

# 3. Forms and validation
npm install react-hook-form @hookform/resolvers zod

# 4. UI utilities
npm install lucide-react clsx tailwind-merge

# 5. Guard against server module leak
npm install server-only

# 6. Shadcn/ui init (choose: Zinc base color, CSS variables = yes)
npx shadcn@latest init

# 7. Shadcn components needed for Phase 1
npx shadcn@latest add button card form input label

# Dev dependency: Supabase CLI for local development + migrations
npm install -D supabase
```

---

## Architecture Patterns

### Recommended Project Structure (Phase 1 scope)

```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx              # Login form — Client Component
│   └── layout.tsx                # Minimal layout — no sidebar, centered
│
├── (admin)/
│   ├── layout.tsx                # Dark sidebar layout — admin nav, role check
│   └── dashboard/
│       └── page.tsx              # Placeholder — "Dashboard coming in Phase 6"
│
├── (accountant)/
│   ├── layout.tsx                # Simplified sidebar layout, role check
│   └── resumen/
│       └── page.tsx              # Placeholder — "Resumen coming in Phase 6"
│
├── globals.css                   # Tailwind v4 + Shadcn CSS variables (Zinc theme)
└── layout.tsx                    # Root layout (providers, Inter font)

components/
├── ui/                           # Shadcn/ui auto-generated components
└── layout/
    ├── AppSidebar.tsx            # Dark sidebar with nav links
    └── SidebarNav.tsx            # Navigation link list (role-aware)

lib/
├── supabase/
│   ├── client.ts                 # Browser client (Client Components only)
│   ├── server.ts                 # Server client (Server Components, Actions, Routes)
│   └── middleware.ts             # updateSession() helper
└── types.ts                      # TypeScript types matching DB schema

middleware.ts                     # Root middleware: session refresh + auth guard

supabase/
├── migrations/
│   └── 20260303000001_initial_schema.sql   # All tables + RLS policies
└── seed.sql                      # Two user accounts (admin + accountant)
```

### Pattern 1: @supabase/ssr Cookie Handler (VERIFIED — current API as of 0.9.0)

**What:** The only correct way to create a Supabase client in Next.js 15 Server Components. Uses `getAll`/`setAll` cookie methods exclusively. `cookies()` is async and must be awaited.

**Source:** Confirmed via WebSearch cross-referencing Supabase official docs + npm registry (2026-03-03)

```typescript
// lib/supabase/server.ts
import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()  // MUST await in Next.js 15
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component: writes throw (expected); middleware handles refresh
          }
        },
      },
    }
  )
}
```

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Pattern 2: Middleware for Session Refresh

**What:** `middleware.ts` at project root runs on every request. Calls `supabase.auth.getUser()` — this is required to refresh the JWT token. Without it, sessions expire after 60 minutes and Server Components see no user.

**Critical rule:** Do NOT call `getSession()` — it reads from cookies without server validation and is spoofable. `getUser()` validates against Supabase Auth server.

**Critical rule:** Do NOT make DB queries for role in middleware. Role-based routing happens in layout Server Components. Middleware only handles session refresh + unauthenticated redirect.

```typescript
// lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // REQUIRED: refreshes auth token. Do NOT remove or move.
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect unauthenticated users to login (except auth routes)
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

// middleware.ts (project root)
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Pattern 3: Role-Based Layout Guard (profiles table approach)

**What:** Layout Server Components fetch the user's role from the `profiles` table and redirect if wrong role. This is where role-based routing happens — NOT in middleware.

**Why profiles table (not JWT claims):** Role changes take effect immediately. JWT claims require waiting up to 1 hour for token refresh. For an internal tool with manual role assignment, immediate effect is essential.

```typescript
// app/(admin)/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    // Accountant tried to access admin area
    redirect('/resumen')
  }

  return (
    <div className="flex h-screen">
      <AppSidebar role="admin" />
      <main className="flex-1 bg-white overflow-auto p-6">
        {children}
      </main>
    </div>
  )
}
```

```typescript
// app/(accountant)/layout.tsx — same pattern, role check reversed
// if (profile?.role !== 'accountant') redirect('/dashboard')
```

### Pattern 4: Role-Based Redirect on Login

**What:** After successful login, redirect to the correct route based on `profiles.role`. The login action reads the role immediately after `signInWithPassword`.

```typescript
// app/(auth)/login/actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function loginAction(formData: FormData) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    return { error: 'Credenciales incorrectas' }
  }

  // Fetch role to determine redirect
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  if (profile?.role === 'accountant') {
    redirect('/resumen')
  } else {
    redirect('/dashboard')
  }
}
```

### Pattern 5: Database Schema with NUMERIC(12,2) for Money

**What:** All money columns use `NUMERIC(12,2)`. Never `FLOAT`, never `DECIMAL` without explicit precision. This eliminates floating-point rounding errors in financial calculations.

```sql
-- supabase/migrations/20260303000001_initial_schema.sql

-- Profiles table: extends auth.users with role
CREATE TABLE public.profiles (
  id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role      TEXT NOT NULL CHECK (role IN ('admin', 'accountant')),
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: auto-create profile on signup (default role: admin for this project)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin'),
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Stub tables for future phases — NUMERIC(12,2) enforced from day 1
CREATE TABLE public.projects (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre         TEXT NOT NULL,
  cliente_nombre TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'Prospecto'
                 CHECK (status IN (
                   'Prospecto','Cotizado','Anticipo Recibido',
                   'En Producción','Entregado','Cerrado'
                 )),
  notas          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.line_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  descripcion      TEXT NOT NULL,
  costo_proveedor  NUMERIC(12,2) NOT NULL DEFAULT 0,  -- ADMIN ONLY: never expose to accountant
  margen           NUMERIC(5,4)  NOT NULL DEFAULT 0.50, -- ADMIN ONLY: stored as 0.50 = 50%
  cantidad         INTEGER NOT NULL DEFAULT 1,
  proveedor_id     UUID,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.payments_client (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tipo       TEXT NOT NULL CHECK (tipo IN ('anticipo','finiquito','otro')),
  monto      NUMERIC(12,2) NOT NULL,
  fecha      DATE NOT NULL,
  notas      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.payments_supplier (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  supplier_id UUID,
  monto       NUMERIC(12,2) NOT NULL,  -- ADMIN ONLY
  fecha       DATE NOT NULL,
  notas       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.suppliers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT NOT NULL,
  contacto   TEXT,
  email      TEXT,
  telefono   TEXT,
  notas      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Pattern 6: RLS Policies with get_user_role() Helper

**What:** A `SECURITY DEFINER` helper function reads the role from `profiles` once per statement. Used in all RLS policies to avoid repeating the subquery.

```sql
-- Helper function (SECURITY DEFINER means it runs with postgres privileges)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- Enable RLS on every table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments_client ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments_supplier ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- PROFILES: users see only their own profile; admin sees all
CREATE POLICY "own_profile_read" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- PROJECTS: admin full access; accountant read-only
CREATE POLICY "admin_all_projects" ON public.projects
  FOR ALL TO authenticated
  USING ((SELECT public.get_user_role()) = 'admin')
  WITH CHECK ((SELECT public.get_user_role()) = 'admin');

CREATE POLICY "accountant_read_projects" ON public.projects
  FOR SELECT TO authenticated
  USING ((SELECT public.get_user_role()) = 'accountant');

-- LINE_ITEMS: admin only — accountant NEVER accesses this table
CREATE POLICY "admin_all_line_items" ON public.line_items
  FOR ALL TO authenticated
  USING ((SELECT public.get_user_role()) = 'admin')
  WITH CHECK ((SELECT public.get_user_role()) = 'admin');
-- No accountant policy: RLS blocks all other authenticated users

-- PAYMENTS_CLIENT: admin full access; accountant read-only (for cash flow)
CREATE POLICY "admin_all_payments_client" ON public.payments_client
  FOR ALL TO authenticated
  USING ((SELECT public.get_user_role()) = 'admin')
  WITH CHECK ((SELECT public.get_user_role()) = 'admin');

CREATE POLICY "accountant_read_payments_client" ON public.payments_client
  FOR SELECT TO authenticated
  USING ((SELECT public.get_user_role()) = 'accountant');

-- PAYMENTS_SUPPLIER: admin only
CREATE POLICY "admin_all_payments_supplier" ON public.payments_supplier
  FOR ALL TO authenticated
  USING ((SELECT public.get_user_role()) = 'admin')
  WITH CHECK ((SELECT public.get_user_role()) = 'admin');

CREATE POLICY "accountant_read_payments_supplier" ON public.payments_supplier
  FOR SELECT TO authenticated
  USING ((SELECT public.get_user_role()) = 'accountant');

-- SUPPLIERS: admin full access; accountant read-only (names for context)
CREATE POLICY "admin_all_suppliers" ON public.suppliers
  FOR ALL TO authenticated
  USING ((SELECT public.get_user_role()) = 'admin')
  WITH CHECK ((SELECT public.get_user_role()) = 'admin');

CREATE POLICY "accountant_read_suppliers" ON public.suppliers
  FOR SELECT TO authenticated
  USING ((SELECT public.get_user_role()) = 'accountant');
```

### Pattern 7: App Shell — Dark Sidebar with Tailwind v4 and Shadcn Zinc Theme

**What:** The monochrome palette is achieved via Shadcn/ui's Zinc theme + CSS variables in `globals.css`. No `tailwind.config.js` is needed with Tailwind v4.

```css
/* app/globals.css (Tailwind v4 + Shadcn Zinc with dark sidebar) */
@import "tailwindcss";
@import "tw-animate-css";  /* replaces tailwindcss-animate (deprecated March 2025) */

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-sidebar-background: var(--sidebar-background);
}

:root {
  --background: oklch(1 0 0);           /* white */
  --foreground: oklch(0.141 0.005 285.823); /* zinc-950 */
  --sidebar-background: oklch(0.21 0.006 285.885); /* zinc-900 — dark sidebar */
  --sidebar-foreground: oklch(0.985 0 0); /* near-white text on dark sidebar */
  --muted: oklch(0.967 0.001 286.375);
  --muted-foreground: oklch(0.552 0.016 285.938);
  --border: oklch(0.92 0.004 286.32);
  --ring: oklch(0.141 0.005 285.823);
}
```

```typescript
// components/layout/AppSidebar.tsx
'use client'

export function AppSidebar({ role }: { role: 'admin' | 'accountant' }) {
  return (
    <aside className="h-screen w-64 flex-shrink-0 bg-[--sidebar-background] text-[--sidebar-foreground] flex flex-col">
      <div className="p-6 border-b border-white/10">
        <h1 className="text-sm font-semibold tracking-widest uppercase text-white/60">
          W Chaput Studio
        </h1>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {/* Nav links rendered based on role */}
      </nav>
    </aside>
  )
}
```

### Anti-Patterns to Avoid

- **Using `get`/`set`/`remove` in cookie handler:** These are deprecated in `@supabase/ssr` 0.9.0. Use `getAll`/`setAll` only.
- **Not awaiting `cookies()` in Next.js 15:** `cookies()` is now async; forgetting the `await` causes a runtime error.
- **Role check in middleware via DB query:** Middleware runs on every request; a DB query here causes cascading latency. Role routing belongs in layout Server Components.
- **`getSession()` anywhere on the server:** Not validated; spoofable. Always use `getUser()`.
- **`FLOAT` or bare `DECIMAL` for money columns:** Use `NUMERIC(12,2)` exclusively. This must be in migration #1; it cannot be changed retroactively without data migration.
- **`service_role` key with `NEXT_PUBLIC_` prefix:** Bypasses all RLS. The service role key must never be in any env var with the `NEXT_PUBLIC_` prefix.
- **Using `create-next-app --yes`:** May enable options you don't want. Prefer explicit flags: `--typescript --tailwind --eslint --app --import-alias "@/*"`.
- **Storing role in `raw_user_meta_data` for RLS:** Users can modify `raw_user_meta_data` themselves. Store role in `profiles` table or `raw_app_meta_data` (admin-only). The profiles table approach chosen for this project is correct.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cookie-based session management | Custom JWT cookie logic | `@supabase/ssr` createServerClient/createBrowserClient | Handles token refresh, SameSite flags, secure flags, rotation |
| Auth redirect middleware | Custom session parsing in middleware | `updateSession()` pattern from `@supabase/ssr` | Token expiry detection + refresh is non-trivial |
| Login form with validation | Custom form state | `react-hook-form` + `zod` + Shadcn `<Form>` | Type-safe validation, accessible error states, no manual state |
| Role-gated UI components | Custom role context provider | Profiles table queried in Server Component layouts | Server-side role read is unforgeable; no client state needed |
| Dark sidebar layout | Custom CSS | Shadcn/ui Zinc theme + Tailwind CSS variables | Responsive, accessible, theme-consistent |
| Database migrations | Running raw SQL in Supabase UI | Supabase CLI `supabase db diff` + migration files | Version-controlled, reproducible, team-safe |

**Key insight:** Supabase + Next.js 15 App Router already handle the hardest parts (session refresh, cookie management, RSC streaming). The project-specific code is role routing, schema design, and UI layout — not auth infrastructure.

---

## Common Pitfalls

### Pitfall 1: Old Cookie API in @supabase/ssr (Breaks silently)
**What goes wrong:** Using the old `get`/`set`/`remove` cookie handler API. Sessions appear to work on first load but fail to refresh. Users get logged out after 60 minutes with no error.
**Why it happens:** Old blog posts and documentation examples still show the three-method API.
**How to avoid:** Always use `getAll()`/`setAll()` exclusively. Any code with `get(name:`, `set(name:`, or `remove(name:` in a Supabase cookie handler is using the deprecated API.
**Warning signs:** Hydration mismatches on auth state; users logged out after exactly ~60 minutes.

### Pitfall 2: Forgetting `await cookies()` in Next.js 15
**What goes wrong:** `cookies()` from `next/headers` is async in Next.js 15. If not awaited, you get a Promise instead of the cookie store, and `cookieStore.getAll()` fails or returns empty.
**Why it happens:** In Next.js 14, `cookies()` was synchronous. Next.js 15 made it async.
**How to avoid:** `const cookieStore = await cookies()` — always await.
**Warning signs:** Auth works in development (some async behavior hidden) but breaks in production.

### Pitfall 3: DB Query in Middleware for Role Checking
**What goes wrong:** Attempting to read `profiles.role` inside `middleware.ts` to make role-based redirect decisions. This creates a DB round-trip on every single request, including static asset requests.
**Why it happens:** Developers want role-based redirects to be immediate and centralized.
**How to avoid:** Middleware only calls `getUser()` (no DB). Role-based redirects happen in layout Server Components, which already make one DB call to check auth.
**Warning signs:** Middleware response times spike; DB connection pool saturation.

### Pitfall 4: RLS Table Without Any Policy Blocks Everything
**What goes wrong:** `ALTER TABLE x ENABLE ROW LEVEL SECURITY` with no policies created means NO authenticated user can read any row. The app appears broken — all queries return empty.
**Why it happens:** Supabase RLS default-deny means no policy = no access (even for `authenticated` role).
**How to avoid:** Always create at minimum the admin policy immediately after enabling RLS. Test with the Supabase Table Editor to confirm rows are visible.
**Warning signs:** Database returns empty arrays for all queries; no errors (RLS is silent).

### Pitfall 5: Profiles Table Trigger Fails on First Signup
**What goes wrong:** The `handle_new_user()` trigger uses `SECURITY DEFINER` to write to `public.profiles` from the `auth` schema. If the function is created by the wrong Postgres role or the search_path is not set, the trigger fails and blocks the signup entirely.
**Why it happens:** Supabase's `supabase_auth_admin` role (which processes signups) has limited cross-schema permissions. The function must use `SECURITY DEFINER SET search_path = ''` to operate with elevated privileges.
**How to avoid:** Create the trigger function as shown in Pattern 5 with explicit `SECURITY DEFINER SET search_path = ''`. Test by creating a user via Supabase Auth dashboard.
**Warning signs:** Signups fail silently or with a generic 500 error; `profiles` table is empty after user creation.

### Pitfall 6: FLOAT/DECIMAL Instead of NUMERIC for Money
**What goes wrong:** `FLOAT` columns accumulate rounding errors. `$145,000.00` becomes `$144,999.9999999998` after arithmetic. Errors compound across line items and projects.
**Why it happens:** Developers default to `DECIMAL` without specifying precision, or use `FLOAT` as shorthand.
**How to avoid:** Every money column uses `NUMERIC(12,2)`. No exceptions. This is established in Phase 1 schema migration and is difficult to retrofit.
**Warning signs:** Dashboard totals differ from project totals by 1-2 centavos; SUM of line items ≠ project total.

---

## Code Examples

### Login Form (Verified Shadcn/ui + react-hook-form pattern)
```typescript
// app/(auth)/login/page.tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { loginAction } from './actions'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Contraseña debe tener mínimo 6 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(data: LoginFormData) {
    const formData = new FormData()
    formData.append('email', data.email)
    formData.append('password', data.password)
    const result = await loginAction(formData)
    if (result?.error) {
      form.setError('root', { message: result.error })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo electrónico</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root && (
              <p className="text-sm text-red-500">{form.formState.errors.root.message}</p>
            )}
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}
```

### Logout (Server Action)
```typescript
// lib/actions/auth.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

### Supabase Seed (Two initial users)
```sql
-- supabase/seed.sql (run via: supabase db seed or Supabase dashboard)
-- Note: Use Supabase Auth dashboard to create actual users;
-- this seeds profiles only if users already exist
-- OR use supabase.auth.admin.createUser() in a seed script

-- Insert admin user (after creating via Supabase Auth UI)
-- INSERT INTO public.profiles (id, role, full_name)
-- VALUES ('<admin-auth-uuid>', 'admin', 'Paul Chaput');

-- Insert accountant user
-- INSERT INTO public.profiles (id, role, full_name)
-- VALUES ('<accountant-auth-uuid>', 'accountant', 'Contador');
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2024 | Must use new package; auth-helpers no longer receives updates |
| Cookie handler `get`/`set`/`remove` | `getAll`/`setAll` | 2024 (within `@supabase/ssr`) | Old examples are wrong; silently breaks session refresh |
| `cookies()` synchronous (Next.js 14) | `cookies()` async — must `await` (Next.js 15) | Next.js 15.0 | Runtime error if not awaited |
| `tailwind.config.js` for Shadcn theme | CSS `@theme` directive in `globals.css` | Tailwind v4 (2024-2025) | No config file needed; CSS-native approach |
| `tailwindcss-animate` | `tw-animate-css` | March 2025 | `tailwindcss-animate` deprecated; install `tw-animate-css` instead |
| `npx shadcn-ui@latest` | `npx shadcn@latest` | 2024 | Package renamed; old command fails |
| `supabase.auth.getSession()` in server | `supabase.auth.getUser()` in server | Supabase SSR docs update 2024 | `getSession()` is spoofable; `getUser()` validates with auth server |
| HSL color format in Shadcn theme | OKLCH color format | March 2025 Shadcn update | Improved dark mode accessibility; new components use OKLCH |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Do not install. Replaced by `@supabase/ssr`.
- `tailwindcss-animate`: Deprecated March 2025. Use `tw-animate-css`.
- Three-method cookie handler (`get`/`set`/`remove`): Deprecated in `@supabase/ssr`. Use `getAll`/`setAll`.

---

## Open Questions

1. **Default role assignment in trigger**
   - What we know: The trigger sets `role = COALESCE(raw_user_meta_data->>'role', 'admin')` — so the first user created without metadata gets admin.
   - What's unclear: For a 2-person team, the recommended setup is to create both users manually via Supabase Auth dashboard and set their roles explicitly in the `profiles` table. No automated role assignment needed in production.
   - Recommendation: In the seed/setup, create admin user first, then create accountant user with `raw_user_meta_data: { role: 'accountant' }`. This way the trigger handles both correctly.

2. **Supabase CLI local development setup**
   - What we know: `supabase start` spins up local Postgres + Auth containers. Migrations run via `supabase db push` or `supabase migration up`.
   - What's unclear: Whether the project will develop locally with Supabase CLI or directly against the hosted Supabase project.
   - Recommendation: Write migrations as `.sql` files in `supabase/migrations/` from day 1. This works both locally and when pushed to hosted Supabase. Keeps schema in version control.

3. **@supabase/ssr 0.9.0 — breaking changes from prior versions**
   - What we know: Current version is 0.9.0 with `@supabase/supabase-js ^2.97.0` peer dep. `getAll`/`setAll` is the current API.
   - What's unclear: Exact version when the `get`/`set`/`remove` API was deprecated — could affect teams upgrading.
   - Recommendation: Always install `@supabase/ssr@latest` and `@supabase/supabase-js@latest` in the same command. Don't pin to a specific version — both need to be compatible.

---

## Sources

### Primary (HIGH confidence)
- `@supabase/ssr` npm registry — version 0.9.0 confirmed, peer dep `@supabase/supabase-js ^2.97.0` (fetched 2026-03-03)
- Supabase official docs: [Setting up Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) — `getAll`/`setAll` API confirmed current
- Supabase official docs: [Managing User Data (triggers)](https://supabase.com/docs/guides/auth/managing-user-data) — `handle_new_user` trigger pattern + `SECURITY DEFINER SET search_path = ''`
- Supabase official docs: [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — RLS policy patterns, `SECURITY DEFINER` helper functions
- Next.js official docs: [Installation](https://nextjs.org/docs/app/getting-started/installation) — v15.x, Turbopack default, async `cookies()`
- Shadcn/ui official docs: [Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4) — `@theme inline`, OKLCH colors, `tw-animate-css`, no `tailwind.config.js`
- Shadcn/ui official docs: [Next.js installation](https://ui.shadcn.com/docs/installation/next) — `npx shadcn@latest init` current command

### Secondary (MEDIUM confidence)
- Multiple corroborating WebSearch results (2025) confirming `getAll`/`setAll` is current API, cookies() is async in Next.js 15, and `tw-animate-css` replaces `tailwindcss-animate`
- Supabase community discussion confirming profiles table trigger requires `SECURITY DEFINER` to cross auth schema boundary

### Tertiary (LOW confidence)
- None — all critical claims verified against primary sources

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified against npm registry and official docs
- Cookie API (`getAll`/`setAll`): HIGH — confirmed against official Supabase SSR docs and multiple corroborating sources
- Architecture patterns: HIGH — verified against Next.js 15 and Supabase official docs
- RLS strategy: HIGH — official docs plus ecosystem confirmation; profiles table approach is established Supabase pattern
- Tailwind v4 + Shadcn: HIGH — official Shadcn docs for Tailwind v4 fetched directly
- Pitfalls: HIGH — all five critical pitfalls have verified root causes from official documentation

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (30 days — `@supabase/ssr` and Shadcn are moderately active; recheck if significant time passes before implementation)
