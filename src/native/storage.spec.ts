import { afterEach, describe, expect, it, vi } from 'vitest'

import { runnerProfileStorage } from './storage.js'
import { createDefaultProfile } from '../domain/profile.js'

describe('runner profile storage bridge', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does nothing when the native module is unavailable', () => {
    expect(runnerProfileStorage.load()).toBeNull()
    expect(() => runnerProfileStorage.save(createDefaultProfile())).not.toThrow()
    expect(() => runnerProfileStorage.reset()).not.toThrow()

    const exportResults: unknown[] = []
    const importResults: unknown[] = []

    expect(() =>
      runnerProfileStorage.exportProfile((result) => {
        exportResults.push(result)
      })
    ).not.toThrow()
    expect(() =>
      runnerProfileStorage.importProfile((result) => {
        importResults.push(result)
      })
    ).not.toThrow()

    expect(exportResults).toEqual([{ status: 'cancelled' }])
    expect(importResults).toEqual([{ status: 'cancelled' }])
  })

  it('calls through to the native storage module', () => {
    const profile = createDefaultProfile()
    const module = {
      exportProfile: vi.fn((callback: (status: string, detail: string | null) => void) => {
        callback('success', 'content://export')
      }),
      importProfile: vi.fn((callback: (status: string, detail: string | null) => void) => {
        callback('success', JSON.stringify(profile))
      }),
      loadProfileJson: vi.fn(() => JSON.stringify(profile)),
      resetProfile: vi.fn(),
      saveProfileJson: vi.fn(),
    }

    vi.stubGlobal('NativeModules', {
      RunnerStorageModule: module,
    })

    expect(runnerProfileStorage.load()).toEqual(profile)

    runnerProfileStorage.save(profile)
    runnerProfileStorage.reset()
    const exportResults: unknown[] = []
    const importResults: unknown[] = []

    runnerProfileStorage.exportProfile((result) => {
      exportResults.push(result)
    })

    expect(module.loadProfileJson).toHaveBeenCalledTimes(1)
    expect(module.saveProfileJson).toHaveBeenCalledWith(JSON.stringify(profile))
    expect(module.resetProfile).toHaveBeenCalledTimes(1)
    expect(module.exportProfile).toHaveBeenCalledTimes(1)
    expect(exportResults).toEqual([{ destinationUri: 'content://export', status: 'success' }])

    runnerProfileStorage.importProfile((result) => {
      importResults.push(result)
    })

    expect(module.importProfile).toHaveBeenCalledTimes(1)
    expect(importResults).toEqual([{ profile, status: 'success' }])
  })
})
