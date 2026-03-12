'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileSpreadsheet, FileText, AlertCircle, CheckCircle2 } from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
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

interface ParsedProject {
  nombre: string
  cliente_nombre: string
  include_iva: boolean
  salesperson?: string
  notas?: string
}

type ImportStatus = 'idle' | 'preview' | 'importing' | 'done'

const ACCEPTED_TYPES = '.csv,.xlsx,.xls'

// Maps common column name variations to our fields
const COLUMN_MAP: Record<string, keyof ParsedProject> = {
  nombre: 'nombre',
  proyecto: 'nombre',
  'nombre del proyecto': 'nombre',
  project: 'nombre',
  name: 'nombre',
  cliente: 'cliente_nombre',
  'cliente_nombre': 'cliente_nombre',
  'nombre del cliente': 'cliente_nombre',
  client: 'cliente_nombre',
  customer: 'cliente_nombre',
  iva: 'include_iva',
  'include_iva': 'include_iva',
  'aplica iva': 'include_iva',
  vendedor: 'salesperson',
  salesperson: 'salesperson',
  notas: 'notas',
  notes: 'notas',
}

function normalizeColumnName(col: string): keyof ParsedProject | null {
  const key = col.toLowerCase().trim()
  return COLUMN_MAP[key] ?? null
}

function parseBoolean(val: unknown): boolean {
  if (typeof val === 'boolean') return val
  const s = String(val).toLowerCase().trim()
  return ['true', '1', 'si', 'sí', 'yes'].includes(s)
}

function rowToProject(row: Record<string, unknown>): ParsedProject | null {
  const mapped: Partial<ParsedProject> = {}

  for (const [col, val] of Object.entries(row)) {
    const field = normalizeColumnName(col)
    if (!field || val == null || String(val).trim() === '') continue

    if (field === 'include_iva') {
      mapped.include_iva = parseBoolean(val)
    } else {
      mapped[field] = String(val).trim()
    }
  }

  if (!mapped.nombre || !mapped.cliente_nombre) return null

  return {
    nombre: mapped.nombre,
    cliente_nombre: mapped.cliente_nombre,
    include_iva: mapped.include_iva ?? true,
    salesperson: mapped.salesperson,
    notas: mapped.notas,
  }
}

export function ImportProjectsDialog() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [projects, setProjects] = useState<ParsedProject[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [importResults, setImportResults] = useState<{ ok: number; fail: number }>({ ok: 0, fail: 0 })
  const [fileName, setFileName] = useState('')

  function reset() {
    setStatus('idle')
    setProjects([])
    setErrors([])
    setImportResults({ ok: 0, fail: 0 })
    setFileName('')
    if (fileRef.current) fileRef.current.value = ''
  }

  function parseRows(rows: Record<string, unknown>[]) {
    const parsed: ParsedProject[] = []
    const errs: string[] = []

    rows.forEach((row, i) => {
      const p = rowToProject(row)
      if (p) {
        parsed.push(p)
      } else {
        errs.push(`Fila ${i + 2}: falta "nombre" o "cliente"`)
      }
    })

    if (parsed.length === 0) {
      errs.unshift('No se encontraron proyectos válidos. Verifica que tu archivo tenga columnas "nombre" y "cliente".')
    }

    setProjects(parsed)
    setErrors(errs)
    setStatus('preview')
  }

  function handleFile(file: File) {
    setFileName(file.name)
    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'csv') {
      Papa.parse<Record<string, unknown>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => parseRows(result.data),
        error: () => {
          setErrors(['Error al leer el archivo CSV.'])
          setStatus('preview')
        },
      })
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, { type: 'array' })
          const sheet = wb.Sheets[wb.SheetNames[0]]
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)
          parseRows(rows)
        } catch {
          setErrors(['Error al leer el archivo Excel.'])
          setStatus('preview')
        }
      }
      reader.readAsArrayBuffer(file)
    } else {
      setErrors(['Formato no soportado. Usa CSV o Excel (.xlsx, .xls).'])
      setStatus('preview')
    }
  }

  async function handleImport() {
    setStatus('importing')
    let ok = 0
    let fail = 0

    for (const p of projects) {
      const formData = new FormData()
      formData.append('nombre', p.nombre)
      formData.append('cliente_nombre', p.cliente_nombre)
      formData.append('include_iva', String(p.include_iva))
      if (p.salesperson) formData.append('salesperson', p.salesperson)
      if (p.notas) formData.append('notas', p.notas)

      try {
        const result = await createProjectAction(formData)
        if (result?.error) {
          fail++
        } else {
          ok++
        }
      } catch {
        // redirect() throws NEXT_REDIRECT — counts as success
        ok++
      }
    }

    setImportResults({ ok, fail })
    setStatus('done')
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto">
          <Upload className="mr-2 h-4 w-4" />
          Importar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Proyectos</DialogTitle>
          <DialogDescription>
            Sube un archivo CSV o Excel con columnas: nombre, cliente. Opcionales: iva, vendedor, notas.
          </DialogDescription>
        </DialogHeader>

        {status === 'idle' && (
          <div className="space-y-4">
            {/* Drop zone */}
            <label
              htmlFor="import-file"
              className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">Arrastra tu archivo o haz clic</p>
                <p className="text-xs text-muted-foreground mt-1">CSV, Excel (.xlsx, .xls)</p>
              </div>
              <input
                ref={fileRef}
                id="import-file"
                type="file"
                accept={ACCEPTED_TYPES}
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                }}
              />
            </label>

            {/* Format examples */}
            <div className="rounded-md border p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Formatos aceptados</p>
              <div className="flex gap-3">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>.csv</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>.xlsx / .xls</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Columnas requeridas: <span className="font-mono">nombre</span>, <span className="font-mono">cliente</span>
              </p>
            </div>
          </div>
        )}

        {status === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{fileName}</span>
              <span className="text-muted-foreground">— {projects.length} proyecto{projects.length !== 1 ? 's' : ''}</span>
            </div>

            {errors.length > 0 && (
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 space-y-1">
                {errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}

            {projects.length > 0 && (
              <div className="rounded-md border overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Proyecto</th>
                      <th className="text-left px-3 py-2 font-medium">Cliente</th>
                      <th className="text-center px-3 py-2 font-medium">IVA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{p.nombre}</td>
                        <td className="px-3 py-2 text-muted-foreground">{p.cliente_nombre}</td>
                        <td className="px-3 py-2 text-center">{p.include_iva ? 'Sí' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={reset}>
                Cambiar archivo
              </Button>
              {projects.length > 0 && (
                <Button onClick={handleImport}>
                  Importar {projects.length} proyecto{projects.length !== 1 ? 's' : ''}
                </Button>
              )}
            </DialogFooter>
          </div>
        )}

        {status === 'importing' && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Importando proyectos...</p>
          </div>
        )}

        {status === 'done' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <div className="text-center">
                <p className="font-medium">{importResults.ok} proyecto{importResults.ok !== 1 ? 's' : ''} importado{importResults.ok !== 1 ? 's' : ''}</p>
                {importResults.fail > 0 && (
                  <p className="text-sm text-destructive mt-1">
                    {importResults.fail} con error
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => { setOpen(false); reset() }}>
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
