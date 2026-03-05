// No 'use client' — Server Component
import { getAccountantProjectSummaries, getAccountantSupplierTotals } from '@/lib/queries/accountant'
import { formatMXN } from '@/lib/formatters'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
// No Server Actions imported, no form actions, no delete buttons — CONT-04

export default async function ResumenPage() {
  const [projects, supplierTotals] = await Promise.all([
    getAccountantProjectSummaries(),
    getAccountantSupplierTotals(),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Resumen Financiero</h1>
        <p className="text-muted-foreground text-sm">Vista de contador — solo lectura</p>
      </div>

      {/* Section 1: Project payment summaries (CONT-01) */}
      <section>
        <h2 className="text-lg font-medium mb-3">Proyectos Activos</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proyecto</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Total Cotizado</TableHead>
              <TableHead className="text-right">Cobrado</TableHead>
              <TableHead className="text-right">Por Cobrar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nombre}</TableCell>
                <TableCell>{p.clienteNombre}</TableCell>
                <TableCell className="text-right">{formatMXN(p.granTotal)}</TableCell>
                <TableCell className="text-right">{formatMXN(p.collected)}</TableCell>
                <TableCell className="text-right">{formatMXN(p.outstanding)}</TableCell>
              </TableRow>
            ))}
            {projects.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No hay proyectos activos
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

      {/* Section 2: Supplier payment totals (CONT-02) */}
      <section>
        <h2 className="text-lg font-medium mb-3">Pagos a Proveedores</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proveedor</TableHead>
              <TableHead className="text-right">Total Pagado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {supplierTotals.map(s => (
              <TableRow key={s.supplierId}>
                <TableCell>{s.supplierNombre}</TableCell>
                <TableCell className="text-right">{formatMXN(s.totalPagado)}</TableCell>
              </TableRow>
            ))}
            {supplierTotals.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  Sin pagos registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  )
}
