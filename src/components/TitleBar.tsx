import { LayoutList, ListTodo, Minus, Pin, PinOff, Settings, X } from 'lucide-react'
import type { UiMode } from '../types/entry'

type TitleBarProps = {
  uiMode: UiMode
  alwaysOnTop: boolean
  onToggleUiMode: () => void
  onToggleAlwaysOnTop: () => void
  onToggleSettings: () => void
  onMinimize: () => void
  onClose: () => void
}

export function TitleBar({
  uiMode,
  alwaysOnTop,
  onToggleUiMode,
  onToggleAlwaysOnTop,
  onToggleSettings,
  onMinimize,
  onClose,
}: TitleBarProps) {
  const isSimple = uiMode === 'simple'

  return (
    <header className="title-bar" data-tauri-drag-region>
      <div className="title-bar__brand" data-tauri-drag-region>
        <span className="title-bar__dot" />
        <div data-tauri-drag-region>
          <strong>蛋蛋便签</strong>
          <small>{isSimple ? '便签' : '标准模式 · 日期 · 标签'}</small>
        </div>
      </div>

      <div className="title-bar__actions">
        <button
          type="button"
          className={isSimple ? 'icon-button icon-button--active' : 'icon-button'}
          onClick={onToggleUiMode}
          title={isSimple ? '切换到标准模式' : '切换到简易模式'}
        >
          {isSimple ? <ListTodo size={14} /> : <LayoutList size={14} />}
        </button>
        <button type="button" className="icon-button" onClick={onToggleAlwaysOnTop}>
          {alwaysOnTop ? <Pin size={14} /> : <PinOff size={14} />}
        </button>
        <button type="button" className="icon-button" onClick={onToggleSettings}>
          <Settings size={14} />
        </button>
        <button type="button" className="icon-button" onClick={onMinimize}>
          <Minus size={14} />
        </button>
        <button type="button" className="icon-button icon-button--danger" onClick={onClose}>
          <X size={14} />
        </button>
      </div>
    </header>
  )
}
