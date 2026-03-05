-- Backfill Phase 4 checklist tasks for projects created before Phase 4
-- Idempotent: only inserts where no checklist tasks exist for the project
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.projects WHERE id NOT IN (
    SELECT DISTINCT project_id FROM public.checklist_tasks
  )
  LOOP
    INSERT INTO public.checklist_tasks (project_id, fase, nombre, sort_order, status)
    VALUES
      (r.id, 'Comercial', 'Reunión inicial con cliente', 0, 'Pendiente'),
      (r.id, 'Comercial', 'Levantamiento de necesidades', 1, 'Pendiente'),
      (r.id, 'Comercial', 'Cotización enviada', 2, 'Pendiente'),
      (r.id, 'Comercial', 'Anticipo recibido', 3, 'Pendiente'),
      (r.id, 'Comercial', 'Contrato firmado', 4, 'Pendiente'),
      (r.id, 'Comercial', 'Fecha de entrega confirmada', 5, 'Pendiente'),
      (r.id, 'Comercial', 'Expediente del cliente abierto', 6, 'Pendiente'),
      (r.id, 'Diseño y Especificaciones', 'Planos o renders aprobados por cliente', 7, 'Pendiente'),
      (r.id, 'Diseño y Especificaciones', 'Materiales y acabados definidos', 8, 'Pendiente'),
      (r.id, 'Diseño y Especificaciones', 'Órdenes de compra enviadas a proveedores', 9, 'Pendiente'),
      (r.id, 'Diseño y Especificaciones', 'Recepción de materiales confirmada', 10, 'Pendiente'),
      (r.id, 'Diseño y Especificaciones', 'Control de calidad en materiales', 11, 'Pendiente'),
      (r.id, 'Diseño y Especificaciones', 'Especificaciones técnicas entregadas a producción', 12, 'Pendiente'),
      (r.id, 'Producción', 'Corte de materiales', 13, 'Pendiente'),
      (r.id, 'Producción', 'Armado de estructura', 14, 'Pendiente'),
      (r.id, 'Producción', 'Aplicación de acabados', 15, 'Pendiente'),
      (r.id, 'Producción', 'Control de calidad intermedio', 16, 'Pendiente'),
      (r.id, 'Producción', 'Tapizado o revestimiento', 17, 'Pendiente'),
      (r.id, 'Producción', 'Ensamblaje final', 18, 'Pendiente'),
      (r.id, 'Producción', 'Revisión dimensional', 19, 'Pendiente'),
      (r.id, 'Producción', 'Fotografías del producto terminado', 20, 'Pendiente'),
      (r.id, 'Producción', 'Aprobación interna antes de entrega', 21, 'Pendiente'),
      (r.id, 'Entrega y Cierre', 'Logística de entrega coordinada', 22, 'Pendiente'),
      (r.id, 'Entrega y Cierre', 'Instalación en sitio', 23, 'Pendiente'),
      (r.id, 'Entrega y Cierre', 'Revisión final con cliente', 24, 'Pendiente'),
      (r.id, 'Entrega y Cierre', 'Finiquito recibido', 25, 'Pendiente'),
      (r.id, 'Entrega y Cierre', 'Factura / comprobante emitido', 26, 'Pendiente'),
      (r.id, 'Entrega y Cierre', 'Pagos a proveedores liquidados', 27, 'Pendiente'),
      (r.id, 'Entrega y Cierre', 'Expediente cerrado en sistema', 28, 'Pendiente'),
      (r.id, 'Entrega y Cierre', 'Retroalimentación del cliente obtenida', 29, 'Pendiente');
  END LOOP;
END $$;
