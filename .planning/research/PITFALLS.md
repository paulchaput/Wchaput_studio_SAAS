# Pitfalls Research

**Domain:** Internal business management app (Next.js 14 App Router + Supabase + React PDF + Recharts)
**Researched:** 2026-03-03
**Confidence:** MEDIUM — Web search and WebFetch were unavailable during this session. Findings are based on training knowledge (cutoff August 2025) of this specific stack. All critical claims should be verified against official docs before implementation.

---

## Critical Pitfalls

### Pitfall 1: Floating-Point Currency Arithmetic Corrupts Financial Data

**What goes wrong:**
JavaScript's IEEE 754 floating-point arithmetic produces silent rounding errors in financial calculations. `0.1 + 0.2 === 0.30000000000000004`. When margin, sale price, IVA (16%), totals, and profit splits are all computed as floating-point numbers, small errors compound across line items and projects. A quote total displayed as `$145,000.00` may actually be `$144,999.99999999998` internally — correct in display but wrong in DB storage and downstream math.

**Why it happens:**
JavaScript numbers are 64-bit floats. Developers naturally use `number` for currency because it displays correctly in most simple cases. The bug only surfaces when numbers are summed across many line items, stored, retrieved, and re-summed — which is exactly the pattern in this app (partidas → project total → dashboard KPIs → profit split).

**How to avoid:**
Two acceptable approaches — pick one and enforce it throughout:

Option A (recommended for this app): Store all money as **integer centavos** in Postgres (`INTEGER` or `BIGINT`). Convert to display-friendly format only in the UI layer. `$1,500.00 MXN` is stored as `150000`. All arithmetic happens in integers.

Option B: Use Postgres `NUMERIC(15,2)` columns and push all financial calculations into SQL/database functions rather than JavaScript. Return formatted strings or pre-rounded values to the frontend.

**Never** mix approaches. Pick one in Phase 1 (schema design) and never deviate.

In TypeScript, define a branded type:
```typescript
type Centavos = number & { __brand: 'centavos' };
```
This prevents accidental mixing of centavos and pesos in function signatures.

**Warning signs:**
- Any line of code that does `price * 0.16` (IVA) or `cost / (1 - margin)` on a raw JS number
- Financial columns typed as `DECIMAL` or `FLOAT` in Supabase schema (use `NUMERIC` instead)
- Dashboard totals that differ by 1 centavo from sum of line items
- Unit tests for financial functions that don't test edge cases like `0.1 + 0.2`

**Phase to address:**
Phase 1 — Database schema. The column types and calculation strategy must be decided before a single line of application code touches money. Retrofitting is a painful migration.

---

### Pitfall 2: Supabase Service Role Key Exposed to the Browser

**What goes wrong:**
The Supabase `service_role` key bypasses ALL Row Level Security policies. If it's used in a client-side Supabase client (or bundled into Next.js in a way that exposes it to the browser), any user — including the accountant — can read any row in any table. RLS becomes security theater.

**Why it happens:**
Next.js environment variables prefixed with `NEXT_PUBLIC_` are bundled into the client-side JavaScript and visible in browser devtools. Developers sometimes create a single Supabase client with the service role key for convenience (to avoid writing RLS policies during development), then forget it's in the wrong place.

**How to avoid:**
- `SUPABASE_SERVICE_ROLE_KEY` must NEVER have the `NEXT_PUBLIC_` prefix
- `SUPABASE_SERVICE_ROLE_KEY` must ONLY be used in:
  - Next.js API Routes (`/app/api/...`)
  - Server Actions (`'use server'` functions)
  - Server Components that do not pass the client to child components
- Create two separate Supabase client factory functions:
  - `createServerClient()` — uses service role key, server-only, never imported in client components
  - `createBrowserClient()` — uses anon key, respects RLS
- Use Next.js `server-only` package to enforce this at compile time

```typescript
// lib/supabase/server.ts
import 'server-only'; // throws build error if imported in client component
import { createClient } from '@supabase/supabase-js';
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // no NEXT_PUBLIC_ prefix
);
```

**Warning signs:**
- Any `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` in `.env`
- A single shared Supabase client used in both server and client components
- RLS is disabled on any table "temporarily" during development and never re-enabled
- Supabase dashboard shows RLS as off for production tables

