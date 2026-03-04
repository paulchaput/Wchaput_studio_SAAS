# Stack Research

**Domain:** Full-stack internal project management web app (fabrication studio)
**Researched:** 2026-03-03
**Confidence:** MEDIUM — Next.js version confirmed via official docs; Supabase, Shadcn, Recharts, React PDF from training knowledge (cutoff Aug 2025) + ecosystem patterns. WebSearch/WebFetch blocked during research session; flag items marked LOW for phase-level re-verification.

---

## Context

This stack is non-negotiable per PROJECT.md constraints. Research focuses on:
1. Current stable versions as of early 2026
2. Integration patterns specific to this combination
3. Configuration gotchas for the App Router + Supabase + PDF generation combination
4. RLS patterns for admin vs accountant role separation

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 15.x (latest) | Full-stack React framework | App Router is now the canonical approach; Turbopack is the default dev bundler as of Next.js 15. The `--yes` flag on `create-next-app` enables TypeScript, Tailwind, ESLint, App Router, and Turbopack automatically. Use `next@latest`. |
| React | 19.x | UI component layer | Next.js App Router bundles React canary/stable releases. React 19 is stable; use whatever `next@latest` pins. Do NOT manage React version independently. |
| TypeScript | 5.x (5.3+) | Type safety | Minimum required by Next.js is v5.1. Use 5.3+ for `const` type parameters and improved inference. Configured automatically by `create-next-app`. |
| Supabase (Postgres) | Cloud hosted (latest) | Primary database, relational data, RLS | Managed Postgres with built-in RLS at the database level. Eliminates a separate auth service. Tight integration with Next.js via `@supabase/ssr`. |
| Supabase Auth | Bundled with Supabase | Authentication + session management | Email/password auth sufficient for 2-person internal tool. JWT-based. Works with SSR via cookie-based sessions using `@supabase/ssr`. |
| Tailwind CSS | 4.x | Utility-first CSS | Installed by `create-next-app --yes`. v4 uses CSS-native configuration (no `tailwind.config.js` required); breaking change from v3 — use v4 patterns. |
| Shadcn/ui | Latest CLI | Accessible component primitives | Not a package — components are copied into your codebase via CLI. Built on Radix UI + Tailwind. Requires Tailwind 4 config alignment (see gotchas). |
| Recharts | 2.x (2.12+) | Data visualization charts | React-native charting. Works in Client Components only. Keep chart wrappers in `'use client'` files. |
| React PDF (`@react-pdf/renderer`) | 3.x (3.4+) | PDF document generation | Server-safe rendering to PDF buffer. Do NOT use `react-pdf` (the viewer); use `@react-pdf/renderer` (the generator). |
| Vercel | — | Hosting + deployment | Zero-config for Next.js. Edge runtime + serverless functions align with App Router. Vercel environment variables feed `NEXT_PUBLIC_SUPABASE_URL` etc. |

