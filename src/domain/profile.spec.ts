import { describe, expect, it, vi } from 'vitest'

import { InMemoryProfileStorage, SharedProfileStore, createDefaultProfile } from './profile.js'
import type { ExportProfileResult, ImportProfileResult } from '../native-bridge/storage.js'

describe('createDefaultProfile', () => {
  it('returns the starting training state', () => {
    expect(createDefaultProfile()).toEqual({
      schemaVersion: 1,
      level: { runSeconds: 30, walkSeconds: 120, intervalBlockSeconds: 1200 },
      window: { windowStart: '', consecutiveMissed: 0 },
      sessions: [],
    })
  })
})

describe('InMemoryProfileStorage', () => {
  it('returns cancelled results for export and import requests', () => {
    const storage = new InMemoryProfileStorage()
    const exportResults: unknown[] = []
    const importResults: unknown[] = []

    storage.exportProfile((result) => {
      exportResults.push(result)
    })
    storage.importProfile((result) => {
      importResults.push(result)
    })

    expect(exportResults).toEqual([{ status: 'cancelled' }])
    expect(importResults).toEqual([{ status: 'cancelled' }])
  })

  it('resets the saved profile', () => {
    const storage = new InMemoryProfileStorage()
    const profile = createDefaultProfile()

    storage.save(profile)
    storage.reset()

    expect(storage.load()).toBeNull()
  })

  it('returns null before save and deep clones profiles', () => {
    const storage = new InMemoryProfileStorage()
    const profile = {
      ...createDefaultProfile(),
      sessions: [
        {
          id: 'session-1',
          completedAt: '2024-01-01T00:00:00.000Z',
          level: createDefaultProfile().level,
          intervals: [
            {
              type: 'run' as const,
              durationSeconds: 30,
              distanceMiles: 0.25,
              avgPaceMinPerMile: 8,
            },
          ],
          totalDistanceMiles: 0.25,
        },
      ],
    }

    expect(storage.load()).toBeNull()
    storage.save(profile)

    const loaded = storage.load()

    expect(loaded).toEqual(profile)
    expect(loaded).not.toBe(profile)
    expect(loaded).not.toBeNull()
    expect(loaded!.sessions[0]).not.toBe(profile.sessions[0])
    expect(loaded!.sessions[0]?.intervals[0]).not.toBe(profile.sessions[0]?.intervals[0])
    loaded!.level.runSeconds = 999
    loaded!.sessions[0]!.intervals[0]!.durationSeconds = 999

    expect(storage.load()).toEqual(profile)
  })
})