**Phase to address:**
Phase 1 — Auth and infrastructure setup. Establish the two-client pattern before any data fetching is written.

---

### Pitfall 3: Next.js App Router Supabase Session Desync (Auth Middleware Missing)

**What goes wrong:**
In Next.js App Router, the Supabase session is stored in cookies. Without a properly configured middleware that refreshes the session on every request, the session token expires silently. Users remain "logged in" in the UI (the cookie exists) but Supabase rejects their requests as unauthenticated. Server Components render as if no user is logged in. RLS policies reject queries. The app appears broken with no clear error.

**Why it happens:**
Supabase Auth uses short-lived JWTs with refresh tokens. The `@supabase/ssr` package requires a middleware to intercept requests, call `supabase.auth.getUser()` (not `getSession()`), and refresh the token before it reaches any Server Component. Developers who port older Supabase + Next.js pages-router patterns miss this requirement entirely.

**How to avoid:**
Use `@supabase/ssr` (not the deprecated `@supabase/auth-helpers-nextjs`). Implement `middleware.ts` at the project root that:
1. Creates a Supabase client from the request cookies
2. Calls `supabase.auth.getUser()` — this validates AND refreshes the token
3. Passes updated cookies to the response

Critical: use `getUser()`, NOT `getSession()`. `getSession()` reads from cookies without server-side validation, making it spoofable. `getUser()` validates against Supabase Auth server.

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  await supabase.auth.getUser(); // MUST call this to refresh token
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

**Warning signs:**
- Using `@supabase/auth-helpers-nextjs` (deprecated — should use `@supabase/ssr`)
- Calling `getSession()` in Server Components to check auth
- No `middleware.ts` in the project root
- Users getting logged out unexpectedly after 1 hour
- Server Component data fetching works on first load but fails after token expiry

**Phase to address:**
Phase 1 — Auth setup. Must be correct before any protected page is built.

---

### Pitfall 4: RLS Policies Missing for Accountant Role — Margin/Cost Data Leaks

**What goes wrong:**
The accountant role must NEVER see: supplier costs (`costo_proveedor`), margin percentages (`margen`), profit splits, or any column that reveals internal pricing. If RLS policies are written with `auth.role() = 'admin'` but the accountant can still query those columns (just without the admin role), the data is accessible via Supabase's REST API directly — bypassing the UI entirely.

**Why it happens:**
Developers implement role-based access in the UI (hide columns in React), but forget that Supabase's REST API and the PostgREST layer are always accessible. Anyone with the anon key can craft a direct query to `https://your-project.supabase.co/rest/v1/line_items?select=costo_proveedor` and get all costs if RLS isn't enforced at the database level.

**How to avoid:**
Enforce access at two levels:
1. **Database level (required):** Write explicit RLS policies on every sensitive column or use Postgres column-level security. The safest approach: use separate tables — `line_items_public` (sale price, description, IVA) and `line_items_private` (costs, margins) — with RLS on the private table restricting to admin role only.
2. **API level (defense in depth):** Server Actions that serve accountant requests should never `SELECT` sensitive columns, regardless of RLS.

For role-based RLS in Supabase, use `auth.jwt() ->> 'role'` from the JWT custom claims, set via a Postgres trigger or Supabase Auth hook when users are created.

```sql
-- Accountant can never read cost columns
CREATE POLICY "Admins only: line item costs"
  ON line_items
  FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');
```

**Warning signs:**
- Role enforcement only in React component conditionals (no DB-level policies)
- A single `line_items` table with both cost and price columns, no column-level security
- Supabase RLS policies that only check `auth.uid()` without role
- Manual testing of accountant role only through the UI, not through direct API calls

**Phase to address:**
Phase 1 (schema) and Phase 2 (auth + RLS policies). The table structure must accommodate role separation before data is added.

---

### Pitfall 5: React PDF Server vs. Client Rendering Confusion

**What goes wrong:**
`@react-pdf/renderer` renders PDFs using a custom React reconciler that runs in Node.js (server-side). It cannot render in the browser. If you import it into a Client Component or a page that Next.js decides to bundle client-side, you get one of: a blank PDF, a server crash, or a cryptic `window is not defined` error from PDF.js internals.

