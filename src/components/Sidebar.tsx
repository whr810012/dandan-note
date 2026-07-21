import { CalendarDays, Inbox, Plus, Sparkles, Tag as TagIcon } from 'lucide-react'
import type { FilterMode, Tag } from '../types/entry'

type SidebarProps = {
  filterMode: FilterMode
  selectedDate: string | null
  selectedTagId: string | null
  tags: Tag[]
  onFilterChange: (mode: FilterMode) => void
  onSelectDate: (date: string | null) => void
  onSelectTag: (tagId: string) => void
  onCreateEntry: () => void
}

export function Sidebar({
  filterMode,
  selectedDate,
  selectedTagId,
  tags,
  onFilterChange,
  onSelectDate,
  onSelectTag,
  onCreateEntry,
}: SidebarProps) {
  return (
    <aside className="standard-filters" aria-label="条目筛选">
      <div className="standard-filters__top">
        <nav className="filter-tabs" aria-label="时间筛选">
          <button
            type="button"
            className={filterMode === 'today' ? 'filter-tab active' : 'filter-tab'}
            aria-pressed={filterMode === 'today'}
            onClick={() => onFilterChange('today')}
          >
            <Sparkles size={13} />
            今日
          </button>
          <button
            type="button"
            className={filterMode === 'all' ? 'filter-tab active' : 'filter-tab'}
            aria-pressed={filterMode === 'all'}
            onClick={() => onFilterChange('all')}
          >
            <Inbox size={13} />
            全部
          </button>
          <button
            type="button"
            className={filterMode === 'calendar' ? 'filter-tab active' : 'filter-tab'}
            aria-pressed={filterMode === 'calendar'}
            onClick={() => onFilterChange('calendar')}
          >
            <CalendarDays size={13} />
            日期
          </button>
        </nav>

        <button
          type="button"
          className="standard-add"
          aria-label="新建条目"
          title="新建条目（Ctrl+N）"
          onClick={onCreateEntry}
        >
          <Plus size={15} />
          新建
        </button>
      </div>

      {filterMode === 'calendar' ? (
        <label className="date-filter">
          <span>查看日期</span>
          <input
            type="date"
            value={selectedDate ?? ''}
            onChange={(event) => onSelectDate(event.target.value || null)}
          />
        </label>
      ) : null}

      <div className="filter-tags">
        <span className="filter-tags__label">
          <TagIcon size={11} />
          标签
        </span>
        <div className="filter-tags__scroller">
          {tags.length === 0 ? (
            <span className="empty-hint">在条目中创建第一个标签</span>
          ) : (
            tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className={
                  filterMode === 'tag' && selectedTagId === tag.id
                    ? 'tag-filter active'
                    : 'tag-filter'
                }
                aria-pressed={filterMode === 'tag' && selectedTagId === tag.id}
                onClick={() => onSelectTag(tag.id)}
              >
                <span className="tag-dot" style={{ backgroundColor: tag.color }} />
                {tag.name}
              </button>
            ))
          )}
        </div>
      </div>
    </aside>
  )
}
