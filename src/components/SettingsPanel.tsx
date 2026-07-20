import type { UiMode } from '../types/entry'

type SettingsPanelProps = {
  opacity: number
  alwaysOnTop: boolean
  autostartEnabled: boolean
  uiMode: UiMode
  onOpacityChange: (value: number) => void
  onAlwaysOnTopChange: (checked: boolean) => void
  onAutostartChange: (checked: boolean) => void
  onUiModeChange: (mode: UiMode) => void
}

export function SettingsPanel({
  opacity,
  alwaysOnTop,
  autostartEnabled,
  uiMode,
  onOpacityChange,
  onAlwaysOnTopChange,
  onAutostartChange,
  onUiModeChange,
}: SettingsPanelProps) {
  const percent = Math.round(opacity * 100)

  return (
    <section className="settings-panel">
      <div className="settings-panel__header">
        <strong>设置</strong>
        <span>外观与启动</span>
      </div>

      <div className="setting-item setting-item--stack">
        <span>界面模式</span>
        <div className="mode-switch">
          <button
            type="button"
            className={uiMode === 'simple' ? 'mode-switch__btn active' : 'mode-switch__btn'}
            onClick={() => onUiModeChange('simple')}
          >
            简易模式
          </button>
          <button
            type="button"
            className={uiMode === 'standard' ? 'mode-switch__btn active' : 'mode-switch__btn'}
            onClick={() => onUiModeChange('standard')}
          >
            标准模式
          </button>
        </div>
      </div>

      <label className="setting-item setting-item--stack">
        <div className="setting-item__label-row">
          <span>背景透明度</span>
          <strong>{percent}%</strong>
        </div>
        <input
          className="opacity-slider"
          type="range"
          min="0"
          max="100"
          step="1"
          value={percent}
          onChange={(event) => onOpacityChange(Number(event.target.value) / 100)}
        />
        <div className="setting-item__hint">0% 全透明 · 100% 不透明</div>
      </label>

      <label className="setting-switch">
        <span>桌面常驻置顶</span>
        <input
          type="checkbox"
          checked={alwaysOnTop}
          onChange={(event) => onAlwaysOnTopChange(event.target.checked)}
        />
      </label>

      <label className="setting-switch">
        <span>开机启动</span>
        <input
          type="checkbox"
          checked={autostartEnabled}
          onChange={(event) => onAutostartChange(event.target.checked)}
        />
      </label>
    </section>
  )
}