---

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@supabase/supabase-js` | 2.x | Supabase JS client | Core client — always used. |
| `@supabase/ssr` | 0.5+ | Cookie-based sessions for SSR/App Router | Required for App Router. Replaces deprecated `@supabase/auth-helpers-nextjs`. |
| `date-fns` | 3.x | Date formatting and parsing | Use for DD/MMM/YYYY formatting and date arithmetic. Lightweight, tree-shakeable. Do NOT use moment.js. |
| `zod` | 3.x | Schema validation | Validate form inputs and API payloads at the boundary. Pair with `react-hook-form`. |
| `react-hook-form` | 7.x | Form state management | Uncontrolled forms with Zod resolver. Less re-renders than Formik. |
| `@hookform/resolvers` | 3.x | Connects Zod to react-hook-form | Required for `zodResolver`. |
| `lucide-react` | Latest | Icon library | Default icon set for Shadcn/ui. Use consistently — don't mix with heroicons. |
| `clsx` + `tailwind-merge` | Latest | Conditional class composition | Shadcn components use this pattern (`cn()` utility). Install both. |
| `sonner` | 1.x | Toast notifications | Shadcn/ui recommended toast. Replaces the built-in Shadcn toast. |
| `@tanstack/react-query` | 5.x | Server state / data fetching | Optional but recommended for client-side data fetching, cache invalidation, and optimistic updates on forms. Use for mutations that need UI feedback. |
| `numeral` or `Intl.NumberFormat` | — | MXN currency formatting | Prefer native `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })` — no library needed. |

---

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| ESLint | Linting | `eslint.config.mjs` flat config format (Next.js 16+ no longer runs lint on `next build`). Enable strict mode. |
| Turbopack | Dev bundler | Default in Next.js 15. Do NOT use `--webpack` flag unless a dependency breaks. |
| Prettier | Code formatting | Add `prettier-plugin-tailwindcss` to auto-sort Tailwind classes. |
| Supabase CLI | Local dev + migrations | Run `supabase start` for local Postgres + Auth. Use `supabase db diff` for migration generation. |
| `dotenv-local` / `.env.local` | Environment secrets | Supabase URL + anon key go in `.env.local`. Never commit. Add to `.gitignore`. |

---

## Installation

```bash
# 1. Scaffold project (TypeScript, Tailwind, ESLint, App Router, Turbopack all enabled by default)
npx create-next-app@latest w-chaput-studio --yes

# 2. Supabase client + SSR helpers
npm install @supabase/supabase-js @supabase/ssr

# 3. Forms and validation
npm install react-hook-form @hookform/resolvers zod

# 4. Date utilities
npm install date-fns

# 5. Charting (client-side only)
npm install recharts

# 6. PDF generation
npm install @react-pdf/renderer

# 7. Shadcn/ui (CLI — copies components into your repo)
npx shadcn@latest init
# Choose: Default style, Zinc base color, CSS variables = yes

# 8. Add Shadcn components as needed
npx shadcn@latest add button card table dialog form input select badge

# 9. Supporting UI utilities
npm install lucide-react clsx tailwind-merge sonner

# 10. Optional: server state management
npm install @tanstack/react-query

# Dev dependencies
npm install -D prettier prettier-plugin-tailwindcss
npm install -D supabase  # Supabase CLI (local dev)
```

---

## Key Integration Patterns

### Pattern 1: Supabase + App Router — Server vs Client Client

**The single most important pattern.** There are TWO Supabase clients:

```typescript
// lib/supabase/server.ts — for Server Components, Route Handlers, Server Actions
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {} // Server Component reads are fine; writes throw in RSC (handled by middleware)
        },
      },
    }
  )
}

// lib/supabase/client.ts — for Client Components ('use client')
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Rule:** Server Components use `createServerClient` (reads session from cookies). Client Components use `createBrowserClient` (reads session from localStorage/cookies). Never import the server client in a Client Component.

---

### Pattern 2: Middleware for Session Refresh

```typescript
// middleware.ts (root of project)
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Refreshes auth token. Required for SSR sessions.
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

**Why:** Supabase JWT tokens expire every 60 minutes. Middleware refreshes the session cookie on every request so Server Components always get a valid session. Without this, users get randomly logged out.

---

### Pattern 3: Supabase RLS for Admin vs Accountant

This project has two roles: `admin` (full access, sees margins/costs) and `accountant` (read-only, never sees margins/profit).

#### Step 1: Store role in `auth.users` metadata or a `profiles` table

```sql
-- profiles table (created once in Supabase)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'accountant')),
  full_name TEXT
);

-- Automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (new.id, 'admin', new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

#### Step 2: Helper function for role checking in RLS

```sql
-- Reusable function — avoids repeating subqueries in every policy
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

#### Step 3: RLS policies per table

```sql
-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- PROJECTS: admin can do everything, accountant can read
CREATE POLICY "admin_full_access_projects" ON projects
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "accountant_read_projects" ON projects
  FOR SELECT TO authenticated
  USING (get_user_role() = 'accountant');

-- LINE_ITEMS: accountant sees sale price but NOT supplier cost or margin
-- Option A: RLS restricts table access, app layer filters columns
-- Option B: Create a VIEW for accountants that omits cost/margin columns

-- Recommended: VIEW approach for margin/cost hiding
CREATE VIEW accountant_line_items AS
  SELECT
    id, project_id, description, quantity, unit,
    sale_price, sale_total  -- intentionally omit: supplier_cost, margin_percent, cost_total
  FROM line_items;

-- Grant accountant role access only to the view
REVOKE SELECT ON line_items FROM authenticated;  -- prevent direct table access
GRANT SELECT ON accountant_line_items TO authenticated;  -- use view instead

-- Admin gets full table
CREATE POLICY "admin_full_line_items" ON line_items
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');
```

#### Step 4: Enforce role in Next.js (defense in depth)

```typescript
// app/(dashboard)/layout.tsx — server component
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch role from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Pass role via context or props to child server components
  // Never trust client-sent role claims — always read from DB
  return <div data-role={profile?.role}>{children}</div>
}
```

**Rule:** RLS is the security layer. The Next.js role check is UX (showing/hiding nav items). Never rely only on UI to hide sensitive data — RLS enforces it at the database level.

---

### Pattern 4: React PDF — Server-Side Generation

Use `@react-pdf/renderer` (NOT `react-pdf` which is a viewer). Generate PDFs in a Route Handler, return as `application/pdf`.

```typescript
// app/api/quotes/[id]/pdf/route.ts
import { renderToBuffer } from '@react-pdf/renderer'
import { QuoteDocument } from '@/components/pdf/QuoteDocument'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()

  // Fetch data — admin only (RLS enforces this)
  const { data: quote } = await supabase
    .from('projects')
    .select('*, line_items(*)')
    .eq('id', params.id)
    .single()

  if (!quote) return new Response('Not found', { status: 404 })

  // QuoteDocument must ONLY include client-facing fields (no costs, no margins)
  const buffer = await renderToBuffer(<QuoteDocument quote={quote} />)

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="cotizacion-${params.id}.pdf"`,
    },
  })
}
```

**Critical:** `@react-pdf/renderer` does NOT use standard HTML/CSS — it uses its own layout engine (Yoga). `<View>`, `<Text>`, `<StyleSheet>` are its primitives. Tailwind classes do NOT work inside PDF documents. Define styles with `StyleSheet.create()`.

**Font loading:** Register custom fonts at module level:
```typescript
import { Font } from '@react-pdf/renderer'
Font.register({ family: 'Inter', src: '/fonts/Inter-Regular.ttf' })
```
Store fonts in `/public/fonts/`. Next.js serves them statically.

---

### Pattern 5: Recharts in App Router

Recharts requires a browser environment. All chart components must be Client Components:

```typescript
// components/charts/RevenueChart.tsx
'use client'  // REQUIRED — Recharts uses browser APIs

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface RevenueChartProps {
  data: { month: string; revenue: number; cost: number; profit: number }[]
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
        <Tooltip formatter={(v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v)} />
        <Bar dataKey="revenue" fill="#18181b" name="Venta" />
        <Bar dataKey="cost" fill="#71717a" name="Costo" />
        <Bar dataKey="profit" fill="#3f3f46" name="Utilidad" />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

**Pattern:** Keep data fetching in Server Components. Pass data as props to the `'use client'` chart wrapper. This keeps Server Components as the data layer and Client Components purely presentational.

---

### Pattern 6: Shadcn/ui with Tailwind 4

Shadcn/ui components are copied into your project via CLI. Configuration differences with Tailwind 4:

- Tailwind 4 uses CSS-based config (`@import "tailwindcss"` in CSS, no `tailwind.config.js`)
- Shadcn v2+ supports Tailwind 4 natively — use `npx shadcn@latest init` (not `shadcn-ui`)
- Component styles use CSS variables for theming — defined in `app/globals.css`
- The `cn()` utility (in `lib/utils.ts`) is: `import { clsx } from 'clsx'; import { twMerge } from 'tailwind-merge'; export function cn(...inputs) { return twMerge(clsx(inputs)) }`

**Design system for W Chaput Studio:** Dark sidebar + white content + monochrome palette maps to Shadcn's Zinc color theme. Set `--sidebar-background: #18181b` (zinc-900) in globals.css.

