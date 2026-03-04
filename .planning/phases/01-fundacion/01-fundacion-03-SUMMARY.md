---
phase: 01-fundacion
plan: "03"
subsystem: auth
tags: [supabase, react-hook-form, zod, next-server-actions, tailwind]

# Dependency graph
requires:
  - phase: 01-fundacion-01
    provides: Supabase schema with profiles table and role column
  - phase: 01-fundacion-02
    provides: Next.js scaffold with route groups, Supabase client factories, Shadcn components, CSS variables

provides:
  - Login form with email/password via react-hook-form + zod at /login
  - loginAction Server Action authenticating via Supabase with role-based redirect
  - logoutAction Server Action clearing session and redirecting to /login
  - AppSidebar component — dark zinc-900 sidebar with monochrome palette
  - SidebarNav component — role-aware navigation links with usePathname active state
  - Admin layout with AppSidebar (role=admin, full_name display)
  - Accountant layout with AppSidebar (role=accountant, full_name display)

affects: [02-proyectos, 03-pagos, 04-proveedores, 05-pdf, 06-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server Action returning { error } on failure, calling redirect() on success
    - react-hook-form + zod + Server Action pattern for authenticated forms
    - Role-based route protection in Next.js layout components (server-side)
    - form action={serverAction} pattern for logout (no JS required)

key-files:
  created:
    - app/(auth)/login/actions.ts
    - lib/actions/auth.ts
    - components/layout/AppSidebar.tsx
    - components/layout/SidebarNav.tsx
  modified:
    - app/(auth)/login/page.tsx
    - app/(admin)/layout.tsx
    - app/(accountant)/layout.tsx

key-decisions:
  - "loginAction returns { error: string } on failure and calls redirect() on success — TypeScript return type is Promise<{ error: string }> but redirect() throws internally (never returns)"
  - "AppSidebar is a Server Component; SidebarNav is a Client Component (needs usePathname for active state)"
  - "Logout uses form action={logoutAction} pattern — works without JavaScript, no onClick needed"
  - "Monochrome sidebar palette: bg-[--sidebar-background] zinc-900, text-[--sidebar-foreground] near-white, active item bg-white/10 — zero color accents"

patterns-established:
  - "Server Action pattern: 'use server', return { error } on failure, redirect() on success"
  - "Layout-level auth guard: getUser() + profiles role query + redirect() before rendering"
  - "Role-aware component: UserRole prop switches nav items (admin vs accountant)"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, UX-03, UX-04]

# Metrics
duration: 4min
completed: 2026-03-04
---

# Phase 01 Plan 03: Auth Flow and Dark Sidebar Summary

**Supabase-backed login/logout flow with role-based redirect and dark zinc-900 sidebar app shell using react-hook-form + Server Actions**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-04T13:51:57Z
- **Completed:** 2026-03-04T13:55:36Z
- **Tasks:** 2 of 3 complete (checkpoint awaiting human verification)
- **Files modified:** 7

## Accomplishments
- Login form with react-hook-form + zod validation, inline error display without page reload
- loginAction Server Action authenticating via Supabase signInWithPassword, profiles role query, role-based redirect
- logoutAction Server Action with signOut and redirect to /login
- AppSidebar dark zinc-900 sidebar component with monochrome palette (UX-04 compliant)
- SidebarNav role-aware navigation with usePathname active state (admin: Proyectos/Proveedores/Dashboard, accountant: Resumen only)
- Admin and accountant layouts wired to real AppSidebar with full_name display

## Task Commits

Each task was committed atomically:

1. **Task 1: Login Server Action, login page form, and logout action** - `f00bb28` (feat)
2. **Task 2: Dark sidebar component and wire into admin and accountant layouts** - `e8f9731` (feat)
3. **Task 3: Checkpoint — human verification** — awaiting checkpoint approval

## Files Created/Modified
- `app/(auth)/login/actions.ts` - loginAction Server Action: signInWithPassword + profiles role query + redirect
- `app/(auth)/login/page.tsx` - Full login form: react-hook-form + zod + loginAction + inline error display
- `lib/actions/auth.ts` - logoutAction: signOut + redirect('/login')
- `components/layout/AppSidebar.tsx` - Dark sidebar shell: zinc-900 background, logout form action
- `components/layout/SidebarNav.tsx` - Role-aware nav links with usePathname active state
- `app/(admin)/layout.tsx` - Replaced placeholder sidebar with AppSidebar (role=admin, full_name)
- `app/(accountant)/layout.tsx` - Replaced placeholder sidebar with AppSidebar (role=accountant, full_name)

## Decisions Made
- loginAction TypeScript return type is `Promise<{ error: string }>` — redirect() throws internally so the type is satisfied even though redirect never returns
- AppSidebar is a Server Component; SidebarNav extracted as Client Component solely for usePathname access
- Logout implemented via HTML form action (no onClick) — works without JavaScript
- Monochrome palette enforced: only white/black/gray/opacity utilities in sidebar (UX-04 compliant)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Prerequisites for checkpoint verification:
- Supabase project must have migration applied and two users created (admin + accountant) per supabase/seed.sql instructions
- .env.local must contain NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
- Run `npm run dev` to start development server

## Next Phase Readiness

After checkpoint approval, Phase 1 (Fundacion) is complete. Phase 2 (Proyectos) can begin.

Checkpoint verification steps (12 steps):
1. Open http://localhost:3000 — unauthenticated redirect to /login
2. Attempt wrong password — "Credenciales incorrectas" inline, no page reload
3. Login as admin — redirect to /dashboard
4. Verify sidebar: dark zinc, "W Chaput Studio", Proyectos/Proveedores/Dashboard nav, user name, "Cerrar sesión"
5. Hard refresh (Cmd+Shift+R) — still on /dashboard (session persisted)
6. Navigate to /resumen — redirect back to /dashboard (accountant route blocked)
7. Click "Cerrar sesión" — redirect to /login
8. Login as accountant — redirect to /resumen
9. Verify accountant sidebar shows only "Resumen" nav item
10. Navigate to /dashboard — redirect to /resumen
11. Verify monochrome palette: no color accents anywhere in the shell
12. All steps pass — type "aprobado"

---
*Phase: 01-fundacion*
*Completed: 2026-03-04*
