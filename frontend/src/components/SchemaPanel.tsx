import type { SchemaTable } from '../api/client'

interface Props {
  tables: SchemaTable[]
  loading: boolean
}

export function SchemaPanel({ tables, loading }: Props) {
  if (loading) return <p className="text-gray-400 text-sm p-3">Chargement...</p>

  return (
    <div className="text-sm text-gray-200">
      <h2 className="text-xs uppercase text-gray-400 font-semibold px-3 py-2 border-b border-gray-700">
        Schéma
      </h2>
      {tables.map((t) => (
        <details key={t.table} className="border-b border-gray-700">
          <summary className="px-3 py-2 cursor-pointer hover:bg-gray-700 font-mono font-semibold text-blue-300">
            {t.table}
          </summary>
          <ul className="px-4 pb-2 pt-1 space-y-1">
            {t.columns.map((c) => (
              <li key={c.name} className="flex justify-between">
                <span className="font-mono text-gray-200">{c.name}</span>
                <span className="text-gray-500 text-xs">{c.type}</span>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  )
}
