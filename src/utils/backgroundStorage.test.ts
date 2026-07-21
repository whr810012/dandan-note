import { describe, expect, it } from 'vitest'
import {
  MAX_BACKGROUND_IMAGE_BYTES,
  isDarkBackgroundColor,
  normalizeBackgroundColor,
  validateBackgroundImage,
} from './backgroundStorage'

describe('背景颜色', () => {
  it('规范化六位和三位十六进制颜色', () => {
    expect(normalizeBackgroundColor(' #AABBCC ')).toBe('#aabbcc')
    expect(normalizeBackgroundColor('#AbC')).toBe('#aabbcc')
  })

  it('无效颜色回退到指定默认值', () => {
    expect(normalizeBackgroundColor('red', '#ffffff')).toBe('#ffffff')
    expect(normalizeBackgroundColor(null, '#ffffff')).toBe('#ffffff')
  })

  it('识别需要浅色文字的深色背景', () => {
    expect(isDarkBackgroundColor('#273044')).toBe(true)
    expect(isDarkBackgroundColor('#eef2f8')).toBe(false)
  })
})

describe('背景图片校验', () => {
  it('接受支持且不超过限制的图片', () => {
    expect(validateBackgroundImage({ type: 'image/png', size: 1024 })).toBeNull()
    expect(validateBackgroundImage({ type: 'image/jpeg', size: MAX_BACKGROUND_IMAGE_BYTES })).toBeNull()
    expect(validateBackgroundImage({ type: 'image/webp', size: 2048 })).toBeNull()
  })

  it('拒绝不支持、空白或过大的文件', () => {
    expect(validateBackgroundImage({ type: 'image/gif', size: 1024 })).toContain('仅支持')
    expect(validateBackgroundImage({ type: 'image/png', size: 0 })).toContain('为空')
    expect(
      validateBackgroundImage({ type: 'image/png', size: MAX_BACKGROUND_IMAGE_BYTES + 1 }),
    ).toContain('12 MB')
  })
})
