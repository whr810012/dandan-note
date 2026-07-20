import { useEffect, useRef, useState } from 'react'
import type { EntryWithTags, Tag } from '../types/entry'

type SavePayload = {
  entryId: string
  title: string
  content: string
  dueDate: string | null
  isTodo: boolean
  completed: boolean
  tagIds: string[]
}

type EntryEditorProps = {
  entry: EntryWithTags | null
  allTags: Tag[]
  onSave: (payload: SavePayload) => Promise<void>
  onDelete: (entryId: string) => Promise<void>
  onCreateTag: (name: string) => Promise<Tag | null>
}

function sameTagIds(a: string[], b: string[]) {
  if (a.length !== b.length) return false
  const left = [...a].sort()
  const right = [...b].sort()
  return left.every((id, index) => id === right[index])
}

export function EntryEditor({
  entry,
  allTags,
  onSave,
  onDelete,
  onCreateTag,
}: EntryEditorProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [isTodo, setIsTodo] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [dirty, setDirty] = useState(false)
  const onSaveRef = useRef(onSave)

  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  useEffect(() => {
    if (!entry) return
    setTitle(entry.title)
    setContent(entry.content)
    setDueDate(entry.dueDate ?? '')
    setIsTodo(entry.isTodo)
    setCompleted(entry.completed)
    setSelectedTagIds(entry.tags.map((tag) => tag.id))
    setDirty(false)
  }, [entry])

  useEffect(() => {
    if (!entry || !dirty) return

    const payload: SavePayload = {
      entryId: entry.id,
      title,
      content,
      dueDate: dueDate || null,
      isTodo,
      completed,
      tagIds: selectedTagIds,
    }

    const unchanged =
      payload.title === entry.title &&
      payload.content === entry.content &&
      payload.dueDate === entry.dueDate &&
      payload.isTodo === entry.isTodo &&
      payload.completed === entry.completed &&
      sameTagIds(payload.tagIds, entry.tags.map((tag) => tag.id))

    if (unchanged) {
      setDirty(false)
      return
    }

    const timer = window.setTimeout(() => {
      void onSaveRef.current(payload).then(() => setDirty(false))
    }, 450)

    return () => window.clearTimeout(timer)
  }, [
    completed,
    content,
    dirty,
    dueDate,
    entry,
    isTodo,
    selectedTagIds,
    title,
  ])

  if (!entry) {
    return <div className="empty-state">请选择左侧条目开始编辑。</div>
  }

  async function handleCreateTag() {
    const tag = await onCreateTag(newTagName)
    if (!tag) return
    setSelectedTagIds((current) => (current.includes(tag.id) ? current : [...current, tag.id]))
    setNewTagName('')
    setDirty(true)
  }

  return (
    <section className="editor">
      <input
        className="editor__title"
        value={title}
        onChange={(event) => {
          setTitle(event.target.value)
          setDirty(true)
        }}
        placeholder="标题"
      />

      <div className="editor__row">
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={isTodo}
            onChange={(event) => {
              setIsTodo(event.target.checked)
              setDirty(true)
            }}
          />
          <span>作为待办</span>
        </label>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={completed}
            onChange={(event) => {
              setCompleted(event.target.checked)
              setDirty(true)
            }}
            disabled={!isTodo}
          />
          <span>已完成</span>
        </label>
      </div>

      <label className="field-group">
        <span>日期</span>
        <input
          type="date"
          value={dueDate}
          onChange={(event) => {
            setDueDate(event.target.value)
            setDirty(true)
          }}
        />
      </label>

      <label className="field-group">
        <span>内容</span>
        <textarea
          className="editor__content"
          value={content}
          onChange={(event) => {
            setContent(event.target.value)
            setDirty(true)
          }}
          placeholder="记录今天的事情，或者写下一条待办。"
        />
      </label>

      <div className="field-group">
        <span>标签</span>
        <div className="tag-picker">
          {allTags.map((tag) => (
            <label key={tag.id} className="tag-option">
              <input
                type="checkbox"
                checked={selectedTagIds.includes(tag.id)}
                onChange={(event) => {
                  setSelectedTagIds((current) =>
                    event.target.checked
                      ? [...current, tag.id]
                      : current.filter((id) => id !== tag.id),
                  )
                  setDirty(true)
                }}
              />
              <span className="tag-dot" style={{ backgroundColor: tag.color }} />
              {tag.name}
            </label>
          ))}
        </div>

        <div className="tag-creator">
          <input
            value={newTagName}
            onChange={(event) => setNewTagName(event.target.value)}
            placeholder="新标签"
          />
          <button type="button" className="secondary-button" onClick={() => void handleCreateTag()}>
            添加
          </button>
        </div>
      </div>

      <div className="editor__footer">
        <span className="save-hint">{dirty ? '正在保存…' : '内容会自动保存到本地。'}</span>
        <button
          type="button"
          className="secondary-button secondary-button--danger"
          onClick={() => void onDelete(entry.id)}
        >
          删除条目
        </button>
      </div>
    </section>
  )
}
