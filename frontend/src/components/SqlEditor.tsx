import Editor, { type Monaco } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'

interface Props {
  value: string
  onChange: (v: string) => void
  onExecute: () => void
  onMount?: (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => void
}

export function SqlEditor({ value, onChange, onExecute, onMount }: Props) {
  return (
    <Editor
      height="200px"
      language="sql"
      theme="vs-dark"
      value={value}
      onChange={(v) => onChange(v ?? '')}
      onMount={(editor, monaco) => {
        editor.addCommand(
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
          onExecute
        )
        onMount?.(editor, monaco)
      }}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        wordWrap: 'on',
      }}
    />
  )
}
