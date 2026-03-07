"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface PdfPreviewModalProps {
  previewUrl: string
  downloadUrl: string
  label: string
}

export function PdfPreviewModal({ previewUrl, downloadUrl, label }: PdfPreviewModalProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            <iframe
              src={previewUrl}
              className="w-full h-full border-0"
              title={label}
            />
          </div>
          <DialogFooter className="px-6 py-4 border-t">
            <a href={downloadUrl} download>
              <Button variant="default">Descargar PDF</Button>
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
