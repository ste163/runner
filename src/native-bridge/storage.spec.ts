import { afterEach, describe, expect, it, vi } from 'vitest'

import { createDefaultProfile } from '../domain/profile.js'
import { runnerProfileStorage, type RunnerStorageModule } from './storage.js'

describe('runner profile storage bridge', () => {
  afterEach(() => {
    runnerProfileStorage.configure(null)
    vi.restoreAllMocks()
  })

  it('does nothing when it is not configured', () => {
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
    const module: RunnerStorageModule = {
      exportProfile: vi.fn((callback) => {
        callback('success', 'content://export')
      }),
      importProfile: vi.fn((callback) => {
        callback('success', JSON.stringify(profile))
      }),
      loadProfileJson: vi.fn(() => JSON.stringify(profile)),
      resetProfile: vi.fn(),
      saveProfileJson: vi.fn(),
    }

    runnerProfileStorage.configure(module)

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

  it('returns null when the native storage load is empty', () => {
    const module: RunnerStorageModule = {
      exportProfile: vi.fn(),
      importProfile: vi.fn(),
      loadProfileJson: vi.fn(() => null),
      resetProfile: vi.fn(),
      saveProfileJson: vi.fn(),
    }

    runnerProfileStorage.configure(module)

    expect(runnerProfileStorage.load()).toBeNull()
    expect(module.loadProfileJson).toHaveBeenCalledTimes(1)
  })

  it('normalizes cancelled and failed native results', () => {
    const importProfileJson = JSON.stringify(createDefaultProfile())
    const module: RunnerStorageModule = {
      exportProfile: vi
        .fn()
        .mockImplementationOnce((callback) => {
          callback('cancelled', null)
        })
        .mockImplementationOnce((callback) => {
          callback('error', 'Export failed.')
        }),
      importProfile: vi
        .fn()
        .mockImplementationOnce((callback) => {
          callback('success', null)
        })
        .mockImplementationOnce((callback) => {
          callback('cancelled', null)
        })
        .mockImplementationOnce((callback) => {
          callback('error', 'Import failed.')
        })
        .mockImplementationOnce((callback) => {
          callback('success', 'not-json')
        })
        .mockImplementationOnce((callback) => {
          callback('success', importProfileJson)
        }),
      loadProfileJson: vi.fn(() => null),
      resetProfile: vi.fn(),
      saveProfileJson: vi.fn(),
    }

    runnerProfileStorage.configure(module)

    const exportResults: unknown[] = []
    const importResults: unknown[] = []

    runnerProfileStorage.exportProfile((result) => {
      exportResults.push(result)
    })
    runnerProfileStorage.exportProfile((result) => {
      exportResults.push(result)
    })

    runnerProfileStorage.importProfile((result) => {
      importResults.push(result)
    })
    runnerProfileStorage.importProfile((result) => {
      importResults.push(result)
    })
    runnerProfileStorage.importProfile((result) => {
      importResults.push(result)
    })
    runnerProfileStorage.importProfile((result) => {
      importResults.push(result)
    })
    runnerProfileStorage.importProfile((result) => {
      importResults.push(result)
    })

    expect(exportResults).toEqual([
      { status: 'cancelled' },
      { message: 'Export failed.', status: 'error' },
    ])
    expect(importResults).toEqual([
      { message: 'Import failed.', status: 'error' },
      { status: 'cancelled' },
      { message: 'Import failed.', status: 'error' },
      expect.objectContaining({ status: 'error' }),
      { profile: createDefaultProfile(), status: 'success' },
    ])
  })

  it('uses fallback messages when native details are missing or invalid', () => {
    const module: RunnerStorageModule = {
      exportProfile: vi
        .fn()
        .mockImplementationOnce((callback) => {
          callback('success', null)
        })
        .mockImplementationOnce((callback) => {
          callback('error', null)
        }),
      importProfile: vi.fn((callback) => {
        callback('success', 'invalid-json')
      }),
      loadProfileJson: vi.fn(() => null),
      resetProfile: vi.fn(),
      saveProfileJson: vi.fn(),
    }

    const parseSpy = vi.spyOn(JSON, 'parse').mockImplementationOnce(() => {
      throw 'invalid-json'
    })

    runnerProfileStorage.configure(module)

    const exportResults: unknown[] = []
    const importResults: unknown[] = []

    runnerProfileStorage.exportProfile((result) => {
      exportResults.push(result)
    })
    runnerProfileStorage.exportProfile((result) => {
      exportResults.push(result)
    })
    runnerProfileStorage.importProfile((result) => {
      importResults.push(result)
    })

    expect(parseSpy).toHaveBeenCalledTimes(1)
    expect(exportResults).toEqual([
      { destinationUri: '', status: 'success' },
      { message: 'Export failed.', status: 'error' },
    ])
    expect(importResults).toEqual([{ message: 'Invalid profile data.', status: 'error' }])
  })
})
