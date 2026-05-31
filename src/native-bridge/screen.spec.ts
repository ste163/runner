import { afterEach, describe, expect, it, vi } from 'vitest'

import { runnerScreen, type RunnerScreenModule } from './screen.js'

describe('screen bridge', () => {
  afterEach(() => {
    runnerScreen.configure(null)
  })

  it('does nothing when the native module is unavailable', () => {
    expect(() => runnerScreen.keepScreenOn(true)).not.toThrow()
    expect(() => runnerScreen.keepScreenOn(false)).not.toThrow()
  })

  it('calls through to the native screen module', () => {
    const module: RunnerScreenModule = {
      keepScreenOn: vi.fn(),
    }

    runnerScreen.configure(module)

    runnerScreen.keepScreenOn(true)
    runnerScreen.keepScreenOn(false)

    expect(module.keepScreenOn).toHaveBeenCalledTimes(2)
    expect(module.keepScreenOn).toHaveBeenNthCalledWith(1, true)
    expect(module.keepScreenOn).toHaveBeenNthCalledWith(2, false)
  })
})
