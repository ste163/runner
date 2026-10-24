import { describe, expect, it } from 'vitest'

import {
  adjustLevelManually,
  completeSession,
  evaluateWindows,
  reanchorWindow,
  RUN_LADDER,
} from '@/domain/progression.js'
import type { TrainingProfile } from '@/domain/types.js'

const buildDay = (dayOffset: number): Date => new Date(2024, 0, 1 + dayOffset, 12)
const buildMidnight = (dayOffset: number): Date => new Date(2024, 0, 1 + dayOffset)

const createProfile = (overrides: Partial<TrainingProfile> = {}): TrainingProfile => ({
  schemaVersion: 1,
  level: {
    runSeconds: 30,
    walkSeconds: 90,
    intervalBlockSeconds: 1200,
    ...overrides.level,
  },
  window: {
    windowStart: buildMidnight(0).toISOString(),
    consecutiveMissed: 0,
    ...overrides.window,
  },
  sessions: overrides.sessions ?? [],
})

const createSession = (completedAt: Date): TrainingProfile['sessions'][number] => ({
  id: completedAt.toISOString(),
  completedAt: completedAt.toISOString(),
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
    const firstMiss = evaluateWindows(createProfile(), buildDay(14))
    const secondMiss = evaluateWindows(createProfile(), buildDay(21))

    expect(firstMiss.level.runSeconds).toBeCloseTo(27)
    expect(firstMiss.level.walkSeconds).toBe(120)
    expect(firstMiss.level.intervalBlockSeconds).toBe(1200)
    expect(firstMiss.window).toEqual({
      windowStart: buildMidnight(14).toISOString(),
      consecutiveMissed: 2,
    })
    expect(secondMiss.level.runSeconds).toBeCloseTo(24.3)
    expect(secondMiss.level.walkSeconds).toBe(120)
    expect(secondMiss.window.consecutiveMissed).toBe(3)
  })

  it('keeps the profile unchanged before the window starts', () => {
    const profile = createProfile()
    const updated = evaluateWindows(profile, buildDay(-1))

    expect(updated).toBe(profile)
  })

  it('keeps the profile unchanged while the window is still active', () => {
    const profile = createProfile()
    const updated = evaluateWindows(profile, buildDay(2))

    expect(updated).toBe(profile)
  })

  it('keeps the profile unchanged on the anchor day itself', () => {
    const profile = createProfile()
    const updated = evaluateWindows(profile, buildDay(0))

    expect(updated).toBe(profile)
  })

  it('keeps the profile unchanged when the window is unset', () => {
    const profile = createProfile({
      window: {
        windowStart: '',
        consecutiveMissed: 1,
      },
    })

    expect(evaluateWindows(profile, buildDay(7))).toBe(profile)
  })

  it('counts sessions only inside each expired window', () => {
    const updated = evaluateWindows(
      createProfile({
        sessions: [createSession(buildDay(9))],
      }),
      buildDay(14)
    )

    expect(updated.level.runSeconds).toBeCloseTo(27)
    expect(updated.level.walkSeconds).toBe(120)
    expect(updated.level.intervalBlockSeconds).toBe(1200)
    expect(updated.window).toEqual({
      windowStart: buildMidnight(14).toISOString(),
      consecutiveMissed: 2,
    })
  })

  it('resets the miss counter without re-leveling a completed window', () => {
    const updated = evaluateWindows(
      createProfile({
        level: { runSeconds: 33, walkSeconds: 90, intervalBlockSeconds: 1200 },
        window: { windowStart: buildMidnight(0).toISOString(), consecutiveMissed: 1 },
        sessions: [
          createSession(buildDay(1)),
          createSession(buildDay(2)),
          createSession(buildDay(3)),
        ],
      }),
      buildDay(7)
    )

    expect(updated.level).toEqual({ runSeconds: 33, walkSeconds: 90, intervalBlockSeconds: 1200 })
    expect(updated.window).toEqual({
      windowStart: buildMidnight(7).toISOString(),
      consecutiveMissed: 0,
    })
  })

  it('excludes a run on the expiry day from the expired window', () => {
    const updated = evaluateWindows(
      createProfile({
        sessions: [createSession(new Date(2024, 0, 8, 23, 30))],
      }),
      buildDay(8)
    )

    expect(updated.level.runSeconds).toBe(30)
    expect(updated.window).toEqual({
      windowStart: buildMidnight(8).toISOString(),
      consecutiveMissed: 1,
    })
  })
})

