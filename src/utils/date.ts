import type { EntryWithTags, FilterMode } from '../types/entry'

export function toLocalDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isoToLocalDateKey(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value.slice(0, 10) : toLocalDateKey(date)
}

export function formatShortDate(value: string | null) {
  if (!value) return '无日期'
  const [, month, day] = value.split('-')
  return month && day ? `${Number(month)}月${Number(day)}日` : value
}

export function isOverdue(entry: EntryWithTags, today = toLocalDateKey()) {
  return Boolean(entry.dueDate && entry.dueDate < today && entry.isTodo && !entry.completed)
}

export function filterStandardEntries(
  entries: EntryWithTags[],
  options: {
    mode: FilterMode
    selectedDate: string | null
    selectedTagId: string | null
    today?: string
  },
) {
  const today = options.today ?? toLocalDateKey()

  return entries.filter((entry) => {
    if (options.mode === 'all') return true
    if (options.mode === 'today') {
      if (entry.dueDate) {
        return entry.dueDate === today || (entry.dueDate < today && entry.isTodo && !entry.completed)
      }
      return isoToLocalDateKey(entry.createdAt) === today
    }
    if (options.mode === 'calendar') {
      return Boolean(options.selectedDate && entry.dueDate === options.selectedDate)
    }
    if (options.mode === 'tag') {
      return Boolean(
        options.selectedTagId &&
          entry.tags.some((tag) => tag.id === options.selectedTagId),
      )
    }
    return true
  })
}
