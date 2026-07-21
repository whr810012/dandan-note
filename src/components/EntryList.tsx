import { ChevronDown, CircleCheck, Clock3, FileText, Plus } from 'lucide-react'
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { EntryWithTags, FilterMode, Tag } from '../types/entry'
import { formatShortDate, isOverdue } from '../utils/date'
import { EntryEditor, type EntryEditorHandle } from './EntryEditor'

type EntryListProps = {
  entries: EntryWithTags[]
  allTags: Tag[]
  selectedEntryId: string | null
  filterMode: FilterMode
  loading: boolean
  onSelect: (entryId: string | null) => void
  onCreateEntry: () => void
  onSave: (payload: {
    entryId: string
    title: string
    content: string
    dueDate: string | null
    isTodo: boolean
    completed: boolean
    tagIds: string[]
  }) => Promise<void>
  onDelete: (entryId: string) => Promise<void>
  onCreateTag: (name: string) => Promise<Tag | null>
}

export type EntryListHandle = {
  flush: () => Promise<void>
  collapse: () => Promise<void>
}

function emptyMessage(filterMode: FilterMode) {
  if (filterMode === 'today') return '今天还没有安排，留一点空白也很好。'
  if (filterMode === 'calendar') return '这个日期没有条目。'
  if (filterMode === 'tag') return '这个标签下还没有内容。'
  return '写下第一条记录，让小事有处可放。'
}

export const EntryList = forwardRef<EntryListHandle, EntryListProps>(function EntryList(
  {
    entries,
    allTags,
    selectedEntryId,
    filterMode,
    loading,
    onSelect,
    onCreateEntry,
    onSave,
    onDelete,
    onCreateTag,
  },
  ref,
) {
  const editorRef = useRef<EntryEditorHandle>(null)

  const collapse = async () => {
    try {
      await editorRef.current?.flush()
      onSelect(null)
    } catch {
      // Keep the editor open so the user can retry the failed save.
    }
  }

  useImperativeHandle(ref, () => ({
    flush: async () => {
      await editorRef.current?.flush()
    },
    collapse,
  }))

  useEffect(() => {
    if (!selectedEntryId) return
    const frame = requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(`[data-entry-id="${selectedEntryId}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
    return () => cancelAnimationFrame(frame)
  }, [selectedEntryId])

  const toggleEntry = async (entryId: string) => {
    try {
      await editorRef.current?.flush()
      onSelect(selectedEntryId === entryId ? null : entryId)
    } catch {
      // Keep the current draft visible after a failed save.
    }
  }

  if (loading) {
    return (
      <div className="entry-skeletons" aria-label="正在加载条目">
        {[0, 1, 2].map((item) => (
          <div className="entry-skeleton" key={item}>
            <span />
            <span />
            <span />
          </div>
        ))}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="standard-empty">
        <div className="standard-empty__icon">
          <FileText size={22} />
        </div>
        <strong>{filterMode === 'all' ? '从一条小记录开始' : '这里暂时空空的'}</strong>
        <p>{emptyMessage(filterMode)}</p>
        <button type="button" onClick={onCreateEntry}>
          <Plus size={14} />
          新建条目
        </button>
      </div>
    )
  }

  return (
    <div className="accordion-list">
      {entries.map((entry) => {
        const selected = entry.id === selectedEntryId
        const overdue = isOverdue(entry)
        const summary = entry.content.trim().replace(/\s+/g, ' ') || '暂无正文'
        return (
          <article
            className={[
              'accordion-entry',
              selected ? 'expanded' : '',
              entry.completed ? 'completed' : '',
              overdue ? 'overdue' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            data-entry-id={entry.id}
            key={entry.id}
          >
            <button
              type="button"
              className="accordion-entry__summary"
              aria-expanded={selected}
              aria-controls={`entry-editor-${entry.id}`}
              onClick={() => void toggleEntry(entry.id)}
            >
              <span className="accordion-entry__state" aria-hidden="true">
                {entry.isTodo && entry.completed ? <CircleCheck size={16} /> : <span />}
              </span>
              <span className="accordion-entry__main">
                <span className="accordion-entry__title">{entry.title || '无标题条目'}</span>
                <span className="accordion-entry__preview">{summary}</span>
                <span className="accordion-entry__meta">
                  <span className={overdue ? 'date-chip overdue' : 'date-chip'}>
                    <Clock3 size={11} />
                    {overdue ? '已逾期 · ' : ''}
                    {formatShortDate(entry.dueDate)}
                  </span>
                  {entry.tags.slice(0, 3).map((tag) => (
                    <span className="entry-tag" key={tag.id}>
                      <i style={{ backgroundColor: tag.color }} />
                      {tag.name}
                    </span>
                  ))}
                  {entry.tags.length > 3 ? (
                    <span className="entry-tag entry-tag--more">+{entry.tags.length - 3}</span>
                  ) : null}
                </span>
              </span>
              <ChevronDown className="accordion-entry__chevron" size={16} aria-hidden="true" />
            </button>

            {selected ? (
              <div className="accordion-entry__editor" id={`entry-editor-${entry.id}`}>
                <EntryEditor
                  ref={editorRef}
                  entry={entry}
                  allTags={allTags}
                  onSave={onSave}
                  onDelete={onDelete}
                  onCreateTag={onCreateTag}
                />
              </div>
            ) : null}
          </article>
        )
      })}
    </div>
  )
})