describe('completeSession', () => {
  it('anchors the first session at local midnight', () => {
    const completedAt = new Date(2024, 0, 1, 18, 30)
    const updated = completeSession(
      createProfile({ window: { windowStart: '', consecutiveMissed: 0 } }),
      createSession(completedAt),
      completedAt
    )

    expect(updated.window).toEqual({
      windowStart: buildMidnight(0).toISOString(),
      consecutiveMissed: 0,
    })
    expect(updated.sessions).toHaveLength(1)
  })

  it('levels up immediately when the third session completes the window', () => {
    const profile = createProfile({
      sessions: [createSession(buildDay(0)), createSession(buildDay(2))],
    })
    const updated = completeSession(profile, createSession(buildDay(4)), buildDay(4))

    expect(updated.level).toEqual({ runSeconds: 33, walkSeconds: 90, intervalBlockSeconds: 1200 })
    expect(updated.window).toEqual({
      windowStart: buildMidnight(0).toISOString(),
      consecutiveMissed: 0,
    })
  })

  it('opens a new window for an early run after completion', () => {
    const profile = createProfile({
      level: { runSeconds: 33, walkSeconds: 90, intervalBlockSeconds: 1200 },
      sessions: [
        createSession(buildDay(0)),
        createSession(buildDay(2)),
        createSession(buildDay(4)),
      ],
    })
    const updated = completeSession(profile, createSession(buildDay(5)), buildDay(5))

    expect(updated.level).toEqual({ runSeconds: 33, walkSeconds: 90, intervalBlockSeconds: 1200 })
    expect(updated.window).toEqual({
      windowStart: buildMidnight(5).toISOString(),
      consecutiveMissed: 0,
    })
  })

  it('evaluates expired windows and starts a new window at the run day', () => {
    const profile = createProfile({
      sessions: [createSession(buildDay(1))],
    })
    const updated = completeSession(profile, createSession(buildDay(9)), buildDay(9))

    expect(updated.level.runSeconds).toBe(30)
    expect(updated.window).toEqual({
      windowStart: buildMidnight(9).toISOString(),
      consecutiveMissed: 1,
    })
  })

  it('starts a new window after a four-day break and records the miss', () => {
    const profile = createProfile({
      window: { windowStart: buildMidnight(1).toISOString(), consecutiveMissed: 0 },
      sessions: [createSession(buildDay(1)), createSession(buildDay(3))],
    })
    const updated = completeSession(profile, createSession(buildDay(7)), buildDay(7))

    expect(updated.level.runSeconds).toBe(30)
    expect(updated.window).toEqual({
      windowStart: buildMidnight(7).toISOString(),
      consecutiveMissed: 1,
    })
    expect(updated.sessions).toHaveLength(3)
  })

  it('keeps a three-day gap inside the window', () => {
    const profile = createProfile({
      window: { windowStart: buildMidnight(3).toISOString(), consecutiveMissed: 0 },
      sessions: [createSession(buildDay(3))],
    })
    const afterSunday = completeSession(profile, createSession(buildDay(6)), buildDay(6))

    expect(afterSunday.window.windowStart).toBe(buildMidnight(3).toISOString())
    expect(afterSunday.window.consecutiveMissed).toBe(0)

    const afterMonday = completeSession(afterSunday, createSession(buildDay(7)), buildDay(7))

    expect(afterMonday.level).toEqual({
      runSeconds: 33,
      walkSeconds: 90,
      intervalBlockSeconds: 1200,
    })
    expect(afterMonday.window.windowStart).toBe(buildMidnight(3).toISOString())
  })

  it('regresses on a second consecutive break miss', () => {
    const profile = createProfile({
      window: { windowStart: buildMidnight(1).toISOString(), consecutiveMissed: 1 },
      sessions: [createSession(buildDay(1)), createSession(buildDay(3))],
    })
    const updated = completeSession(profile, createSession(buildDay(7)), buildDay(7))

    expect(updated.level.runSeconds).toBeCloseTo(27)
    expect(updated.window).toEqual({
      windowStart: buildMidnight(7).toISOString(),
      consecutiveMissed: 2,
    })
  })
})

describe('reanchorWindow', () => {
  it('anchors at the first day of the last three sessions', () => {
    const profile = createProfile({
      sessions: [
        createSession(buildDay(0)),
        createSession(buildDay(2)),
        createSession(buildDay(4)),
      ],
    })
    const updated = reanchorWindow(profile, buildDay(6))

    expect(updated.window).toEqual({
      windowStart: buildMidnight(0).toISOString(),
      consecutiveMissed: 0,
    })
    expect(updated.sessions).toHaveLength(3)
  })

  it('anchors a Thu Sun Mon cadence at Thursday', () => {
    const profile = createProfile({
      sessions: [
        createSession(buildDay(3)),
        createSession(buildDay(6)),
        createSession(buildDay(7)),
      ],
    })

    expect(reanchorWindow(profile, buildDay(8)).window.windowStart).toBe(
      buildMidnight(3).toISOString()
    )
  })

  it('anchors at today when the last three sessions span more than seven days', () => {
    const profile = createProfile({
      sessions: [
        createSession(buildDay(0)),
        createSession(buildDay(4)),
        createSession(buildDay(9)),
      ],
    })
    const updated = reanchorWindow(profile, buildDay(10))

    expect(updated.window).toEqual({
      windowStart: buildMidnight(10).toISOString(),
      consecutiveMissed: 0,
    })
  })

  it('anchors at today with fewer than three sessions', () => {
    const profile = createProfile({
      sessions: [createSession(buildDay(0)), createSession(buildDay(2))],
    })

    expect(reanchorWindow(profile, buildDay(4)).window.windowStart).toBe(
      buildMidnight(4).toISOString()
    )
  })

  it('clears the miss counter', () => {
    const profile = createProfile({
      window: { windowStart: buildMidnight(0).toISOString(), consecutiveMissed: 2 },
      sessions: [
        createSession(buildDay(0)),
        createSession(buildDay(2)),
        createSession(buildDay(4)),
      ],
    })

    expect(reanchorWindow(profile, buildDay(6)).window.consecutiveMissed).toBe(0)
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
