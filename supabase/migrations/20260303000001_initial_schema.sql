-- supabase/migrations/20260303000001_initial_schema.sql
-- W Chaput Studio — Initial Database Schema
-- Phase 1: Foundation — Tables, Triggers, RLS Policies
--
-- IMPORTANT: All money columns use NUMERIC(12,2). No FLOAT. No bare DECIMAL.
-- This cannot be changed retroactively without a data migration.

-- ============================================================
-- 1. PROFILES TABLE
-- Extends auth.users with role-based access control.
-- ============================================================

CREATE TABLE public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('admin', 'accountant')),
  full_name  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. HANDLE NEW USER TRIGGER
-- Auto-creates a profiles row when a user signs up via Supabase Auth.
-- MUST use SECURITY DEFINER SET search_path = '' to cross the auth
-- schema boundary — without this the trigger fails silently on signup.
-- ============================================================

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

-- ============================================================
-- 3. STUB TABLES FOR FUTURE PHASES
-- All money columns: NUMERIC(12,2) — zero exceptions.
-- Column names in Spanish per project conventions.
-- ============================================================

CREATE TABLE public.projects (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                  TEXT NOT NULL,
  cliente_nombre          TEXT NOT NULL,
  numero_cotizacion       TEXT,
  fecha_cotizacion        DATE,
  salesperson             TEXT,
  fecha_entrega_estimada  DATE,
  status                  TEXT NOT NULL DEFAULT 'Prospecto'
                          CHECK (status IN (
                            'Prospecto',
                            'Cotizado',
                            'Anticipo Recibido',
                            'En Producción',
                            'Entregado',
                            'Cerrado'
                          )),
  notas                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
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

CREATE TABLE public.line_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  descripcion      TEXT NOT NULL,
  referencia       TEXT,
  dimensiones      TEXT,
  cantidad         INTEGER NOT NULL DEFAULT 1,
  proveedor_id     UUID REFERENCES public.suppliers(id),
  costo_proveedor  NUMERIC(12,2) NOT NULL DEFAULT 0,
  margen           NUMERIC(5,4) NOT NULL DEFAULT 0.50,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN public.line_items.costo_proveedor IS 'ADMIN ONLY — never expose to accountant role';
COMMENT ON COLUMN public.line_items.margen IS 'ADMIN ONLY — stored as decimal e.g. 0.50 = 50%';

CREATE TABLE public.payments_client (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tipo       TEXT NOT NULL CHECK (tipo IN ('anticipo', 'finiquito', 'otro')),
  monto      NUMERIC(12,2) NOT NULL,
  fecha      DATE NOT NULL,
  notas      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.payments_supplier (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id),
  monto       NUMERIC(12,2) NOT NULL,
  fecha       DATE NOT NULL,
  notas       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. CHECKLIST TASKS TABLE (needed by Phase 4)
-- ============================================================

CREATE TABLE public.checklist_tasks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  fase       TEXT NOT NULL CHECK (fase IN (
               'Comercial',
               'Diseño y Especificaciones',
               'Producción',
               'Entrega y Cierre'
             )),
  nombre     TEXT NOT NULL,
  assignee   TEXT,
  due_date   DATE,
  status     TEXT NOT NULL DEFAULT 'Pendiente'
             CHECK (status IN (
               'Pendiente',
               'En Proceso',
               'Completado',
               'Bloqueado',
               'N/A'
             )),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. get_user_role() HELPER FUNCTION
-- SECURITY DEFINER STABLE: runs with postgres privileges and Postgres
-- can cache the result per statement, avoiding repeated profile lookups
-- per row in RLS policy evaluation.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- ============================================================
-- 6. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- RLS default-deny: no policy = no access (even for authenticated role).
-- All 7 tables are covered.
-- ============================================================

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments_client   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments_supplier ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_tasks   ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7. RLS POLICIES
-- Pattern: (SELECT public.get_user_role()) — the SELECT wrapper lets
-- Postgres cache the role lookup result per statement.
-- ============================================================

-- PROFILES: each user sees only their own profile row
CREATE POLICY "own_profile_read" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- PROJECTS: admin full CRUD, accountant read-only
CREATE POLICY "admin_all_projects" ON public.projects
  FOR ALL TO authenticated
  USING ((SELECT public.get_user_role()) = 'admin')
  WITH CHECK ((SELECT public.get_user_role()) = 'admin');

CREATE POLICY "accountant_read_projects" ON public.projects
  FOR SELECT TO authenticated
  USING ((SELECT public.get_user_role()) = 'accountant');

-- LINE_ITEMS: admin ONLY
-- Zero accountant policies = RLS default-deny blocks accountant entirely (AUTH-04)
CREATE POLICY "admin_all_line_items" ON public.line_items
  FOR ALL TO authenticated
  USING ((SELECT public.get_user_role()) = 'admin')
  WITH CHECK ((SELECT public.get_user_role()) = 'admin');

-- PAYMENTS_CLIENT: admin full CRUD, accountant read-only (needed for cash flow view)
CREATE POLICY "admin_all_payments_client" ON public.payments_client
  FOR ALL TO authenticated
  USING ((SELECT public.get_user_role()) = 'admin')
  WITH CHECK ((SELECT public.get_user_role()) = 'admin');

CREATE POLICY "accountant_read_payments_client" ON public.payments_client
  FOR SELECT TO authenticated
  USING ((SELECT public.get_user_role()) = 'accountant');

-- PAYMENTS_SUPPLIER: admin full CRUD, accountant read-only (payment totals only, not costs)
CREATE POLICY "admin_all_payments_supplier" ON public.payments_supplier
  FOR ALL TO authenticated
  USING ((SELECT public.get_user_role()) = 'admin')
  WITH CHECK ((SELECT public.get_user_role()) = 'admin');

CREATE POLICY "accountant_read_payments_supplier" ON public.payments_supplier
  FOR SELECT TO authenticated
  USING ((SELECT public.get_user_role()) = 'accountant');

-- SUPPLIERS: admin full CRUD, accountant read-only (names for context)
CREATE POLICY "admin_all_suppliers" ON public.suppliers
  FOR ALL TO authenticated
  USING ((SELECT public.get_user_role()) = 'admin')
  WITH CHECK ((SELECT public.get_user_role()) = 'admin');

CREATE POLICY "accountant_read_suppliers" ON public.suppliers
  FOR SELECT TO authenticated
  USING ((SELECT public.get_user_role()) = 'accountant');

-- CHECKLIST_TASKS: admin full CRUD, NO accountant policy (accountant blocked per CHEC-05)
CREATE POLICY "admin_all_checklist_tasks" ON public.checklist_tasks
  FOR ALL TO authenticated
  USING ((SELECT public.get_user_role()) = 'admin')
  WITH CHECK ((SELECT public.get_user_role()) = 'admin');

-- ============================================================
-- 8. SEED DEFAULT SUPPLIERS
-- Innovika and El Roble are required by Phase 3 (PROV-02).
-- Seeded at schema level to be immediately available.
-- ============================================================

INSERT INTO public.suppliers (nombre, notas) VALUES
  ('Innovika', 'Proveedor predeterminado'),
  ('El Roble', 'Proveedor predeterminado');
