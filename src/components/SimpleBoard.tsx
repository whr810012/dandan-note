import { useEffect, useRef, useState } from 'react'
import type { EntryWithTags } from '../types/entry'

type SimpleBoardProps = {
  entries: EntryWithTags[]
  loading: boolean
  onAdd: () => Promise<void>
  onToggleComplete: (entryId: string, completed: boolean) => Promise<void>
  onUpdateContent: (entryId: string, content: string) => Promise<void>
  onDelete: (entryId: string) => Promise<void>
}

function SimpleRow({
  entry,
  onToggleComplete,
  onUpdateContent,
  onDelete,
}: {
  entry: EntryWithTags
  onToggleComplete: (entryId: string, completed: boolean) => Promise<void>
  onUpdateContent: (entryId: string, content: string) => Promise<void>
  onDelete: (entryId: string) => Promise<void>
}) {
  const [text, setText] = useState(entry.content || entry.title)
  const [dirty, setDirty] = useState(false)
  const saveRef = useRef(onUpdateContent)
  const areaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    saveRef.current = onUpdateContent
  }, [onUpdateContent])

  useEffect(() => {
    setText(entry.content || entry.title)
    setDirty(false)
  }, [entry.id, entry.content, entry.title])

  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${Math.max(28, el.scrollHeight)}px`
  }, [text])

  useEffect(() => {
    if (!dirty) return
    const next = text.trim()
    const current = (entry.content || entry.title).trim()
    if (next === current) {
      setDirty(false)
      return
    }

    const timer = window.setTimeout(() => {
      void saveRef.current(entry.id, text).then(() => setDirty(false))
    }, 400)

    return () => window.clearTimeout(timer)
  }, [dirty, entry.content, entry.id, entry.title, text])

  return (
    <div className={entry.completed ? 'simple-row is-done' : 'simple-row'}>
      <label className="simple-check">
        <input
          type="checkbox"
          checked={entry.completed}
          onChange={(event) => void onToggleComplete(entry.id, event.target.checked)}
        />
        <span className="simple-check__box" />
      </label>

      <textarea
        ref={areaRef}
        className="simple-row__input"
        value={text}
        rows={1}
        placeholder="写点什么…"
        onChange={(event) => {
          setText(event.target.value)
          setDirty(true)
        }}
      />

      <button
        type="button"
        className="simple-row__delete"
        onClick={() => void onDelete(entry.id)}
        title="删除"
        aria-label="删除"
      >
        ×
      </button>
    </div>
  )
}

export function SimpleBoard({
  entries,
  loading,
  onAdd,
  onToggleComplete,
  onUpdateContent,
  onDelete,
}: SimpleBoardProps) {
  const sorted = [...entries].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    return b.updatedAt.localeCompare(a.updatedAt)
  })

  return (
    <section className="simple-board">
      <div className="simple-board__list">
        {loading ? <div className="empty-state">正在加载…</div> : null}
        {!loading && sorted.length === 0 ? (
          <div className="empty-state">还没有内容</div>
        ) : null}
        {sorted.map((entry) => (
          <SimpleRow
            key={entry.id}
            entry={entry}
            onToggleComplete={onToggleComplete}
            onUpdateContent={onUpdateContent}
            onDelete={onDelete}
          />
        ))}
      </div>

      <button type="button" className="simple-add" onClick={() => void onAdd()}>
        + 添加
      </button>
    </section>
  )
}
