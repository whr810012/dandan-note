import { useEffect, useMemo, useState } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart'
import './App.css'
import { EntryEditor } from './components/EntryEditor'
import { EntryList } from './components/EntryList'
import { SettingsPanel } from './components/SettingsPanel'
import { Sidebar } from './components/Sidebar'
import { SimpleBoard } from './components/SimpleBoard'
import { TitleBar } from './components/TitleBar'
import { useAppStore } from './stores/useAppStore'

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

  useEffect(() => {
    void initialize()
    void isEnabled().then(setAutostartEnabled).catch(() => setAutostartEnabled(false))
  }, [initialize])

  useEffect(() => {
    document.documentElement.style.setProperty('--window-opacity', String(settings.opacity))
    void getCurrentWindow().setAlwaysOnTop(settings.alwaysOnTop).catch(() => undefined)
  }, [settings.alwaysOnTop, settings.opacity])

  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) ?? null
  const isSimple = settings.uiMode === 'simple'

  const filteredEntries = useMemo(() => {
    if (isSimple) return entries

    const today = new Date().toISOString().slice(0, 10)

    return entries.filter((entry) => {
      if (filterMode === 'all') return true
      if (filterMode === 'today') {
        return entry.dueDate === today || entry.createdAt.slice(0, 10) === today
      }
      if (filterMode === 'calendar') {
        return selectedDate ? entry.dueDate === selectedDate : true
      }
      if (filterMode === 'tag') {
        return selectedTagId
          ? entry.tags.some((tag) => tag.id === selectedTagId)
          : true
      }
      return true
    })
  }, [entries, filterMode, isSimple, selectedDate, selectedTagId])

  async function handleToggleAlwaysOnTop() {
    setAlwaysOnTopSetting(!settings.alwaysOnTop)
  }

  async function handleAutostartChange(checked: boolean) {
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

  return (
    <div className={isSimple ? 'app-shell app-shell--simple' : 'app-shell'}>
      <TitleBar
        uiMode={settings.uiMode}
        alwaysOnTop={settings.alwaysOnTop}
        onToggleUiMode={toggleUiMode}
        onToggleAlwaysOnTop={() => void handleToggleAlwaysOnTop()}
        onToggleSettings={() => setSettingsOpen((open) => !open)}
        onMinimize={() => void getCurrentWindow().minimize()}
        onClose={() => void getCurrentWindow().close()}
      />

      {settingsOpen ? (
        <SettingsPanel
          opacity={settings.opacity}
          alwaysOnTop={settings.alwaysOnTop}
          autostartEnabled={autostartEnabled}
          uiMode={settings.uiMode}
          onOpacityChange={setOpacity}
          onAlwaysOnTopChange={(checked) => setAlwaysOnTopSetting(checked)}
          onAutostartChange={(checked) => void handleAutostartChange(checked)}
          onUiModeChange={setUiMode}
        />
      ) : null}

      {error ? (
        <div className="error-banner">
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
        <>
          <div className="toolbar">
            <input
              className="toolbar__date"
              type="date"
              value={selectedDate ?? ''}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
            <span className="toolbar__hint">
              {loading ? '正在加载本地数据…' : error ? error : `共 ${filteredEntries.length} 条`}
            </span>
          </div>

          <div className="workspace">
            <Sidebar
              filterMode={filterMode}
              selectedTagId={selectedTagId}
              tags={tags}
              onFilterChange={setFilterMode}
              onSelectTag={setSelectedTagId}
              onCreateEntry={() => void addEntry()}
            />

            <main className="content">
              <section className="panel panel--list">
                <EntryList
                  entries={filteredEntries}
                  selectedEntryId={selectedEntryId}
                  onSelect={selectEntry}
                />
              </section>

              <section className="panel panel--editor">
                <EntryEditor
                  entry={selectedEntry}
                  allTags={tags}
                  onSave={saveEntry}
                  onDelete={removeEntry}
                  onCreateTag={addTag}
                />
              </section>
            </main>
          </div>
        </>
      )}
    </div>
  )
}

export default App
