import { afterEach, describe, expect, it, vi } from 'vitest'

import { runnerHaptics, type WorkoutHaptics } from './haptics.js'

describe('haptics bridge', () => {
  afterEach(() => {
    runnerHaptics.configure(null)
  })

  it('does nothing when the native module is unavailable', () => {
    expect(() => runnerHaptics.cancel()).not.toThrow()
    expect(() => runnerHaptics.vibrate(200)).not.toThrow()
  })

  it('calls through to the native runner haptics module', () => {
    const module: WorkoutHaptics = {
      cancel: vi.fn(),
      vibrate: vi.fn(),
    }

    runnerHaptics.configure(module)

    runnerHaptics.cancel()
    runnerHaptics.vibrate(500)

    expect(module.cancel).toHaveBeenCalledTimes(1)
    expect(module.vibrate).toHaveBeenCalledTimes(1)
    expect(module.vibrate).toHaveBeenCalledWith(500)
  })
})
