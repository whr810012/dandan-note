import type { FilterMode, Tag } from '../types/entry'

type SidebarProps = {
  filterMode: FilterMode
  selectedTagId: string | null
  tags: Tag[]
  onFilterChange: (mode: FilterMode) => void
  onSelectTag: (tagId: string) => void
  onCreateEntry: () => void
}

export function Sidebar({
  filterMode,
  selectedTagId,
  tags,
  onFilterChange,
  onSelectTag,
  onCreateEntry,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <button type="button" className="primary-button" onClick={onCreateEntry}>
        + 新建
      </button>

      <nav className="sidebar__nav">
        <button
          type="button"
          className={filterMode === 'today' ? 'nav-item active' : 'nav-item'}
          onClick={() => onFilterChange('today')}
        >
          今日
        </button>
        <button
          type="button"
          className={filterMode === 'all' ? 'nav-item active' : 'nav-item'}
          onClick={() => onFilterChange('all')}
        >
          全部
        </button>
        <button
          type="button"
          className={filterMode === 'calendar' ? 'nav-item active' : 'nav-item'}
          onClick={() => onFilterChange('calendar')}
        >
          日期
        </button>
      </nav>

      <div className="sidebar__section">
        <div className="sidebar__section-title">标签</div>
        <div className="tag-list">
          {tags.length === 0 ? (
            <span className="empty-hint">还没有标签</span>
          ) : (
            tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className={selectedTagId === tag.id ? 'tag-filter active' : 'tag-filter'}
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