---

### Pattern 7: MXN Currency Formatting (No Library Needed)

```typescript
// lib/format.ts
export function formatMXN(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(amount)
  // Output: $1,234.56 (note: Mexican locale uses $ not MX$)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'dd/MMM/yyyy', { locale: es }).toUpperCase()
  // Output: 03/MAR/2026
  // Requires: import { format } from 'date-fns'; import { es } from 'date-fns/locale'
}
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js App Router | Next.js Pages Router | Only if team has existing Pages Router code; App Router is the future and required for this stack |
| `@supabase/ssr` | `@supabase/auth-helpers-nextjs` | Never — auth-helpers is deprecated; `@supabase/ssr` is the current package |
| `@react-pdf/renderer` | Puppeteer / headless Chrome | Only if you need pixel-perfect HTML-to-PDF; puppeteer is heavy (50MB+) and needs Chrome binary on server |
| `@react-pdf/renderer` | `pdfmake` | Only for very simple text-only PDFs; react-pdf has better React integration |
| Recharts | Chart.js / react-chartjs-2 | If you need more chart types or canvas-based output; Recharts is simpler for React |
| Recharts | Victory | Victory has better animation support but larger bundle; Recharts is sufficient here |
| Shadcn/ui | Chakra UI / MUI | Only if you need more pre-built complex components; Shadcn gives more control and aligns with Tailwind |
| Zod + react-hook-form | Formik + Yup | react-hook-form is lighter and more performant; Zod is better TypeScript inference than Yup |
| date-fns | Moment.js | Never use Moment.js — it is in maintenance-only mode and bundles entire locale data |
| date-fns | Luxon | date-fns is more tree-shakeable; Luxon is fine if you prefer its API |
| Tailwind 4 | Tailwind 3 | Do not use v3 for a greenfield project — v4 is current; v3 patterns (tailwind.config.js) are different |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@supabase/auth-helpers-nextjs` | Deprecated as of 2024; no longer maintained | `@supabase/ssr` |
| `react-pdf` | This is the PDF VIEWER package — cannot generate PDFs | `@react-pdf/renderer` |
| `moment.js` | Maintenance-only, 68KB minified, mutable API, poor tree-shaking | `date-fns` |
| `tailwind.config.js` patterns | Tailwind 4 uses CSS-based config; config file approach is v3 | CSS `@import "tailwindcss"` + CSS variables |
| `getServerSideProps` / `getStaticProps` | Pages Router patterns; do not exist in App Router | Server Components with `async` functions + `fetch` |
| Client-side Supabase for sensitive data | Session may not be available; bypasses RLS context | Server Components + `createServerClient` |
| Inline PDF styles with Tailwind classes | Tailwind does not work inside `@react-pdf/renderer` — it has its own layout engine | `StyleSheet.create()` from `@react-pdf/renderer` |
| `export const dynamic = 'force-static'` on dashboard pages | Dashboard pages are user-specific; static generation leaks data or requires revalidation | Default dynamic rendering (no export needed) |
| `useEffect` for data fetching | Anti-pattern in App Router; creates waterfalls and bypasses server advantages | Server Components with async data fetching |

---

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| `next` | 15.x | React 19, TypeScript 5.x | Do not pin to Next.js 14 — it lacks some App Router stabilizations |
| `@supabase/ssr` | 0.5+ | `@supabase/supabase-js` 2.x | Both must be from Supabase v2 family |
| `@react-pdf/renderer` | 3.x | React 18/19 | v3 supports React 18+; check peer deps at install |
| `recharts` | 2.x | React 18/19 | Recharts 3.x is in development; use 2.x stable |
| `shadcn` CLI | Latest | Tailwind 4, Next.js 15 | Run `npx shadcn@latest` not `npx shadcn-ui@latest` (old package name) |
| Tailwind CSS | 4.x | Next.js 15 | Tailwind 4 ships with `@tailwindcss/vite` / PostCSS plugin; Next.js 15 supports it |
| `date-fns` | 3.x | — | v3 is ESM-first; tree-shakeable; breaking changes from v2 (import paths changed) |
| `react-hook-form` | 7.x | React 18/19, Zod 3.x | Use `@hookform/resolvers` 3.x for zodResolver |

