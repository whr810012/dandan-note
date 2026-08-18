import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import type { EntryWithTags } from '../types/entry'
import { displayedSimpleContent, simpleContentNeedsSave } from '../utils/simpleContent'

type SimpleBoardProps = {
  entries: EntryWithTags[]
  loading: boolean
  onAdd: () => Promise<void>
  onToggleComplete: (entryId: string, completed: boolean) => Promise<void>
  onUpdateContent: (entryId: string, content: string) => Promise<void>
  onDelete: (entryId: string) => Promise<void>
}

export type SimpleBoardHandle = {
  flush: () => Promise<void>
}

type RowHandle = {
  flush: () => Promise<void>
}

function SimpleRow({
  entry,
  onToggleComplete,
  onUpdateContent,
  onDelete,
  onReady,
}: {
  entry: EntryWithTags
  onToggleComplete: (entryId: string, completed: boolean) => Promise<void>
  onUpdateContent: (entryId: string, content: string) => Promise<void>
  onDelete: (entryId: string) => Promise<void>
  onReady: (entryId: string, handle: RowHandle | null) => void
}) {
  const [text, setText] = useState(() => displayedSimpleContent(entry))
  const [dirty, setDirty] = useState(false)
  const saveRef = useRef(onUpdateContent)
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const textRef = useRef(text)
  const dirtyRef = useRef(dirty)
  const storedRef = useRef(displayedSimpleContent(entry))
  const persistRef = useRef<() => Promise<void>>(async () => undefined)

  textRef.current = text
  dirtyRef.current = dirty
  storedRef.current = displayedSimpleContent(entry)

  useEffect(() => {
    saveRef.current = onUpdateContent
  }, [onUpdateContent])

  useEffect(() => {
    if (dirtyRef.current) return
    setText(displayedSimpleContent(entry))
    setDirty(false)
  }, [entry.id, entry.content])

  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${Math.max(28, el.scrollHeight)}px`
  }, [text])

  persistRef.current = async () => {
    if (!dirtyRef.current) return
    const next = textRef.current
    if (!simpleContentNeedsSave(next, storedRef.current)) {
      setDirty(false)
      dirtyRef.current = false
      return
    }
    await saveRef.current(entry.id, next)
    setDirty(false)
    dirtyRef.current = false
  }

  useEffect(() => {
    onReady(entry.id, { flush: () => persistRef.current() })
    return () => onReady(entry.id, null)
  }, [entry.id, onReady])

  useEffect(() => {
    if (!dirty) return
    if (!simpleContentNeedsSave(text, displayedSimpleContent(entry))) {
      setDirty(false)
      return
    }

    const timer = window.setTimeout(() => {
      void persistRef.current()
    }, 400)

    return () => window.clearTimeout(timer)
  }, [dirty, entry.content, entry.id, text])

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
        onBlur={() => {
          void persistRef.current()
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

export const SimpleBoard = forwardRef<SimpleBoardHandle, SimpleBoardProps>(function SimpleBoard(
  { entries, loading, onAdd, onToggleComplete, onUpdateContent, onDelete },
  ref,
) {
  const rowsRef = useRef(new Map<string, RowHandle>())

  const handleReady = useCallback((entryId: string, handle: RowHandle | null) => {
    if (handle) rowsRef.current.set(entryId, handle)
    else rowsRef.current.delete(entryId)
  }, [])

  useImperativeHandle(ref, () => ({
    flush: async () => {
      await Promise.all([...rowsRef.current.values()].map((row) => row.flush()))
    },
  }))

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
            onReady={handleReady}
          />
        ))}
      </div>

      <button type="button" className="simple-add" onClick={() => void onAdd()}>
        + 添加
      </button>
    </section>
  )
})