**Why it happens:**
Next.js 14 App Router runs Server Components on the server and Client Components in the browser. The boundary between them is determined by `'use client'` directives and import chains. Because React PDF uses Node.js APIs, any Client Component that imports it — even transitively — breaks. Developers often put PDF logic in a shared utility file that gets imported by both server and client code.

**How to avoid:**
PDF generation must live entirely in the server layer:
- Create a dedicated API Route: `/app/api/quotes/[id]/pdf/route.ts`
- This route runs on Node.js only — safe for React PDF
- Return the PDF as a response with `Content-Type: application/pdf`
- The client-side "Download PDF" button simply links to or fetches this API route

```typescript
// app/api/quotes/[id]/pdf/route.ts
import { renderToBuffer } from '@react-pdf/renderer';
import { QuoteDocument } from '@/components/pdf/QuoteDocument';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const quoteData = await fetchQuoteData(params.id);
  const buffer = await renderToBuffer(<QuoteDocument data={quoteData} />);
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="cotizacion-${params.id}.pdf"`,
    },
  });
}
```

The `QuoteDocument` component file must NOT have `'use client'` at the top. It must never be imported by any client component.

**Warning signs:**
- `@react-pdf/renderer` imported in any file with `'use client'`
- `window is not defined` errors in the browser console related to PDF generation
- PDF components that use React hooks (hooks don't work in React PDF's reconciler)
- Attempting to use `renderToString` or `renderToStaticMarkup` (React DOM methods) instead of `renderToBuffer` or `renderToStream`

**Phase to address:**
Phase 3 — Quote generation feature. Establish the API route pattern from the first PDF component written.

---

### Pitfall 6: Recharts SSR / Hydration Mismatch in App Router

**What goes wrong:**
Recharts components (especially `ResponsiveContainer`) measure the DOM to determine chart dimensions. In Next.js App Router with Server-Side Rendering, the server renders the chart at an unknown width (it has no browser DOM), and the client re-renders it at the actual window width. This causes React hydration errors: "Hydration failed because the initial UI does not match what was rendered on the server."

`ResponsiveContainer` in particular requires a parent element with a defined width in the browser, which doesn't exist during SSR.

**Why it happens:**
Recharts was designed for Create React App (pure client-side rendering). It uses `window` and DOM measurement APIs internally. Next.js App Router attempts to SSR everything by default.

**How to avoid:**
Mark all Recharts chart components with `'use client'`. Additionally, use `dynamic` import with `{ ssr: false }` for the entire chart wrapper component:

```typescript
// components/charts/RevenueChart.tsx — top of file
'use client';
// Recharts components go here

// components/dashboard/DashboardPage.tsx
import dynamic from 'next/dynamic';
const RevenueChart = dynamic(() => import('../charts/RevenueChart'), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded" />,
});
```

For `ResponsiveContainer`, ensure the parent div has an explicit height:
```tsx
<div style={{ width: '100%', height: 300 }}>
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data}>...</BarChart>
  </ResponsiveContainer>
</div>
```

**Warning signs:**
- Recharts imported in a Server Component (no `'use client'` directive)
- Hydration error messages in the browser console mentioning chart dimensions
- Charts that render correctly on first paint but flash/resize on hydration
- `ResponsiveContainer` with `height="100%"` inside a flex container with no explicit height

**Phase to address:**
Phase 4 — Dashboard and charts. Apply the `dynamic` import pattern from the first chart component.

---

### Pitfall 7: Calculated Fields — Store vs. Recompute on Read

**What goes wrong:**
Financial values like `precio_venta` (sale price), `total_partida` (line item total), `total_proyecto` (project total), and `utilidad` (profit) can be either stored in the database or computed from base values on read. Mixing these approaches creates consistency bugs: stored values become stale when inputs change, recomputed values are expensive to aggregate in dashboard queries, and the "source of truth" becomes ambiguous.

**Why it happens:**
Developers store `precio_venta` during quote creation for display, then also compute it in a dashboard query — and when the margin is later edited, one value updates and the other doesn't.

**How to avoid:**
Adopt a strict rule: **store only base inputs; compute derived values at read time.**

Base inputs (store these):
- `costo_proveedor` (supplier cost per line item)
- `margen` (margin percentage per line item)
- `cantidad` (quantity)

Never store (always compute):
- `precio_venta = costo_proveedor / (1 - margen)`
- `total_partida = precio_venta * cantidad`
- `subtotal_proyecto = SUM(total_partida)`
- `iva = subtotal * 0.16`
- `total_proyecto = subtotal + iva`

Implement these as **Postgres generated columns** (if they only depend on columns in the same row) or **database views** (for aggregates). This ensures the DB is always self-consistent regardless of which code path writes data.

```sql
-- Generated column: always consistent, never stale
ALTER TABLE line_items ADD COLUMN precio_venta_centavos INTEGER
  GENERATED ALWAYS AS (costo_proveedor_centavos / (1.0 - margen)) STORED;