---

## Stack Patterns by Variant

**If data is user-specific and sensitive (margins, costs, profit splits):**
- Use Server Components for data fetching
- Enforce RLS at the database level
- Never pass via URL params or expose in client bundles
- Admin-only Server Actions for mutations

**If data is needed interactively (form autosave, real-time totals):**
- Use Client Components with controlled inputs
- Calculate totals on the client for instant feedback
- Persist via Server Actions (not direct Supabase calls from client)
- Example: line item margin input → immediate price recalculation → save button → Server Action

**If generating a PDF:**
- Always use Route Handler (`app/api/*/route.ts`) on the server
- Never stream PDF from a Client Component
- Auth-check at Route Handler start before fetching data
- Return `application/pdf` with `Content-Disposition: attachment`

**If adding a chart to the dashboard:**
- Fetch data in a Server Component (parent)
- Pass data as serializable props to `'use client'` chart component
- Wrap chart in `<Suspense>` with a skeleton fallback

---

## Environment Variables

```bash
# .env.local (never commit)
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]

# Note: NEXT_PUBLIC_ prefix exposes to browser.
# Anon key is safe to expose — RLS enforces security.
# Never put service_role key in NEXT_PUBLIC_ variables.

# Optional: for server-only operations (migrations, admin tasks)
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]  # Server only, no NEXT_PUBLIC_ prefix
```

---

## Sources

- **Next.js official docs** (https://nextjs.org/docs/app/getting-started/installation, fetched 2026-03-03): Version 15.x confirmed, Turbopack default, `create-next-app --yes` defaults. Confidence: HIGH.
- **Supabase SSR docs patterns** (https://supabase.com/docs/guides/auth/server-side/nextjs): Cookie-based session pattern with `@supabase/ssr`. Confidence: MEDIUM (training knowledge Aug 2025; WebFetch blocked during session).
- **Supabase RLS docs** (https://supabase.com/docs/guides/auth/row-level-security): RLS policy patterns for role-based access. Confidence: MEDIUM (training knowledge; verify against current Supabase docs before implementation).
- **React PDF docs** (https://react-pdf.org/): Route Handler generation pattern, `StyleSheet.create()` requirement. Confidence: MEDIUM (training knowledge).
- **Shadcn/ui docs** (https://ui.shadcn.com/docs/installation/next): CLI init pattern, Tailwind 4 compatibility. Confidence: MEDIUM (training knowledge; verify `shadcn@latest` vs `shadcn-ui@latest` naming at install time).
- **Recharts docs** (https://recharts.org/en-US/): Client Component requirement, `ResponsiveContainer` pattern. Confidence: HIGH (stable API, training knowledge confirmed by ecosystem pattern).
- **Training knowledge** (cutoff Aug 2025): Zod, react-hook-form, date-fns, Intl.NumberFormat patterns. Confidence: MEDIUM.

---

## Confidence Assessment by Area

| Area | Confidence | Notes |
|------|------------|-------|
| Next.js version + App Router setup | HIGH | Official docs fetched 2026-03-03 confirming v15, Turbopack default |
| Supabase + SSR integration pattern | MEDIUM | Training knowledge Aug 2025; `@supabase/ssr` is the correct package — verify version at install |
| Supabase RLS role patterns | MEDIUM | Pattern is correct; specific SQL syntax should be validated against current Supabase docs |
| React PDF generation | MEDIUM | `@react-pdf/renderer` vs `react-pdf` distinction is critical and well-established |
| Recharts in App Router | MEDIUM-HIGH | `'use client'` requirement is architectural fact; API is stable |
| Shadcn/ui + Tailwind 4 | MEDIUM | Tailwind 4 is recent; verify Shadcn CLI compatibility at project start |
| MXN formatting | HIGH | `Intl.NumberFormat` is native browser API — no library risk |

---

*Stack research for: W Chaput Studio — Full-Stack Project Management Web App*
*Researched: 2026-03-03*
