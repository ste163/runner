import { describe, expect, it } from 'vitest'

import { adjustLevelManually, evaluateWindows, RUN_LADDER } from './progression.js'
import type { TrainingProfile } from './types.js'

const createProfile = (overrides: Partial<TrainingProfile> = {}): TrainingProfile => ({
  schemaVersion: 1,
  level: {
    runSeconds: 30,
    walkSeconds: 90,
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
    walkSeconds: 90,
    intervalBlockSeconds: 1200,
  },
  intervals: [],
  totalDistanceMiles: 0,
})

describe('evaluateWindows', () => {
  it('regresses across missed windows', () => {
    const firstMiss = evaluateWindows(createProfile(), new Date('2024-01-15T00:00:00.000Z'))
    const secondMiss = evaluateWindows(createProfile(), new Date('2024-01-22T00:00:00.000Z'))

    expect(firstMiss.level.runSeconds).toBeCloseTo(27)
    expect(firstMiss.level.walkSeconds).toBe(120)
    expect(firstMiss.level.intervalBlockSeconds).toBe(1200)
    expect(firstMiss.window).toEqual({
      windowStart: '2024-01-15T00:00:00.000Z',
      consecutiveMissed: 2,
    })
    expect(secondMiss.level.runSeconds).toBeCloseTo(24.3)
    expect(secondMiss.level.walkSeconds).toBe(120)
    expect(secondMiss.window.consecutiveMissed).toBe(3)
  })

  it('keeps the profile unchanged before the window starts', () => {
    const profile = createProfile()
    const updated = evaluateWindows(profile, new Date('2023-12-31T23:59:59.000Z'))

    expect(updated).toBe(profile)
  })

  it('keeps the profile unchanged while the window is still active', () => {
    const profile = createProfile()
    const updated = evaluateWindows(profile, new Date('2024-01-03T00:00:00.000Z'))

    expect(updated).toBe(profile)
  })

  it('keeps the profile unchanged when the window is unset', () => {
    const profile = createProfile({
      window: {
        windowStart: '',
        consecutiveMissed: 1,
      },
    })

    expect(evaluateWindows(profile, new Date('2024-01-08T00:00:00.000Z'))).toBe(profile)
  })

  it('counts sessions only inside each expired window', () => {
    const updated = evaluateWindows(
      createProfile({
        sessions: [createSession('2024-01-10T00:00:00.000Z')],
      }),
      new Date('2024-01-15T00:00:00.000Z')
    )

    expect(updated.level.runSeconds).toBeCloseTo(27)
    expect(updated.level.walkSeconds).toBe(120)
    expect(updated.level.intervalBlockSeconds).toBe(1200)
    expect(updated.window).toEqual({
      windowStart: '2024-01-15T00:00:00.000Z',
      consecutiveMissed: 2,
    })
  })

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

    expect(updated.level).toEqual({ runSeconds: 33, walkSeconds: 90, intervalBlockSeconds: 1200 })
    expect(updated.window).toEqual({
      windowStart: '2024-01-08T00:00:00.000Z',
      consecutiveMissed: 0,
    })
  })
})

