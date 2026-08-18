import { invoke, isTauri } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { isEnabled } from '@tauri-apps/plugin-autostart'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import './App.css'
import { EntryList, type EntryListHandle } from './components/EntryList'
import { SettingsPanel } from './components/SettingsPanel'
import { Sidebar } from './components/Sidebar'
import { SimpleBoard, type SimpleBoardHandle } from './components/SimpleBoard'
import { TitleBar } from './components/TitleBar'
import { useAppStore } from './stores/useAppStore'
import type { FilterMode, UiMode } from './types/entry'
import { isDarkBackgroundColor } from './utils/backgroundStorage'
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
    backgroundImageUrl,
    backgroundImageLoading,
    backgroundError,
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
    setBackgroundColor,
    setBackgroundImage,
    removeBackgroundImage,
    setAlwaysOnTopSetting,
    setUiMode,
    toggleUiMode,
  } = useAppStore()

  const [autostartEnabled, setAutostartEnabled] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const listRef = useRef<EntryListHandle>(null)
  const simpleBoardRef = useRef<SimpleBoardHandle>(null)
  const isSimple = settings.uiMode === 'simple'
  const runningInTauri = isTauri()
  const appStyle = {
    '--window-background-color': settings.backgroundColor,
    '--window-background-image': backgroundImageUrl
      ? `url("${backgroundImageUrl}")`
      : 'none',
  } as CSSProperties

  const filteredEntries = useMemo(
    () =>
      filterStandardEntries(entries, {
        mode: filterMode,
        selectedDate,
        selectedTagId,
      }),
    [entries, filterMode, selectedDate, selectedTagId],
  )

  const flushPending = async () => {
    await Promise.all([
      listRef.current?.flush() ?? Promise.resolve(),
      simpleBoardRef.current?.flush() ?? Promise.resolve(),
    ])
  }

  const flushThen = async (action: () => void | Promise<void>) => {
    try {
      await flushPending()
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

  const flushPendingRef = useRef(flushPending)
  flushPendingRef.current = flushPending

  const handleClose = async () => {
    try {
      await flushPending()
      if (runningInTauri) {
        await getCurrentWindow().destroy()
      }
    } catch {
      // 保存失败时窗口保持打开，编辑器会展示重试入口。
    }
  }

  async function handleAutostartChange(checked: boolean) {
    if (!runningInTauri) return
    try {
      const actual = await invoke<boolean>('set_autostart', { enabled: checked })
      setAutostartEnabled(actual)
    } catch {
      const actual = await isEnabled().catch(() => !checked)
      setAutostartEnabled(actual)
    }
  }

  useEffect(() => {
    void initialize()
    if (runningInTauri) {
      void isEnabled().then(setAutostartEnabled).catch(() => setAutostartEnabled(false))
    }
  }, [initialize, runningInTauri])

  useEffect(() => {
    if (!runningInTauri) return
    const currentWindow = getCurrentWindow()
    let disposed = false
    let unlisten: (() => void) | undefined

    void currentWindow
      .onCloseRequested(async (event) => {
        event.preventDefault()
        try {
          await flushPendingRef.current()
        } catch {
          return
        }
        unlisten?.()
        await currentWindow.destroy()
      })
      .then((fn) => {
        if (disposed) fn()
        else unlisten = fn
      })

    return () => {
      disposed = true
      unlisten?.()
    }
  }, [runningInTauri])

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
            await flushPending()
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
  }, [addEntry, flushPending, isSimple, selectedEntryId])

  return (
    <div
      className={[
        'app-shell',
        isSimple ? 'app-shell--simple' : 'app-shell--standard',
        backgroundImageUrl ? 'app-shell--has-background-image' : '',
        !backgroundImageUrl && isDarkBackgroundColor(settings.backgroundColor)
          ? 'app-shell--dark-background'
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={appStyle}
    >
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
          backgroundColor={settings.backgroundColor}
          backgroundImageUrl={backgroundImageUrl}
          backgroundImageLoading={backgroundImageLoading}
          backgroundError={backgroundError}
          alwaysOnTop={settings.alwaysOnTop}
          autostartEnabled={autostartEnabled}
          uiMode={settings.uiMode}
          onOpacityChange={setOpacity}
          onBackgroundColorChange={setBackgroundColor}
          onBackgroundImageChange={setBackgroundImage}
          onRemoveBackgroundImage={removeBackgroundImage}
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
          ref={simpleBoardRef}
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
