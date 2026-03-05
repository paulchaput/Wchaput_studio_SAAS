-- Add gran_total column to projects so accountant role can read it
-- without needing access to line_items (which RLS blocks for accountant)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS gran_total NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Backfill existing projects: gran_total stays 0 for now
-- (it will be updated next time any line item is mutated)
-- Admin can regenerate by editing/saving any line item on each project
COMMENT ON COLUMN public.projects.gran_total IS
  'Cached grand total (IVA included) computed from line_items. Updated by line item Server Actions. Readable by accountant role without accessing line_items.';
