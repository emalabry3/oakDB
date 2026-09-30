import Editor, { type Monaco } from '@monaco-editor/react'
import { useRef, useEffect } from 'react'
import type { editor, languages, Position, editor as editorNS } from 'monaco-editor'
import type { SchemaTable } from '../api/client'

const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'BETWEEN', 'LIKE', 'IS', 'NULL',
  'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS', 'ON',
  'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'DISTINCT',
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
  'CREATE', 'TABLE', 'DROP', 'ALTER', 'AS', 'ASC', 'DESC',
  'UNION', 'ALL', 'EXCEPT', 'INTERSECT', 'WITH',
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'COALESCE', 'NULLIF', 'CAST',
  'UPPER', 'LOWER', 'LENGTH', 'SUBSTR', 'TRIM',
  'ROUND', 'FLOOR', 'CEIL', 'ABS',
  'NOW', 'DATE', 'YEAR', 'MONTH', 'DAY',
  'TRUE', 'FALSE',
]

// Mots-clés qui introduisent un nom de table
const TABLE_KEYWORDS = /\b(FROM|JOIN|INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|FULL\s+JOIN|CROSS\s+JOIN|UPDATE|INTO|TABLE)\s+$/i
// Mots-clés qui introduisent un nom de colonne
const COLUMN_KEYWORDS = /\b(SELECT|WHERE|HAVING|ON|SET|BY|AND|OR,NOT)\s+$/i

// Module-level : le provider lit toujours la dernière version du schéma
let _schema: SchemaTable[] = []
let _providerDisposable: { dispose: () => void } | null = null

function registerProvider(monaco: Monaco) {
  if (_providerDisposable) return

  _providerDisposable = monaco.languages.registerCompletionItemProvider('sql', {
    triggerCharacters: ['.', ' '],
    provideCompletionItems(model: editorNS.ITextModel, position: Position) {
      const word = model.getWordUntilPosition(position)
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: position.column,
      }

      const textBeforeCursor = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      })

      // Après "table." → colonnes de cette table seulement
      const dotMatch = textBeforeCursor.match(/(\w+)\.\s*$/)
      if (dotMatch) {
        const prefix = dotMatch[1].toLowerCase()
        const table = _schema.find(t => t.table.toLowerCase() === prefix)
        if (table) {
          return {
            suggestions: table.columns.map<languages.CompletionItem>(col => ({
              label: col.name,
              kind: monaco.languages.CompletionItemKind.Field,
              detail:
                col.type +
                (col.is_primary_key ? ' · PK' : '') +
                (col.references
                  ? ` → ${col.references.table}.${col.references.column}`
                  : ''),
              insertText: col.name,
              range,
            })),
          }
        }
      }

      // Après FROM / JOIN → tables seulement
      if (TABLE_KEYWORDS.test(textBeforeCursor)) {
        return {
          suggestions: _schema.map<languages.CompletionItem>(table => ({
            label: table.table,
            kind: monaco.languages.CompletionItemKind.Class,
            detail: `table (${table.columns.length} colonnes)`,
            insertText: table.table,
            range,
          })),
        }
      }

      // Après SELECT / WHERE / ON → colonnes en premier
      if (COLUMN_KEYWORDS.test(textBeforeCursor)) {
        const cols: languages.CompletionItem[] = []
        for (const table of _schema) {
          for (const col of table.columns) {
            cols.push({
              label: col.name,
              kind: monaco.languages.CompletionItemKind.Field,
              detail: `${table.table}.${col.name} · ${col.type}`,
              insertText: col.name,
              range,
              sortText: '1' + col.name,
            })
          }
        }
        for (const kw of SQL_KEYWORDS) {
          cols.push({
            label: kw,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: kw,
            range,
            sortText: '3' + kw,
          })
        }
        return { suggestions: cols }
      }

      // Cas général : tout (tables en premier, puis colonnes, puis mots-clés)
      const items: languages.CompletionItem[] = []

      for (const table of _schema) {
        items.push({
          label: table.table,
          kind: monaco.languages.CompletionItemKind.Class,
          detail: `table (${table.columns.length} colonnes)`,
          insertText: table.table,
          range,
          sortText: '1' + table.table,
        })
      }

      for (const table of _schema) {
        for (const col of table.columns) {
          items.push({
            label: col.name,
            kind: monaco.languages.CompletionItemKind.Field,
            detail: `${table.table}.${col.name} · ${col.type}`,
            insertText: col.name,
            range,
            sortText: '2' + col.name,
          })
        }
      }

      for (const kw of SQL_KEYWORDS) {
        items.push({
          label: kw,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: kw,
          range,
          sortText: '3' + kw,
        })
      }

      return { suggestions: items }
    },
  })
}

interface Props {
  value: string
  onChange: (v: string) => void
  onExecute: () => void
  onMount?: (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => void
  schema?: SchemaTable[]
}

export function SqlEditor({ value, onChange, onExecute, onMount, schema }: Props) {
  const onExecuteRef = useRef(onExecute)
  useEffect(() => { onExecuteRef.current = onExecute }, [onExecute])

  useEffect(() => {
    _schema = schema ?? []
  }, [schema])

  return (
    <Editor
      height="200px"
      language="sql"
      theme="vs-dark"
      value={value}
      onChange={(v) => onChange(v ?? '')}
      onMount={(ed, monaco) => {
        ed.addCommand(
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
          () => onExecuteRef.current()
        )
        registerProvider(monaco)
        onMount?.(ed, monaco)
      }}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        suggestOnTriggerCharacters: true,
        quickSuggestions: { other: true, comments: false, strings: false },
      }}
    />
  )
}
