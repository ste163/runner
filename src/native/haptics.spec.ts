import { afterEach, describe, expect, it, vi } from 'vitest'

import { cancelRunnerHaptics, vibrateRunnerHaptics } from './haptics.js'

describe('haptics bridge', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does nothing when the native module is unavailable', () => {
    expect(() => cancelRunnerHaptics()).not.toThrow()
    expect(() => vibrateRunnerHaptics(200)).not.toThrow()
  })

  it('does nothing when NativeModules exists without the haptic module', () => {
    vi.stubGlobal('NativeModules', {})

    expect(() => cancelRunnerHaptics()).not.toThrow()
    expect(() => vibrateRunnerHaptics(200)).not.toThrow()
  })

  it('calls through to the native runner haptics module', () => {
    const module = {
      cancel: vi.fn(),
      vibrate: vi.fn(),
    }

    vi.stubGlobal('NativeModules', {
      RunnerHapticModule: module,
    })

    cancelRunnerHaptics()
    vibrateRunnerHaptics(500)

    expect(module.cancel).toHaveBeenCalledTimes(1)
    expect(module.vibrate).toHaveBeenCalledTimes(1)
    expect(module.vibrate).toHaveBeenCalledWith(500)
  })
})
