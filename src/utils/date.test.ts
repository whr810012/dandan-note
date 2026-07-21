import { describe, expect, it } from 'vitest'
import type { EntryWithTags } from '../types/entry'
import {
  filterStandardEntries,
  formatShortDate,
  isoToLocalDateKey,
  isOverdue,
  toLocalDateKey,
} from './date'

const tag = { id: 'work', name: '工作', color: '#6366f1', createdAt: '2026-07-01' }

function entry(
  id: string,
  patch: Partial<EntryWithTags> = {},
): EntryWithTags {
  return {
    id,
    title: id,
    content: '',
    dueDate: null,
    isTodo: false,
    completed: false,
    createdAt: new Date(2026, 6, 20, 12).toISOString(),
    updatedAt: new Date(2026, 6, 20, 12).toISOString(),
    tags: [],
    ...patch,
  }
}

describe('本地日期工具', () => {
  it('使用本地年月日，不受 UTC 跨日影响', () => {
    const localTime = new Date(2026, 6, 21, 0, 30)
    expect(toLocalDateKey(localTime)).toBe('2026-07-21')
    expect(isoToLocalDateKey(localTime.toISOString())).toBe('2026-07-21')
  })

  it('格式化紧凑日期并识别逾期待办', () => {
    expect(formatShortDate('2026-07-03')).toBe('7月3日')
    expect(isOverdue(entry('late', { dueDate: '2026-07-20', isTodo: true }), '2026-07-21')).toBe(
      true,
    )
    expect(
      isOverdue(
        entry('done', { dueDate: '2026-07-20', isTodo: true, completed: true }),
        '2026-07-21',
      ),
    ).toBe(false)
  })
})

describe('标准模式筛选', () => {
  const entries = [
    entry('created-today', { createdAt: new Date(2026, 6, 21, 8).toISOString() }),
    entry('due-today', { dueDate: '2026-07-21', isTodo: true, completed: true }),
    entry('overdue', { dueDate: '2026-07-20', isTodo: true }),
    entry('overdue-done', { dueDate: '2026-07-20', isTodo: true, completed: true }),
    entry('future', {
      dueDate: '2026-07-22',
      isTodo: true,
      createdAt: new Date(2026, 6, 21, 9).toISOString(),
    }),
    entry('tagged', { tags: [tag] }),
  ]

  it('今日包含今日创建、今日到期和未完成逾期项', () => {
    const result = filterStandardEntries(entries, {
      mode: 'today',
      selectedDate: null,
      selectedTagId: null,
      today: '2026-07-21',
    })
    expect(result.map((item) => item.id)).toEqual(['created-today', 'due-today', 'overdue'])
  })

  it('日期筛选严格匹配，未选日期时返回空列表', () => {
    expect(
      filterStandardEntries(entries, {
        mode: 'calendar',
        selectedDate: '2026-07-22',
        selectedTagId: null,
      }).map((item) => item.id),
    ).toEqual(['future'])
    expect(
      filterStandardEntries(entries, {
        mode: 'calendar',
        selectedDate: null,
        selectedTagId: null,
      }),
    ).toEqual([])
  })

  it('标签筛选只返回包含目标标签的条目', () => {
    expect(
      filterStandardEntries(entries, {
        mode: 'tag',
        selectedDate: null,
        selectedTagId: tag.id,
      }).map((item) => item.id),
    ).toEqual(['tagged'])
  })
})
