import { format } from 'date-fns'
import type { EntryWithTags } from '../types/entry'

type EntryListProps = {
  entries: EntryWithTags[]
  selectedEntryId: string | null
  onSelect: (entryId: string) => void
}

export function EntryList({ entries, selectedEntryId, onSelect }: EntryListProps) {
  if (entries.length === 0) {
    return <div className="empty-state">当前筛选条件下没有条目。</div>
  }

  return (
    <div className="entry-list">
      {entries.map((entry) => (
        <button
          key={entry.id}
          type="button"
          className={selectedEntryId === entry.id ? 'entry-card active' : 'entry-card'}
          onClick={() => onSelect(entry.id)}
        >
          <div className="entry-card__top">
            <strong className={entry.completed ? 'is-completed' : undefined}>
              {entry.title || '未命名条目'}
            </strong>
            {entry.isTodo ? <span className="todo-badge">{entry.completed ? '已完成' : '待办'}</span> : null}
          </div>
          <p>{entry.content || '点击右侧开始记录内容…'}</p>
          <div className="entry-card__meta">
            <span>{entry.dueDate ? format(new Date(entry.dueDate), 'MM-dd') : '无日期'}</span>
            <div className="entry-card__tags">
              {entry.tags.slice(0, 2).map((tag) => (
                <span key={tag.id} className="mini-tag">
                  <span className="tag-dot" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
