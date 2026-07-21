import { ImagePlus, Trash2 } from 'lucide-react'
import type { ChangeEvent } from 'react'
import type { UiMode } from '../types/entry'

const backgroundPresets = ['#eef2f8', '#fff8e8', '#eef8f4', '#f4efff', '#f8eef1', '#273044']

type SettingsPanelProps = {
  opacity: number
  backgroundColor: string
  backgroundImageUrl: string | null
  backgroundImageLoading: boolean
  backgroundError: string | null
  alwaysOnTop: boolean
  autostartEnabled: boolean
  uiMode: UiMode
  onOpacityChange: (value: number) => void
  onBackgroundColorChange: (value: string) => void
  onBackgroundImageChange: (file: File) => Promise<void>
  onRemoveBackgroundImage: () => Promise<void>
  onAlwaysOnTopChange: (checked: boolean) => void
  onAutostartChange: (checked: boolean) => void
  onUiModeChange: (mode: UiMode) => void
}

export function SettingsPanel({
  opacity,
  backgroundColor,
  backgroundImageUrl,
  backgroundImageLoading,
  backgroundError,
  alwaysOnTop,
  autostartEnabled,
  uiMode,
  onOpacityChange,
  onBackgroundColorChange,
  onBackgroundImageChange,
  onRemoveBackgroundImage,
  onAlwaysOnTopChange,
  onAutostartChange,
  onUiModeChange,
}: SettingsPanelProps) {
  const percent = Math.round(opacity * 100)

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void onBackgroundImageChange(file).catch(() => undefined)
  }

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
            aria-pressed={uiMode === 'simple'}
            onClick={() => onUiModeChange('simple')}
          >
            简易模式
          </button>
          <button
            type="button"
            className={uiMode === 'standard' ? 'mode-switch__btn active' : 'mode-switch__btn'}
            aria-pressed={uiMode === 'standard'}
            onClick={() => onUiModeChange('standard')}
          >
            标准模式
          </button>
        </div>
      </div>

      <div className="setting-item setting-item--stack background-setting">
        <div className="setting-item__label-row">
          <span>背景颜色</span>
          <code>{backgroundColor.toUpperCase()}</code>
        </div>
        <div className="background-color-row">
          <label className="background-color-picker" title="自定义背景颜色">
            <input
              type="color"
              value={backgroundColor}
              aria-label="选择背景颜色"
              onChange={(event) => onBackgroundColorChange(event.target.value)}
            />
            <span style={{ backgroundColor }} />
          </label>
          <div className="background-presets" aria-label="背景颜色快捷选择">
            {backgroundPresets.map((color) => (
              <button
                type="button"
                key={color}
                className={backgroundColor === color ? 'background-swatch active' : 'background-swatch'}
                style={{ backgroundColor: color }}
                aria-label={`使用背景色 ${color}`}
                aria-pressed={backgroundColor === color}
                onClick={() => onBackgroundColorChange(color)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="setting-item setting-item--stack background-setting">
        <div className="setting-item__label-row">
          <span>背景图片</span>
          <small>PNG / JPEG / WebP · 12 MB 内</small>
        </div>

        {backgroundImageUrl ? (
          <div
            className="background-preview"
            role="img"
            aria-label="当前背景图片预览"
            style={{ backgroundImage: `url("${backgroundImageUrl}")` }}
          >
            <span>当前背景</span>
          </div>
        ) : (
          <div className="background-preview background-preview--empty">
            <ImagePlus size={18} aria-hidden="true" />
            <span>还没有背景图片</span>
          </div>
        )}

        <div className="background-image-actions">
          <label
            className={
              backgroundImageLoading
                ? 'background-upload background-upload--disabled'
                : 'background-upload'
            }
          >
            <ImagePlus size={13} aria-hidden="true" />
            {backgroundImageLoading ? '处理中…' : backgroundImageUrl ? '替换图片' : '上传图片'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={backgroundImageLoading}
              aria-label={backgroundImageUrl ? '替换背景图片' : '上传背景图片'}
              onChange={handleImageChange}
            />
          </label>
          {backgroundImageUrl ? (
            <button
              type="button"
              className="background-remove"
              disabled={backgroundImageLoading}
              onClick={() => void onRemoveBackgroundImage().catch(() => undefined)}
            >
              <Trash2 size={13} aria-hidden="true" />
              移除
            </button>
          ) : null}
        </div>

        <div className={backgroundError ? 'background-status error' : 'background-status'} aria-live="polite">
          {backgroundError ?? '图片仅保存在本机，并在两种模式中共用'}
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
          aria-label="背景透明度"
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