```

**Warning signs:**
- `precio_venta` or `total` columns in the DB that are populated by application code
- Dashboard SQL queries that re-compute values differently than the quote screen
- A `recalculate()` function called before saving — indicates the calculation lives in app code rather than DB
- Discrepancy between a project's total on the project page vs. the dashboard

**Phase to address:**
Phase 1 — Schema design. Generated columns and views must be in the initial migration.

---

### Pitfall 8: Next.js Server Actions Without Auth Validation

**What goes wrong:**
Server Actions in Next.js App Router (`'use server'`) are powerful but they're just POST endpoints under the hood. Any user — including the accountant — can invoke any Server Action if they know its signature. If actions like `updateLineItemCost()` or `deleteProject()` don't verify the caller's role before executing, the accountant can perform admin-only mutations.

**Why it happens:**
Developers validate roles at the component level (only showing the "Edit Cost" button to admins) but forget that the Server Action itself is a public endpoint. The UI never shows the button, so it feels safe — but the endpoint is accessible.

**How to avoid:**
Every Server Action that mutates sensitive data must begin with an auth check:

```typescript
'use server';
import { createServerClient } from '@/lib/supabase/server';

export async function updateLineItemCost(lineItemId: string, newCost: number) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthenticated');

  const role = user.user_metadata?.role;
  if (role !== 'admin') throw new Error('Unauthorized: admin only');

  // proceed with update
}
```

Additionally, RLS policies on the DB provide a second layer — even if the action proceeds, the DB rejects unauthorized writes.

**Warning signs:**
- Server Actions that call `getSession()` instead of `getUser()` for auth (spoofable)
- Server Actions with no auth check at the top
- Role checks only in React component render logic
- No test verifying that accountant cannot invoke admin Server Actions

**Phase to address:**
Phase 2 — Auth and role enforcement. Establish the auth-check pattern in the first Server Action and use it as a template.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing `precio_venta` in DB as app-computed value | Simple to read | Stale values on margin edit; dual source of truth | Never — use generated columns |
| Using `FLOAT` instead of `NUMERIC` for money in Postgres | Slightly faster writes | Rounding errors compound in aggregates | Never for financial data |
| Single Supabase client with service role key everywhere | No RLS to write | Complete security bypass; any user reads all data | Never in production |
| Disabling RLS on a table "temporarily" | Faster to dev without policies | Forgotten, goes to production | Never — use `GRANT ALL TO authenticated` in dev instead |
| Calling `getSession()` instead of `getUser()` in middleware | Slightly faster (no network call) | Session can be spoofed from cookie; auth bypass | Never in middleware or Server Actions |
| Importing Recharts in Server Components | Simpler import structure | Hydration mismatch errors | Never — always wrap with `'use client'` |
| Calculating margins in React component render | Easy to prototype | Inconsistency between components; hard to test | MVP prototype only, refactor before first real data |
| No IVA in line item storage, add at display | Simpler schema | IVA rate changes require reprocessing all historical quotes | Never — store IVA rate alongside amounts |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Auth + App Router | Using `createClient` from `@supabase/supabase-js` directly in Server Components | Use `@supabase/ssr`'s `createServerClient` with cookie handlers |
| Supabase RLS + custom roles | Relying on `auth.role()` which returns `'authenticated'` not your custom role | Store custom role in `user_metadata` or JWT claims; access via `auth.jwt() ->> 'role'` |
| React PDF + Next.js | Importing `@react-pdf/renderer` in a shared utility imported by client components | Create a server-only API Route; use the `server-only` npm package as a guard |
| Recharts + Next.js App Router | Using `ResponsiveContainer` without `ssr: false` in dynamic import | Always `dynamic(() => import(...), { ssr: false })` for all Recharts components |
| Supabase Realtime + App Router | Subscribing to realtime channels in Server Components (impossible) | Realtime subscriptions only in Client Components; this project has declared no realtime needed |
| Vercel + Supabase | Forgetting to set environment variables in Vercel dashboard | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` all set in Vercel project settings |
| Supabase Storage + PDF | Storing generated PDFs in Supabase Storage without access control | Apply Storage policies so only admin can list/download; generate fresh on demand instead of caching |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| N+1 queries for dashboard: fetch projects then fetch line items per project in a loop | Dashboard slow to load; Supabase query logs show hundreds of queries | Use a single JOIN query or Supabase's `select('*, line_items(*)')` | At 5+ projects |
| Computing project totals in JS from fetched line items | Dashboard re-computation on every render; stale data | Compute totals in a Postgres view or `SUM` in the query | At 20+ line items |
| Fetching all projects for dashboard with all columns | Over-fetching; slow initial load | `SELECT` only columns needed for KPI cards | At 50+ projects |
| Regenerating PDFs synchronously in API route on every request | Slow PDF downloads; Vercel function timeout | Cache generated PDFs in Supabase Storage keyed by quote version hash | When PDFs > 500KB or > 10 concurrent users |
| Loading all payment history for supplier balance view | Memory usage; slow query | Paginate or use a running balance stored in DB | At 200+ payments |