describe('SharedProfileStore', () => {
  it('hydrates from storage and caches the profile', () => {
    const profile = {
      ...createDefaultProfile(),
      level: { runSeconds: 33, walkSeconds: 108, intervalBlockSeconds: 1200 },
    }
    const storage = {
      exportProfile: vi.fn(),
      importProfile: vi.fn(() => null),
      load: vi.fn(() => profile),
      reset: vi.fn(),
      save: vi.fn(),
    }
    const store = new SharedProfileStore(storage)

    const next = store.hydrate()

    expect(next).toEqual({ profile, isFirstLaunch: false })
    expect(storage.load).toHaveBeenCalledTimes(1)
    expect(storage.save).not.toHaveBeenCalled()
    expect(store.loadOrCreate()).toEqual({ profile, isFirstLaunch: false })
  })

  it('falls back to storage when loading without hydration', () => {
    const profile = {
      ...createDefaultProfile(),
      level: { runSeconds: 31, walkSeconds: 118, intervalBlockSeconds: 1200 },
    }
    const storage = {
      exportProfile: vi.fn(),
      importProfile: vi.fn(() => null),
      load: vi.fn(() => profile),
      reset: vi.fn(),
      save: vi.fn(),
    }
    const store = new SharedProfileStore(storage)

    expect(store.loadOrCreate()).toEqual({ profile, isFirstLaunch: false })
    expect(storage.load).toHaveBeenCalledTimes(1)
  })

  it('creates and saves the default profile on first launch', () => {
    const storage = {
      exportProfile: vi.fn(),
      importProfile: vi.fn(() => null),
      load: vi.fn(() => null),
      reset: vi.fn(),
      save: vi.fn(),
    }
    const store = new SharedProfileStore(storage)

    const next = store.hydrate()

    expect(next).toEqual({ profile: createDefaultProfile(), isFirstLaunch: true })
    expect(storage.save).toHaveBeenCalledWith(createDefaultProfile())
    expect(store.loadOrCreate()).toEqual({
      isFirstLaunch: false,
      profile: createDefaultProfile(),
    })
  })

  it('exports and imports profiles through storage', () => {
    const importedProfile = {
      ...createDefaultProfile(),
      level: { runSeconds: 35, walkSeconds: 108, intervalBlockSeconds: 1200 },
    }
    const storage = {
      exportProfile: vi.fn((callback: (result: ExportProfileResult) => void) => {
        callback({ destinationUri: 'content://export', status: 'success' })
      }),
      importProfile: vi.fn((callback: (result: ImportProfileResult) => void) => {
        callback({ profile: importedProfile, status: 'success' })
      }),
      load: vi.fn(() => null),
      reset: vi.fn(),
      save: vi.fn(),
    }
    const store = new SharedProfileStore(storage)
    const exportResults: unknown[] = []
    const importResults: unknown[] = []

    store.save(createDefaultProfile())
    store.exportProfile((result) => {
      exportResults.push(result)
    })

    expect(storage.exportProfile).toHaveBeenCalledTimes(1)
    expect(exportResults).toEqual([{ destinationUri: 'content://export', status: 'success' }])

    store.importProfile((result) => {
      importResults.push(result)
    })

    expect(storage.importProfile).toHaveBeenCalledTimes(1)
    expect(importResults).toEqual([{ profile: importedProfile, status: 'success' }])
    expect(store.loadOrCreate()).toEqual({ profile: importedProfile, isFirstLaunch: false })
  })

  it('forwards failed imports without changing the cached profile', () => {
    const storage = {
      exportProfile: vi.fn(),
      importProfile: vi.fn((callback: (result: ImportProfileResult) => void) => {
        callback({ message: 'Import failed.', status: 'error' })
      }),
      load: vi.fn(() => null),
      reset: vi.fn(),
      save: vi.fn(),
    }
    const store = new SharedProfileStore(storage)
    const importResults: unknown[] = []

    store.save({
      ...createDefaultProfile(),
      level: { runSeconds: 36, walkSeconds: 108, intervalBlockSeconds: 1200 },
    })

    store.importProfile((result) => {
      importResults.push(result)
    })

    expect(storage.importProfile).toHaveBeenCalledTimes(1)
    expect(importResults).toEqual([{ message: 'Import failed.', status: 'error' }])
    expect(store.loadOrCreate()).toEqual({
      isFirstLaunch: false,
      profile: {
        ...createDefaultProfile(),
        level: { runSeconds: 36, walkSeconds: 108, intervalBlockSeconds: 1200 },
      },
    })
  })

  it('keeps saved profiles in memory until reset', () => {
    const storage = {
      exportProfile: vi.fn(),
      importProfile: vi.fn(() => null),
      load: vi.fn(() => null),
      reset: vi.fn(),
      save: vi.fn(),
    }
    const store = new SharedProfileStore(storage)
    const profile = {
      ...createDefaultProfile(),
      level: { runSeconds: 35, walkSeconds: 100, intervalBlockSeconds: 1200 },
    }

    store.save(profile)

    expect(storage.save).toHaveBeenCalledWith(profile)
    expect(store.loadOrCreate()).toEqual({ profile, isFirstLaunch: false })

    store.reset()

    expect(storage.reset).toHaveBeenCalledTimes(1)
    expect(store.loadOrCreate()).toEqual({
      isFirstLaunch: false,
      profile: createDefaultProfile(),
    })
  })
})
