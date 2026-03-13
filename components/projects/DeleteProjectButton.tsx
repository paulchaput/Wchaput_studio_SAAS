'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { deleteProjectAction } from '@/lib/actions/projects'

interface DeleteProjectButtonProps {
  projectId: string
  projectName: string
}

export function DeleteProjectButton({ projectId, projectName }: DeleteProjectButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteProjectAction(projectId)
    setDeleting(false)
    if (!result?.error) {
      router.push('/proyectos')
      router.refresh()
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4 mr-1" />
        Eliminar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar proyecto</DialogTitle>
            <DialogDescription>
              Se eliminara permanentemente <strong>{projectName}</strong> con todas sus partidas, pagos y checklist. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
