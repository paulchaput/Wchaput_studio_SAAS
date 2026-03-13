'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createProjectAction } from '@/lib/actions/projects'

export function QuickProjectDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [clienteNombre, setClienteNombre] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setNombre('')
    setClienteNombre('')
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const formData = new FormData()
    formData.append('nombre', nombre.trim())
    formData.append('cliente_nombre', clienteNombre.trim())
    formData.append('include_iva', 'true')

    try {
      const result = await createProjectAction(formData)
      if (result?.error) {
        setError(result.error)
        setSubmitting(false)
      }
    } catch {
      // redirect() throws a NEXT_REDIRECT — this is expected
      setOpen(false)
      reset()
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" />
          Nuevo Proyecto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Proyecto</DialogTitle>
          <DialogDescription>
            Solo nombre y cliente. El resto lo configuras después.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="qp-nombre">Nombre del Proyecto *</Label>
            <Input
              id="qp-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Cocina integral residencial"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="qp-cliente">Cliente *</Label>
            <Input
              id="qp-cliente"
              value={clienteNombre}
              onChange={(e) => setClienteNombre(e.target.value)}
              placeholder="Nombre del cliente"
            />
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={submitting || !nombre.trim() || !clienteNombre.trim()}
              className="w-full sm:w-auto"
            >
              {submitting ? 'Creando...' : 'Crear Proyecto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