describe('adjustLevelManually', () => {
  it('increases run and keeps the phase walk', () => {
    expect(
      adjustLevelManually(
        {
          runSeconds: 30,
          walkSeconds: 90,
          intervalBlockSeconds: 1200,
        },
        'up'
      )
    ).toEqual({ runSeconds: 33, walkSeconds: 90, intervalBlockSeconds: 1200 })
  })

  it('decreases run and re-anchors the walk when crossing down', () => {
    const adjusted = adjustLevelManually(
      {
        runSeconds: 30,
        walkSeconds: 90,
        intervalBlockSeconds: 1200,
      },
      'down'
    )

    expect(adjusted.runSeconds).toBeCloseTo(27)
    expect(adjusted.walkSeconds).toBe(120)
    expect(adjusted.intervalBlockSeconds).toBe(1200)
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
    ).toEqual({ runSeconds: 15, walkSeconds: 120, intervalBlockSeconds: 1200 })
  })

  it('re-anchors the walk when crossing up into the next phase', () => {
    const adjusted = adjustLevelManually(
      {
        runSeconds: 29.7,
        walkSeconds: 120,
        intervalBlockSeconds: 1200,
      },
      'up'
    )

    expect(adjusted).toEqual({ runSeconds: 33, walkSeconds: 90, intervalBlockSeconds: 1200 })
  })

  it('keeps the phase walk when stepping within a phase', () => {
    const adjusted = adjustLevelManually(
      {
        runSeconds: 100,
        walkSeconds: 75,
        intervalBlockSeconds: 1200,
      },
      'up'
    )

    expect(adjusted.runSeconds).toBeCloseTo(113.9, 1)
    expect(adjusted.walkSeconds).toBe(75)
    expect(adjusted.intervalBlockSeconds).toBe(1200)
  })

  it('keeps a graduated level at the block when increasing', () => {
    const graduated = { runSeconds: 1200, walkSeconds: 30, intervalBlockSeconds: 1200 }

    expect(adjustLevelManually(graduated, 'up')).toEqual(graduated)
  })

  it('always steps a graduated level back down', () => {
    const topRung = RUN_LADDER[RUN_LADDER.length - 1]
    const adjusted = adjustLevelManually(
      { runSeconds: 1200, walkSeconds: 30, intervalBlockSeconds: 1200 },
      'down'
    )

    expect(adjusted.runSeconds).toBe(topRung)
    expect(adjusted.walkSeconds).toBe(30)
    expect(adjusted.intervalBlockSeconds).toBe(1200)
  })

  it('clamps runSeconds to the interval block when increasing', () => {
    expect(
      adjustLevelManually(
        {
          runSeconds: 1190,
          walkSeconds: 30,
          intervalBlockSeconds: 1200,
        },
        'up'
      )
    ).toEqual({ runSeconds: 1200, walkSeconds: 30, intervalBlockSeconds: 1200 })
  })

  it('has a strictly ascending ladder of unique rungs', () => {
    const isAscending = RUN_LADDER.every(
      (rung, index, ladder) => index === 0 || rung > (ladder[index - 1] ?? 0)
    )

    expect(isAscending).toBe(true)
  })

  it('returns to the same rung after increasing then decreasing', () => {
    for (const runSeconds of RUN_LADDER) {
      const level = { runSeconds, walkSeconds: 90, intervalBlockSeconds: 1200 }
      const roundTrip = adjustLevelManually(adjustLevelManually(level, 'up'), 'down')

      expect(roundTrip.runSeconds).toBe(runSeconds)
    }
  })

  it('returns to the same rung after decreasing then increasing, except the floor', () => {
    for (const runSeconds of RUN_LADDER.slice(1)) {
      const level = { runSeconds, walkSeconds: 90, intervalBlockSeconds: 1200 }
      const roundTrip = adjustLevelManually(adjustLevelManually(level, 'down'), 'up')

      expect(roundTrip.runSeconds).toBe(runSeconds)
    }
  })

  it('steps up from the floor to the first rung and back down to the floor', () => {
    const floorRung = RUN_LADDER[0] ?? 0
    const firstRung = RUN_LADDER[1] ?? 0
    const floorLevel = { runSeconds: floorRung, walkSeconds: 120, intervalBlockSeconds: 1200 }
    const steppedUp = adjustLevelManually(floorLevel, 'up')

    expect(steppedUp.runSeconds).toBe(firstRung)
    expect(adjustLevelManually(steppedUp, 'down').runSeconds).toBe(floorRung)
  })

  it('steps a graduated level down to the top rung and back up to graduation', () => {
    const topRung = RUN_LADDER[RUN_LADDER.length - 1] ?? 0
    const graduated = { runSeconds: 1200, walkSeconds: 30, intervalBlockSeconds: 1200 }
    const steppedDown = adjustLevelManually(graduated, 'down')

    expect(steppedDown.runSeconds).toBe(topRung)
    expect(adjustLevelManually(steppedDown, 'up')).toEqual(graduated)
  })
})