Note: This app handles 4–8 active projects and 2 users. Most performance traps above won't manifest in production. Design to avoid N+1 queries from day one (it's a good habit, not a scale requirement). Don't over-optimize the rest.

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Margin/cost data in API response to accountant | Accountant sees internal pricing; business confidentiality breach | RLS at DB level; Server Actions for accountant never SELECT cost columns |
| PDF quote generation without auth check | Anyone with a project ID can download cost-free quotes (acceptable) but could also trigger resource exhaustion | Rate limit the PDF API Route; require authentication |
| IVA calculation exposed in PDF metadata | Client can inspect PDF metadata for internal calculation details | Strip all PDF metadata; use `@react-pdf/renderer` document props to omit author/subject |
| Storing sensitive data in `localStorage` | Persists across sessions; accessible to XSS | Never store auth tokens or financial data in localStorage; Supabase SSR handles cookies |
| User enumeration via login error messages | "Email not found" vs "Wrong password" reveals registered emails | Supabase Auth returns generic errors by default — don't override with specific messages |
| Service role key in git repository | Anyone with repo access has full DB access | `.env.local` in `.gitignore`; use Vercel environment variables for production |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No loading state for PDF generation | User clicks "Download" and nothing happens for 3-5 seconds; clicks again; gets duplicate downloads | Show spinner/disable button immediately; restore after download completes |
| Editing a line item cost with no visual confirmation that totals updated | Paul changes a cost, total doesn't visually update — he saves twice or loses trust in the numbers | Optimistic UI updates for totals on every keystroke; save on blur |
| Financial numbers without consistent formatting | `$145000` vs `$145,000.00` vs `145000.00` in different views | Single `formatMXN(centavos: number): string` utility used everywhere |
| Status pipeline displayed as text only | Hard to scan project status across 8 projects | Color-coded status badges; consistent across list and detail views |
| Mobile: tables with many financial columns | Horizontal scroll on phone; unusable | Responsive table: collapse to card view on mobile; show only key columns |
| "Cerrado" projects mixed with active in dashboard | Noise in KPIs; closed projects inflate revenue charts | Filter by status in all dashboard queries; closed projects only visible in archive view |
| No confirmation before deleting a project or payment | Accidental deletion with no undo | Confirmation dialog with project name entered; soft-delete with 30-day recovery |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Auth:** Often missing middleware that refreshes tokens — verify that logging in, navigating for 1+ hour, then performing an action still works without re-login
- [ ] **RLS:** Often "enabled" but with no policies (which blocks everything) or with an overly broad policy — verify accountant cannot read cost columns via direct Supabase REST call, not just via UI
- [ ] **PDF generation:** Often generates correctly in dev but fails in Vercel due to missing font files or Node.js version differences — verify PDF renders correctly in Vercel preview deployment
- [ ] **Financial totals:** Often correct for simple cases but wrong with IVA + margin combinations — verify: `costo=1000, margen=50% → precio_venta=2000, IVA=320, total=2320` matches DB and UI
- [ ] **Accountant role:** Often only hidden in UI — verify by calling the Server Actions/API Routes directly as an accountant-role user and confirming 403 responses
- [ ] **Currency formatting:** Often correct for whole numbers but wrong for zero or null — verify `null`, `0`, and `1500.50` all format correctly as `$0.00`, `$0.00`, `$1,500.50`
- [ ] **Purchase orders:** Often generates for all line items — verify it correctly filters to only the selected supplier's line items
- [ ] **Mobile responsive:** Often tested at 375px but broken at 414px (iPhone Plus) — test at multiple breakpoints and with real device via Vercel preview URL

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Floating-point currency stored incorrectly | HIGH | Write migration to convert all stored values to integer centavos; audit all calculations; re-test all financial outputs |
| Service role key exposed client-side | HIGH | Rotate key immediately in Supabase dashboard; audit access logs; deploy with corrected env vars |
| RLS misconfigured — accountant saw costs | HIGH | Fix RLS policies immediately; check Supabase logs for any accountant queries; notify affected parties |
| React PDF imports in client component | LOW | Move PDF logic to API Route; add `server-only` import guard; takes 1-2 hours |
| Recharts hydration errors | LOW | Add `'use client'` and `dynamic` import; takes 30 minutes per chart component |
| Stored computed values are stale | MEDIUM | Write a one-time migration script to recompute from base values; replace stored columns with generated columns going forward |
| Session desync — users logged out unexpectedly | MEDIUM | Implement correct middleware with `getUser()` refresh; takes 2-4 hours including testing |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Floating-point currency | Phase 1: Database schema | Schema review confirms `NUMERIC` or integer centavos columns; test with `0.1 + 0.2` edge cases |
| Service role key exposure | Phase 1: Project setup | `NEXT_PUBLIC_*` env audit; confirm service role key not in client bundle via `next build` output |
| Session desync (missing middleware) | Phase 1: Auth setup | Test: login, wait for token expiry (or manually expire), perform action — should auto-refresh |
| RLS role enforcement | Phase 2: Role-based access | Direct API call as accountant returns 403 on cost columns; UI-only access is insufficient verification |
| React PDF server/client boundary | Phase 3: Quote generation | PDF API Route test via `curl`; no client-side PDF imports in component tree |
| Recharts SSR hydration | Phase 4: Dashboard | No hydration errors in browser console; charts render on first paint without flash |
| Calculated fields consistency | Phase 1: Schema + Phase 2: Calculations | SQL-level test: update margin on line item, verify all derived totals update without app code running |
| Server Action auth bypass | Phase 2: Role enforcement | Integration test calling admin Server Actions with accountant JWT returns unauthorized error |

