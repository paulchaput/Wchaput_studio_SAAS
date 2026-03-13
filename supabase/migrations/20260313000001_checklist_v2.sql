-- Checklist v2: simplify to 3 phases, 9 milestones, add completed_at

-- 1. Add completed_at column
ALTER TABLE public.checklist_tasks
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Delete old tasks BEFORE changing constraints
DELETE FROM public.checklist_tasks;

-- 3. Update fase CHECK constraint to new phases
ALTER TABLE public.checklist_tasks DROP CONSTRAINT IF EXISTS checklist_tasks_fase_check;
ALTER TABLE public.checklist_tasks
  ADD CONSTRAINT checklist_tasks_fase_check
  CHECK (fase IN ('Cotización', 'Producción', 'Entrega'));

-- 4. Update status CHECK constraint
ALTER TABLE public.checklist_tasks DROP CONSTRAINT IF EXISTS checklist_tasks_status_check;
ALTER TABLE public.checklist_tasks
  ADD CONSTRAINT checklist_tasks_status_check
  CHECK (status IN ('Pendiente', 'Completado'));

INSERT INTO public.checklist_tasks (project_id, fase, nombre, status, sort_order)
SELECT
  p.id,
  seed.fase,
  seed.nombre,
  'Pendiente',
  seed.sort_order
FROM public.projects p
CROSS JOIN (VALUES
  ('Cotización',  'Cotización enviada',             1),
  ('Cotización',  'Anticipo recibido',              2),
  ('Cotización',  'Orden de compra a proveedores',  3),
  ('Producción',  'Materiales recibidos',           4),
  ('Producción',  'En producción',                  5),
  ('Producción',  'Control de calidad aprobado',    6),
  ('Entrega',     'Entregado / Instalado',          7),
  ('Entrega',     'Finiquito recibido',             8),
  ('Entrega',     'Expediente cerrado',             9)
) AS seed(fase, nombre, sort_order);

-- 7. Drop unused columns (assignee, due_date)
ALTER TABLE public.checklist_tasks DROP COLUMN IF EXISTS assignee;
ALTER TABLE public.checklist_tasks DROP COLUMN IF EXISTS due_date;
