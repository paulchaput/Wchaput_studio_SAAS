-- supabase/migrations/20260306000005_line_item_costs.sql
-- Phase 7: Multi-Supplier Costing — Schema Migration
--
-- This migration:
--   1. Adds precio_venta column to line_items (direct admin input)
--   2. Creates line_item_costs join table (multi-supplier cost rows)
--   3. Backfills precio_venta from old formula: costo_proveedor / (1 - margen)
--   4. Migrates existing costo_proveedor rows into line_item_costs
--   5. Drops costo_proveedor, margen, and proveedor_id from line_items

BEGIN;

-- ============================================================
-- 1. Add precio_venta to line_items
-- ============================================================
ALTER TABLE public.line_items
  ADD COLUMN precio_venta NUMERIC(12,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.line_items.precio_venta IS 'ADMIN ONLY — direct user input sale price, never exposed to accountant role';

-- ============================================================
-- 2. Create line_item_costs table
-- ============================================================
CREATE TABLE public.line_item_costs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_item_id  UUID NOT NULL REFERENCES public.line_items(id) ON DELETE CASCADE,
  supplier_id   UUID NOT NULL REFERENCES public.suppliers(id),
  costo         NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (costo >= 0),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.line_item_costs IS 'ADMIN ONLY — per-supplier cost rows for a line item; replaces the old single costo_proveedor column on line_items';

-- ============================================================
-- 3. Enable RLS and create admin-only policy
-- ============================================================
ALTER TABLE public.line_item_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_line_item_costs" ON public.line_item_costs
  FOR ALL TO authenticated
  USING ((SELECT public.get_user_role()) = 'admin')
  WITH CHECK ((SELECT public.get_user_role()) = 'admin');

-- ============================================================
-- 4. Backfill precio_venta from old formula: costo / (1 - margen)
--    When margen >= 1, fall back to costo_proveedor as the price
--    (edge case: theoretically should not happen, but guard against it)
-- ============================================================
UPDATE public.line_items
SET precio_venta = CASE
  WHEN margen >= 1 THEN costo_proveedor
  ELSE ROUND(costo_proveedor / NULLIF(1 - margen, 0), 2)
END;

-- ============================================================
-- 5. Migrate cost data into line_item_costs
--    Only rows that have a supplier and a non-zero cost
-- ============================================================
INSERT INTO public.line_item_costs (line_item_id, supplier_id, costo)
SELECT id, proveedor_id, costo_proveedor
FROM public.line_items
WHERE proveedor_id IS NOT NULL
  AND costo_proveedor > 0;

-- ============================================================
-- 6. Drop old columns from line_items
-- ============================================================
ALTER TABLE public.line_items DROP COLUMN costo_proveedor;
ALTER TABLE public.line_items DROP COLUMN margen;
ALTER TABLE public.line_items DROP COLUMN proveedor_id;

COMMIT;
