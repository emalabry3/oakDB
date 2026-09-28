import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useMemo } from 'react'

interface Props {
  columns: string[]
  rows: unknown[][]
}

export function ResultTable({ columns, rows }: Props) {
  type Row = Record<string, unknown>

  const columnHelper = createColumnHelper<Row>()

  const colDefs = useMemo(
    () =>
      columns.map((col) =>
        columnHelper.accessor(col, {
          header: col,
          cell: (info) => {
            const v = info.getValue()
            return v === null || v === undefined ? (
              <span className="text-gray-500 italic">null</span>
            ) : (
              String(v)
            )
          },
        })
      ),
    [columns]
  )

  const data = useMemo<Row[]>(
    () => rows.map((row) => Object.fromEntries(columns.map((col, i) => [col, row[i]]))),
    [columns, rows]
  )

  const table = useReactTable({
    data,
    columns: colDefs,
    getCoreRowModel: getCoreRowModel(),
  })

  if (columns.length === 0) {
    return <p className="text-gray-400 text-center py-4">Aucun résultat.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-200">
        <thead className="text-xs uppercase bg-gray-700 text-gray-400">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th key={h.id} className="px-4 py-2 whitespace-nowrap">
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, i) => (
            <tr key={row.id} className={i % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-2 whitespace-nowrap">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-500 mt-2 px-1">{rows.length} ligne{rows.length !== 1 ? 's' : ''}</p>
    </div>
  )
}
