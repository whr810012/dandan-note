import { create } from 'zustand'
import {
  bootstrapDb,
  createEntry,
  createTag,
  deleteEntry,
  listEntries,
  listTags,
  replaceEntryTags,
  updateEntry,
} from '../lib/db'
import type { AppSettings, EntryWithTags, FilterMode, Tag, UiMode } from '../types/entry'

const defaultSettings: AppSettings = {
  opacity: 0.75,
  alwaysOnTop: true,
  uiMode: 'simple',
}

function clampOpacity(value: unknown, fallback: number) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(1, Math.max(0, n))
}

function loadSettings(): AppSettings {
  const raw = localStorage.getItem('desktop-note-settings')
  if (!raw) return defaultSettings

  try {
    const parsed = { ...defaultSettings, ...(JSON.parse(raw) as Partial<AppSettings>) }
    parsed.opacity = clampOpacity(parsed.opacity, defaultSettings.opacity)
    return parsed
  } catch {
    return defaultSettings
  }
}

function persistSettings(settings: AppSettings) {
  localStorage.setItem('desktop-note-settings', JSON.stringify(settings))
}

type StoreState = {
  entries: EntryWithTags[]
  tags: Tag[]
  selectedEntryId: string | null
  filterMode: FilterMode
  selectedDate: string | null
  selectedTagId: string | null
  settings: AppSettings
  loading: boolean
  error: string | null
  initialize: () => Promise<void>
  refresh: () => Promise<void>
  addEntry: () => Promise<void>
  selectEntry: (entryId: string | null) => void
  setFilterMode: (mode: FilterMode) => void
  setSelectedDate: (date: string | null) => void
  setSelectedTagId: (tagId: string | null) => void
  saveEntry: (payload: {
    entryId: string
    title: string
    content: string
    dueDate: string | null
    isTodo: boolean
    completed: boolean
    tagIds: string[]
  }) => Promise<void>
  updateSimpleContent: (entryId: string, content: string) => Promise<void>
  toggleSimpleComplete: (entryId: string, completed: boolean) => Promise<void>
  removeEntry: (entryId: string) => Promise<void>
  addTag: (name: string) => Promise<Tag | null>
  setOpacity: (opacity: number) => void
  setAlwaysOnTopSetting: (alwaysOnTop: boolean) => void
  setUiMode: (uiMode: UiMode) => void
  toggleUiMode: () => void
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error)
}

export const useAppStore = create<StoreState>((set, get) => ({
  entries: [],
  tags: [],
  selectedEntryId: null,
  filterMode: 'all',
  selectedDate: new Date().toISOString().slice(0, 10),
  selectedTagId: null,
  settings: loadSettings(),
  loading: true,
  error: null,

  async initialize() {
    set({ loading: true, error: null })
    try {
      await bootstrapDb()
      await get().refresh()

      if (get().entries.length === 0) {
        await get().addEntry()
      }
    } catch (error) {
      console.error('initialize failed', error)
      set({ error: `本地数据加载失败：${toErrorMessage(error)}` })
    } finally {
      set({ loading: false })
    }
  },

  async refresh() {
    const [entries, tags] = await Promise.all([listEntries(), listTags()])
    const current = get().selectedEntryId
    const fallbackId = entries[0]?.id ?? null
    const nextSelectedId =
      current && entries.some((entry) => entry.id === current) ? current : fallbackId

    set({
      entries,
      tags,
      selectedEntryId: nextSelectedId,
      error: null,
    })
  },

  async addEntry() {
    try {
      const today = new Date().toISOString().slice(0, 10)
      const simple = get().settings.uiMode === 'simple'
      const entryId = await createEntry({
        title: simple ? '' : '新条目',
        dueDate: today,
        isTodo: true,
      })
      await get().refresh()
      set({
        selectedEntryId: entryId,
        filterMode: simple ? 'all' : 'today',
        selectedDate: today,
        selectedTagId: null,
      })
    } catch (error) {
      console.error('addEntry failed', error)
      set({ error: `新建失败：${toErrorMessage(error)}` })
    }
  },

  selectEntry(entryId) {
    set({ selectedEntryId: entryId })
  },

  setFilterMode(filterMode) {
    set({
      filterMode,
      selectedTagId: filterMode === 'tag' ? get().selectedTagId : null,
    })
  },

  setSelectedDate(selectedDate) {
    set({ selectedDate, filterMode: 'calendar', selectedTagId: null })
  },

  setSelectedTagId(selectedTagId) {
    set({ selectedTagId, filterMode: 'tag' })
  },

  async saveEntry(payload) {
    try {
      await updateEntry(payload.entryId, payload)
      await replaceEntryTags(payload.entryId, payload.tagIds)
      await get().refresh()
    } catch (error) {
      console.error('saveEntry failed', error)
      set({ error: `保存失败：${toErrorMessage(error)}` })
    }
  },

  async updateSimpleContent(entryId, content) {
    const entry = get().entries.find((item) => item.id === entryId)
    if (!entry) return

    const title = content.trim().split(/\r?\n/)[0]?.slice(0, 40) || '待办'

    try {
      await updateEntry(entryId, {
        title,
        content,
        dueDate: entry.dueDate,
        isTodo: true,
        completed: entry.completed,
      })
      await get().refresh()
    } catch (error) {
      console.error('updateSimpleContent failed', error)
      set({ error: `保存失败：${toErrorMessage(error)}` })
    }
  },

  async toggleSimpleComplete(entryId, completed) {
    const entry = get().entries.find((item) => item.id === entryId)
    if (!entry) return

    try {
      await updateEntry(entryId, {
        title: entry.title,
        content: entry.content,
        dueDate: entry.dueDate,
        isTodo: true,
        completed,
      })
      await get().refresh()
    } catch (error) {
      console.error('toggleSimpleComplete failed', error)
      set({ error: `更新失败：${toErrorMessage(error)}` })
    }
  },

  async removeEntry(entryId) {
    try {
      await deleteEntry(entryId)
      await get().refresh()
    } catch (error) {
      console.error('removeEntry failed', error)
      set({ error: `删除失败：${toErrorMessage(error)}` })
    }
  },

  async addTag(name) {
    try {
      const colors = ['#8b5cf6', '#14b8a6', '#f97316', '#ec4899', '#3b82f6']
      const tag = await createTag(name, colors[Math.floor(Math.random() * colors.length)])
      await get().refresh()
      return tag
    } catch (error) {
      console.error('addTag failed', error)
      set({ error: `添加标签失败：${toErrorMessage(error)}` })
      return null
    }
  },

  setOpacity(opacity) {
    const settings = { ...get().settings, opacity: clampOpacity(opacity, defaultSettings.opacity) }
    persistSettings(settings)
    set({ settings })
  },

  setAlwaysOnTopSetting(alwaysOnTop) {
    const settings = { ...get().settings, alwaysOnTop }
    persistSettings(settings)
    set({ settings })
  },

  setUiMode(uiMode) {
    const settings = { ...get().settings, uiMode }
    persistSettings(settings)
    set({
      settings,
      filterMode: uiMode === 'simple' ? 'all' : get().filterMode,
      selectedTagId: uiMode === 'simple' ? null : get().selectedTagId,
    })
  },

  toggleUiMode() {
    const next = get().settings.uiMode === 'simple' ? 'standard' : 'simple'
    get().setUiMode(next)
  },
}))
