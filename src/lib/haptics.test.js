import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { haptics } from './haptics.js'

describe('haptics', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { vibrate: vi.fn() })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('light calls vibrate(8)', () => {
    haptics.light()
    expect(navigator.vibrate).toHaveBeenCalledWith(8)
  })

  it('medium calls vibrate(18)', () => {
    haptics.medium()
    expect(navigator.vibrate).toHaveBeenCalledWith(18)
  })

  it('success calls vibrate([10, 40, 10])', () => {
    haptics.success()
    expect(navigator.vibrate).toHaveBeenCalledWith([10, 40, 10])
  })

  it('warning calls vibrate(30)', () => {
    haptics.warning()
    expect(navigator.vibrate).toHaveBeenCalledWith(30)
  })

  it('does not throw when vibrate is undefined', () => {
    vi.stubGlobal('navigator', {})
    expect(() => haptics.light()).not.toThrow()
    expect(() => haptics.success()).not.toThrow()
  })
})
