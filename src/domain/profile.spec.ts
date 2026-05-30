import { describe, expect, it } from 'vitest'

import { InMemoryProfileStorage, createDefaultProfile } from './profile.js'

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
  it('stores and returns cloned profiles', () => {
    const storage = new InMemoryProfileStorage()
    const profile = createDefaultProfile()

    expect(storage.load()).toBeNull()
    storage.save(profile)

    const loaded = storage.load()

    expect(loaded).toEqual(profile)
    expect(loaded).not.toBe(profile)

    if (loaded !== null) loaded.level.runSeconds = 999

    expect(storage.load()).toEqual(profile)
  })
})
