import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PIPELINE_STAGES } from '@/lib/calculations'

interface PipelineSummaryProps {
  pipelineCounts: Record<string, number>
}

export function PipelineSummary({ pipelineCounts }: PipelineSummaryProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Pipeline por Etapa</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Etapa</TableHead>
            <TableHead className="text-right">Proyectos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {PIPELINE_STAGES.map((stage) => (
            <TableRow key={stage}>
              <TableCell>{stage}</TableCell>
              <TableCell className="text-right font-medium">
                {pipelineCounts[stage] ?? 0}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
