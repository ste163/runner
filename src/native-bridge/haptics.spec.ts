import { afterEach, describe, expect, it, vi } from 'vitest'

import { runnerHaptics, type WorkoutHaptics } from './haptics.js'

describe('haptics bridge', () => {
  afterEach(() => {
    runnerHaptics.configure(null)
  })

  it('does nothing when the native module is unavailable', () => {
    expect(() => runnerHaptics.cancel()).not.toThrow()
    expect(() => runnerHaptics.vibratePattern([0, 200])).not.toThrow()
  })

  it('calls through to the native runner haptics module', () => {
    const module: WorkoutHaptics = {
      cancel: vi.fn(),
      vibratePattern: vi.fn(),
    }

    runnerHaptics.configure(module)

    runnerHaptics.cancel()
    runnerHaptics.vibratePattern([0, 500])

    expect(module.cancel).toHaveBeenCalledTimes(1)
    expect(module.vibratePattern).toHaveBeenCalledTimes(1)
    expect(module.vibratePattern).toHaveBeenCalledWith('[0,500]')
  })

  it('serializes multi-segment patterns as JSON', () => {
    const module: WorkoutHaptics = {
      cancel: vi.fn(),
      vibratePattern: vi.fn(),
    }

    runnerHaptics.configure(module)
    runnerHaptics.vibratePattern([0, 60, 90, 60])

    expect(module.vibratePattern).toHaveBeenCalledWith('[0,60,90,60]')
  })
})
