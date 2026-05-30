import { describe, expect, it } from 'vitest'

import { adjustLevelManually, evaluateWindows } from './progression.js'
import type { TrainingProfile } from './types.js'

const createProfile = (overrides: Partial<TrainingProfile> = {}): TrainingProfile => ({
  schemaVersion: 1,
  level: {
    runSeconds: 30,
    walkSeconds: 120,
    intervalBlockSeconds: 1200,
    ...overrides.level,
  },
  window: {
    windowStart: '2024-01-01T00:00:00.000Z',
    consecutiveMissed: 0,
    ...overrides.window,
  },
  sessions: overrides.sessions ?? [],
})

const createSession = (completedAt: string): TrainingProfile['sessions'][number] => ({
  id: completedAt,
  completedAt,
  level: {
    runSeconds: 30,
    walkSeconds: 120,
    intervalBlockSeconds: 1200,
  },
  intervals: [],
  totalDistanceMiles: 0,
})

describe('evaluateWindows', () => {
  it('progresses after a successful 7-day window', () => {
    const updated = evaluateWindows(
      createProfile({
        sessions: [
          createSession('2024-01-02T00:00:00.000Z'),
          createSession('2024-01-03T00:00:00.000Z'),
          createSession('2024-01-04T00:00:00.000Z'),
        ],
      }),
      new Date('2024-01-08T00:00:00.000Z')
    )

    expect(updated.level).toEqual({ runSeconds: 33, walkSeconds: 108, intervalBlockSeconds: 1200 })
    expect(updated.window).toEqual({
      windowStart: '2024-01-08T00:00:00.000Z',
      consecutiveMissed: 0,
    })
  })

  it('regresses on the second consecutive missed window', () => {
    const updated = evaluateWindows(createProfile(), new Date('2024-01-15T00:00:00.000Z'))

    expect(updated.level).toEqual({ runSeconds: 27, walkSeconds: 132, intervalBlockSeconds: 1200 })
    expect(updated.window).toEqual({
      windowStart: '2024-01-15T00:00:00.000Z',
      consecutiveMissed: 2,
    })
  })

  it('applies regression for every missed window after the first miss', () => {
    const updated = evaluateWindows(createProfile(), new Date('2024-01-22T00:00:00.000Z'))

    expect(updated.level.runSeconds).toBeCloseTo(24.3)
    expect(updated.level.walkSeconds).toBeCloseTo(145.2)
    expect(updated.window.consecutiveMissed).toBe(3)
  })
})

describe('adjustLevelManually', () => {
  it('increases run and decreases walk', () => {
    expect(
      adjustLevelManually(
        {
          runSeconds: 30,
          walkSeconds: 120,
          intervalBlockSeconds: 1200,
        },
        'up'
      )
    ).toEqual({ runSeconds: 33, walkSeconds: 108, intervalBlockSeconds: 1200 })
  })

  it('clamps levels to bounds when decreasing', () => {
    expect(
      adjustLevelManually(
        {
          runSeconds: 15.5,
          walkSeconds: 299,
          intervalBlockSeconds: 1200,
        },
        'down'
      )
    ).toEqual({ runSeconds: 15, walkSeconds: 300, intervalBlockSeconds: 1200 })
  })

  it('clamps runSeconds to the interval block when increasing', () => {
    expect(
      adjustLevelManually(
        {
          runSeconds: 1190,
          walkSeconds: 120,
          intervalBlockSeconds: 1200,
        },
        'up'
      )
    ).toEqual({ runSeconds: 1200, walkSeconds: 108, intervalBlockSeconds: 1200 })
  })
})
