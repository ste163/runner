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
