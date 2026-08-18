import { describe, expect, it } from 'vitest'
import { displayedSimpleContent, simpleContentNeedsSave } from './simpleContent'

describe('simpleContentNeedsSave', () => {
  it('saves when a middle newline is removed', () => {
    expect(simpleContentNeedsSave('（123）', '（123\n）')).toBe(true)
  })

  it('saves when only a trailing newline is removed', () => {
    expect(simpleContentNeedsSave('（123）', '（123）\n')).toBe(true)
  })

  it('does not save when the text is unchanged', () => {
    expect(simpleContentNeedsSave('（123）', '（123）')).toBe(false)
  })
})

describe('displayedSimpleContent', () => {
  it('uses content even when it is empty', () => {
    expect(displayedSimpleContent({ content: '', title: '待办' })).toBe('')
  })
})
