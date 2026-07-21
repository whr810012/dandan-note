import { isTauri } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart'
import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { EntryList, type EntryListHandle } from './components/EntryList'
import { SettingsPanel } from './components/SettingsPanel'
import { Sidebar } from './components/Sidebar'
import { SimpleBoard } from './components/SimpleBoard'
import { TitleBar } from './components/TitleBar'
import { useAppStore } from './stores/useAppStore'
import type { FilterMode, UiMode } from './types/entry'
import { filterStandardEntries } from './utils/date'

function App() {
  const {
    entries,
    tags,
    selectedEntryId,
    filterMode,
    selectedDate,
    selectedTagId,
    settings,
    loading,
    error,
    initialize,
    addEntry,
    selectEntry,
    setFilterMode,
    setSelectedDate,
    setSelectedTagId,
    saveEntry,
    updateSimpleContent,
    toggleSimpleComplete,
    removeEntry,
    addTag,
    setOpacity,
    setAlwaysOnTopSetting,
    setUiMode,
    toggleUiMode,
  } = useAppStore()

  const [autostartEnabled, setAutostartEnabled] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const listRef = useRef<EntryListHandle>(null)
  const isSimple = settings.uiMode === 'simple'
  const runningInTauri = isTauri()

  const filteredEntries = useMemo(
    () =>
      filterStandardEntries(entries, {
        mode: filterMode,
        selectedDate,
        selectedTagId,
      }),
    [entries, filterMode, selectedDate, selectedTagId],
  )

  const flushThen = async (action: () => void | Promise<void>) => {
    try {
      await listRef.current?.flush()
      await action()
    } catch {
      // 保存失败时保留当前编辑器，避免用户在不知情时丢失草稿。
    }
  }

  const handleCreateEntry = () => flushThen(addEntry)
  const handleFilterChange = (mode: FilterMode) => flushThen(() => setFilterMode(mode))
  const handleDateChange = (date: string | null) => flushThen(() => setSelectedDate(date))
  const handleTagSelect = (tagId: string) =>
    flushThen(() => {
      setSelectedTagId(tagId)
      setFilterMode('tag')
    })
  const handleUiModeChange = (mode: UiMode) => flushThen(() => setUiMode(mode))
  const handleToggleUiMode = () => flushThen(toggleUiMode)

  const handleClose = async () => {
    try {
      await listRef.current?.flush()
      if (runningInTauri) {
        await getCurrentWindow().close()
      }
    } catch {
      // 保存失败时窗口保持打开，编辑器会展示重试入口。
    }
  }

  async function handleAutostartChange(checked: boolean) {
    if (!runningInTauri) return
    try {
      if (checked) {
        await enable()
      } else {
        await disable()
      }
      setAutostartEnabled(checked)
    } catch {
      setAutostartEnabled(false)
    }
  }

  useEffect(() => {
    void initialize()
    if (runningInTauri) {
      void isEnabled().then(setAutostartEnabled).catch(() => setAutostartEnabled(false))
    }
  }, [initialize, runningInTauri])

  useEffect(() => {
    document.documentElement.style.setProperty('--window-opacity', String(settings.opacity))
    if (runningInTauri) {
      void getCurrentWindow().setAlwaysOnTop(settings.alwaysOnTop).catch(() => undefined)
    }
  }, [runningInTauri, settings.alwaysOnTop, settings.opacity])

  useEffect(() => {
    if (
      !isSimple &&
      selectedEntryId &&
      !filteredEntries.some((entry) => entry.id === selectedEntryId)
    ) {
      selectEntry(filteredEntries[0]?.id ?? null)
    }
  }, [filteredEntries, isSimple, selectEntry, selectedEntryId])

  useEffect(() => {
    if (isSimple) return
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        void (async () => {
          try {
            await listRef.current?.flush()
            await addEntry()
          } catch {
            // 保留当前草稿。
          }
        })()
      } else if (event.key === 'Escape' && selectedEntryId) {
        event.preventDefault()
        void listRef.current?.collapse()
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [addEntry, isSimple, selectedEntryId])

  return (
    <div className={isSimple ? 'app-shell app-shell--simple' : 'app-shell app-shell--standard'}>
      <TitleBar
        uiMode={settings.uiMode}
        alwaysOnTop={settings.alwaysOnTop}
        onToggleUiMode={handleToggleUiMode}
        onToggleAlwaysOnTop={() => setAlwaysOnTopSetting(!settings.alwaysOnTop)}
        onToggleSettings={() => setSettingsOpen((open) => !open)}
        onMinimize={() => {
          if (runningInTauri) void getCurrentWindow().minimize()
        }}
        onClose={() => void handleClose()}
      />

      {settingsOpen ? (
        <SettingsPanel
          opacity={settings.opacity}
          alwaysOnTop={settings.alwaysOnTop}
          autostartEnabled={autostartEnabled}
          uiMode={settings.uiMode}
          onOpacityChange={setOpacity}
          onAlwaysOnTopChange={setAlwaysOnTopSetting}
          onAutostartChange={(checked) => void handleAutostartChange(checked)}
          onUiModeChange={(mode) => void handleUiModeChange(mode)}
        />
      ) : null}

      {error ? (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button type="button" className="secondary-button" onClick={() => void initialize()}>
            重试
          </button>
        </div>
      ) : null}

      {isSimple ? (
        <SimpleBoard
          entries={entries}
          loading={loading}
          onAdd={addEntry}
          onToggleComplete={toggleSimpleComplete}
          onUpdateContent={updateSimpleContent}
          onDelete={removeEntry}
        />
      ) : (
        <div className="standard-workspace">
          <Sidebar
            filterMode={filterMode}
            selectedDate={selectedDate}
            selectedTagId={selectedTagId}
            tags={tags}
            onFilterChange={handleFilterChange}
            onSelectDate={handleDateChange}
            onSelectTag={handleTagSelect}
            onCreateEntry={handleCreateEntry}
          />

          <main className="standard-content">
            <div className="standard-content__heading">
              <div>
                <strong>
                  {filterMode === 'today'
                    ? '今天'
                    : filterMode === 'all'
                      ? '全部条目'
                      : filterMode === 'calendar'
                        ? '日期记录'
                        : '标签记录'}
                </strong>
                <span>{filteredEntries.length} 项</span>
              </div>
              <span>点击条目原位编辑</span>
            </div>

            <EntryList
              ref={listRef}
              entries={filteredEntries}
              allTags={tags}
              selectedEntryId={selectedEntryId}
              filterMode={filterMode}
              loading={loading}
              onSelect={selectEntry}
              onCreateEntry={handleCreateEntry}
              onSave={saveEntry}
              onDelete={removeEntry}
              onCreateTag={addTag}
            />
          </main>
        </div>
      )}
    </div>
  )
}

export default App
