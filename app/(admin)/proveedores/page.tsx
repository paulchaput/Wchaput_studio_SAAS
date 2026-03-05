import Link from 'next/link'

import { getSuppliersAll } from '@/lib/queries/suppliers'
import { SupplierForm } from '@/components/suppliers/SupplierForm'

export default async function ProveedoresPage() {
  const suppliers = await getSuppliersAll()

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Proveedores</h1>
        <SupplierForm />
      </div>

      {/* Suppliers Table */}
      {suppliers.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          No hay proveedores registrados
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Nombre</th>
                <th className="px-4 py-3 text-left font-medium">Contacto</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Teléfono</th>
                <th className="px-4 py-3 text-right font-medium">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{supplier.nombre}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {supplier.contacto ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {supplier.email ? (
                      <a href={`mailto:${supplier.email}`} className="hover:underline">
                        {supplier.email}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {supplier.telefono ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/proveedores/${supplier.id}`}
                      className="text-primary hover:underline text-sm font-medium"
                    >
                      Ver detalle
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