---

## Sources

- Supabase official documentation on RLS, Auth, and SSR patterns — HIGH confidence (training knowledge, August 2025 cutoff; verify current `@supabase/ssr` API at https://supabase.com/docs/guides/auth/server-side/nextjs)
- Next.js 14 App Router official documentation on Server/Client component boundaries — HIGH confidence (verify at https://nextjs.org/docs/app)
- `@react-pdf/renderer` GitHub repository and documentation — MEDIUM confidence (library has had breaking changes in v3.x; verify current API at https://react-pdf.org)
- Recharts SSR behavior — MEDIUM confidence (known community issue; verify current status with Next.js 14 at https://recharts.org)
- IEEE 754 floating-point arithmetic behavior in JavaScript — HIGH confidence (mathematical constant, not subject to library version changes)
- Financial calculation patterns (store vs. compute, integer cents) — HIGH confidence (industry-standard practice; see Martin Fowler's "Money" pattern)

**Note:** WebSearch and WebFetch were unavailable during this research session. All findings are from training knowledge (cutoff August 2025). Before implementing, verify:
1. Current `@supabase/ssr` API (cookie handler API changed in 2024)
2. Current `@react-pdf/renderer` v3.x API (`renderToBuffer` vs `renderToStream`)
3. Next.js 14 vs 15 compatibility if upgrading

---
*Pitfalls research for: W Chaput Studio — Next.js 14 + Supabase business management app*
*Researched: 2026-03-03*
