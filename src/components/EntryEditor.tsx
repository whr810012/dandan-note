import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  Plus,
  RotateCcw,
  Tag as TagIcon,
  Trash2,
} from 'lucide-react'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import type { EntryWithTags, Tag } from '../types/entry'

type EntryEditorProps = {
  entry: EntryWithTags | null
  allTags: Tag[]
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

type Draft = {
  title: string
  content: string
  dueDate: string | null
  isTodo: boolean
  completed: boolean
  tagIds: string[]
}

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

export type EntryEditorHandle = {
  flush: () => Promise<void>
}

const emptyDraft: Draft = {
  title: '',
  content: '',
  dueDate: null,
  isTodo: false,
  completed: false,
  tagIds: [],
}

function createDraft(entry: EntryWithTags): Draft {
  return {
    title: entry.title,
    content: entry.content,
    dueDate: entry.dueDate,
    isTodo: entry.isTodo,
    completed: entry.completed,
    tagIds: entry.tags.map((tag) => tag.id),
  }
}

export const EntryEditor = forwardRef<EntryEditorHandle, EntryEditorProps>(function EntryEditor(
  { entry, allTags, onSave, onDelete, onCreateTag },
  ref,
) {
  const [draft, setDraft] = useState<Draft>(() => (entry ? createDraft(entry) : emptyDraft))
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [savedAt, setSavedAt] = useState('')
  const [newTagName, setNewTagName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const incomingEntryRef = useRef(entry)
  const entryIdRef = useRef<string | null>(entry?.id ?? null)
  const draftRef = useRef(draft)
  const dirtyRef = useRef(false)
  const revisionRef = useRef(0)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onSaveRef = useRef(onSave)
  const performSaveRef = useRef<() => Promise<void>>(async () => undefined)

  onSaveRef.current = onSave
  incomingEntryRef.current = entry

  const clearSaveTimer = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
  }

  const scheduleSave = () => {
    clearSaveTimer()
    saveTimerRef.current = setTimeout(() => {
      void performSaveRef.current().catch(() => undefined)
    }, 480)
  }

  performSaveRef.current = async () => {
    clearSaveTimer()
    const entryId = entryIdRef.current
    if (!entryId || !dirtyRef.current) return

    const revision = revisionRef.current
    const payload = { ...draftRef.current, entryId }
    setSaveState('saving')
    try {
      await onSaveRef.current(payload)
      if (entryIdRef.current !== entryId) return
      if (revision === revisionRef.current) {
        dirtyRef.current = false
        setSaveState('saved')
        setSavedAt(
          new Intl.DateTimeFormat('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }).format(new Date()),
        )
      } else {
        setSaveState('dirty')
        scheduleSave()
      }
    } catch (error) {
      if (entryIdRef.current === entryId) {
        dirtyRef.current = true
        setSaveState('error')
      }
      throw error
    }
  }

  useImperativeHandle(ref, () => ({
    flush: () => performSaveRef.current(),
  }))

  useEffect(() => {
    clearSaveTimer()
    const incomingEntry = incomingEntryRef.current
    entryIdRef.current = incomingEntry?.id ?? null
    const nextDraft = incomingEntry ? createDraft(incomingEntry) : emptyDraft
    draftRef.current = nextDraft
    dirtyRef.current = false
    revisionRef.current = 0
    setDraft(nextDraft)
    setSaveState('idle')
    setSavedAt('')
    setNewTagName('')
    setConfirmDelete(false)
  }, [entry?.id])

  useEffect(
    () => () => {
      clearSaveTimer()
      if (dirtyRef.current) {
        void performSaveRef.current().catch(() => undefined)
      }
    },
    [],
  )

  const updateDraft = (patch: Partial<Draft>) => {
    const next = { ...draftRef.current, ...patch }
    draftRef.current = next
    setDraft(next)
    dirtyRef.current = true
    revisionRef.current += 1
    setSaveState('dirty')
    scheduleSave()
  }

  const toggleTag = (tagId: string) => {
    updateDraft({
      tagIds: draft.tagIds.includes(tagId)
        ? draft.tagIds.filter((id) => id !== tagId)
        : [...draft.tagIds, tagId],
    })
  }

  const addTag = async () => {
    const name = newTagName.trim()
    if (!name) return
    const existing = allTags.find((tag) => tag.name.toLocaleLowerCase() === name.toLocaleLowerCase())
    const tag = existing ?? (await onCreateTag(name))
    if (tag && !draftRef.current.tagIds.includes(tag.id)) {
      updateDraft({ tagIds: [...draftRef.current.tagIds, tag.id] })
    }
    setNewTagName('')
  }

  const handleTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void addTag()
    }
  }

  const handleDelete = async () => {
    if (!entry || !confirmDelete) {
      setConfirmDelete(true)
      return
    }
    clearSaveTimer()
    dirtyRef.current = false
    setDeleting(true)
    try {
      await onDelete(entry.id)
    } finally {
      setDeleting(false)
    }
  }

  if (!entry) return null

  return (
    <div className="inline-editor" aria-label={`编辑 ${entry.title || '无标题条目'}`}>
      <input
        className="inline-editor__title"
        name="entryTitle"
        value={draft.title}
        placeholder="给这条记录起个名字"
        aria-label="条目标题"
        onChange={(event) => updateDraft({ title: event.target.value })}
      />
      <textarea
        className="inline-editor__content"
        name="entryContent"
        value={draft.content}
        placeholder="写点什么……"
        aria-label="条目正文"
        onChange={(event) => updateDraft({ content: event.target.value })}
      />

      <div className="inline-editor__controls">
        <label className="inline-control inline-control--date">
          <CalendarDays size={14} aria-hidden="true" />
          <span>日期</span>
          <input
            type="date"
            name="dueDate"
            value={draft.dueDate ?? ''}
            onChange={(event) => updateDraft({ dueDate: event.target.value || null })}
          />
        </label>

        <button
          type="button"
          className={draft.isTodo ? 'inline-control active' : 'inline-control'}
          aria-pressed={draft.isTodo}
          onClick={() =>
            updateDraft({
              isTodo: !draft.isTodo,
              completed: draft.isTodo ? false : draft.completed,
            })
          }
        >
          {draft.isTodo ? <CheckCircle2 size={14} /> : <Circle size={14} />}
          待办事项
        </button>

        {draft.isTodo ? (
          <button
            type="button"
            className={draft.completed ? 'inline-control active' : 'inline-control'}
            aria-pressed={draft.completed}
            onClick={() => updateDraft({ completed: !draft.completed })}
          >
            <Check size={14} />
            {draft.completed ? '已完成' : '标为完成'}
          </button>
        ) : null}
      </div>

      <div className="inline-editor__tags">
        <div className="inline-editor__section-label">
          <TagIcon size={13} />
          标签
        </div>
        <div className="editor-tag-list">
          {allTags.map((tag) => (
            <button
              type="button"
              key={tag.id}
              className={draft.tagIds.includes(tag.id) ? 'editor-tag active' : 'editor-tag'}
              aria-pressed={draft.tagIds.includes(tag.id)}
              onClick={() => toggleTag(tag.id)}
            >
              <span style={{ backgroundColor: tag.color }} />
              {tag.name}
            </button>
          ))}
        </div>
        <div className="tag-create-row">
          <input
            name="newTagName"
            value={newTagName}
            maxLength={20}
            placeholder="新标签，按 Enter 添加"
            aria-label="新标签名称"
            onChange={(event) => setNewTagName(event.target.value)}
            onKeyDown={handleTagKeyDown}
          />
          <button
            type="button"
            aria-label="添加标签"
            disabled={!newTagName.trim()}
            onClick={() => void addTag()}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div className="inline-editor__footer">
        <div className={`save-indicator save-indicator--${saveState}`} aria-live="polite">
          {saveState === 'saving' ? '正在保存…' : null}
          {saveState === 'dirty' ? '等待保存' : null}
          {saveState === 'saved' ? `已保存 ${savedAt}` : null}
          {saveState === 'idle' ? '修改后自动保存' : null}
          {saveState === 'error' ? (
            <button
              type="button"
              onClick={() => void performSaveRef.current().catch(() => undefined)}
            >
              <AlertCircle size={13} />
              保存失败，点击重试
            </button>
          ) : null}
        </div>

        <div className="inline-editor__danger">
          {confirmDelete ? (
            <span className="delete-confirm" role="alert">
              确定删除？
              <button type="button" onClick={() => setConfirmDelete(false)}>
                取消
              </button>
            </span>
          ) : null}
          <button
            type="button"
            className={confirmDelete ? 'delete-button confirming' : 'delete-button'}
            disabled={deleting}
            aria-label={confirmDelete ? '确认删除条目' : '删除条目'}
            onClick={() => void handleDelete()}
          >
            {deleting ? <RotateCcw className="spin" size={14} /> : <Trash2 size={14} />}
            {confirmDelete ? '确认删除' : '删除'}
          </button>
        </div>
      </div>
    </div>
  )
})
