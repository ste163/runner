import { describe, expect, it } from 'vitest'

import { buildWeekView, countWindowSessions } from '@/domain/weekView.js'
import type { Session, TrainingProfile } from '@/domain/types.js'

const MONDAY = new Date(2024, 0, 1, 12)

const buildDay = (dayOffset: number): Date => new Date(2024, 0, 1 + dayOffset, 12)

const buildSession = (id: string, completedAt: Date): Session => ({
  id,
  completedAt: completedAt.toISOString(),
  level: { runSeconds: 30, walkSeconds: 120, intervalBlockSeconds: 1200 },
  intervals: [],
  totalDistanceMiles: 0,
})

const buildProfile = (windowStart: Date | null, sessions: Session[]): TrainingProfile => ({
  schemaVersion: 1,
  level: { runSeconds: 30, walkSeconds: 120, intervalBlockSeconds: 1200 },
  window: {
    windowStart: windowStart === null ? '' : windowStart.toISOString(),
    consecutiveMissed: 0,
  },
  sessions,
})

describe('buildWeekView', () => {
  it('renders a Monday-first strip with a fresh week plan', () => {
    const view = buildWeekView(buildProfile(null, []), buildDay(2))

    expect(view.days.map((day) => day.label)).toEqual(['M', 'T', 'W', 'R', 'F', 'S', 'S'])
    expect(view.days.map((day) => day.state)).toEqual([
      'idle',
      'idle',
      'planned',
      'idle',
      'planned',
      'idle',
      'planned',
    ])
    expect(view.days[2]?.isToday).toBe(true)
    expect(view.recommendation).toBe('Run today')
  })

  it('plans today plus two rest days when the week starts on a Monday', () => {
    const view = buildWeekView(buildProfile(null, []), buildDay(0))

    expect(view.days.map((day) => day.state)).toEqual([
      'planned',
      'idle',
      'planned',
      'idle',
      'planned',
      'idle',
      'idle',
    ])
    expect(view.recommendation).toBe('Run today')
  })

  it('recommends the next planned day when not yet due', () => {
    const profile = buildProfile(MONDAY, [buildSession('session-1', buildDay(0))])
    const view = buildWeekView(profile, buildDay(1))

    expect(view.days.map((day) => day.state)).toEqual([
      'completed',
      'idle',
      'planned',
      'idle',
      'planned',
      'idle',
      'idle',
    ])
    expect(view.recommendation).toBe('Run again on Wednesday')
  })

  it('says run today on the planned day itself', () => {
    const profile = buildProfile(MONDAY, [buildSession('session-1', buildDay(0))])
    const view = buildWeekView(profile, buildDay(2))

    expect(view.days.map((day) => day.state)).toEqual([
      'completed',
      'idle',
      'planned',
      'idle',
      'planned',
      'idle',
      'idle',
    ])
    expect(view.recommendation).toBe('Run today')
  })

  it('re-anchors the plan on today after a missed day', () => {
    const profile = buildProfile(MONDAY, [buildSession('session-1', buildDay(0))])
    const view = buildWeekView(profile, buildDay(3))

    expect(view.days.map((day) => day.state)).toEqual([
      'completed',
      'idle',
      'idle',
      'planned',
      'idle',
      'planned',
      'idle',
    ])
    expect(view.recommendation).toBe('Run today')
  })

  it('shifts the plan again after skipping the due day', () => {
    const profile = buildProfile(MONDAY, [buildSession('session-1', buildDay(0))])
    const view = buildWeekView(profile, buildDay(4))

    expect(view.days.map((day) => day.state)).toEqual([
      'completed',
      'idle',
      'idle',
      'idle',
      'planned',
      'idle',
      'planned',
    ])
    expect(view.recommendation).toBe('Run today')
  })

  it('keeps the next slot after running the due day', () => {
    const profile = buildProfile(MONDAY, [
      buildSession('session-1', buildDay(0)),
      buildSession('session-2', buildDay(3)),
    ])
    const view = buildWeekView(profile, buildDay(4))

    expect(view.days.map((day) => day.state)).toEqual([
      'completed',
      'idle',
      'idle',
      'completed',
      'idle',
      'planned',
      'idle',
    ])
    expect(view.recommendation).toBe('Run again on Saturday')
  })

  it('fills circles for unscheduled runs and plans from the last run', () => {
    const profile = buildProfile(MONDAY, [
      buildSession('session-1', buildDay(0)),
      buildSession('session-2', buildDay(1)),
    ])
    const view = buildWeekView(profile, buildDay(2))

    expect(view.days.map((day) => day.state)).toEqual([
      'completed',
      'completed',
      'idle',
      'planned',
      'idle',
      'idle',
      'idle',
    ])
    expect(view.recommendation).toBe('Run again on Thursday')
  })

  it('recommends the next cycle after three runs', () => {
    const profile = buildProfile(MONDAY, [
      buildSession('session-1', buildDay(0)),
      buildSession('session-2', buildDay(2)),
      buildSession('session-3', buildDay(4)),
    ])
    const view = buildWeekView(profile, buildDay(5))

    expect(view.days.map((day) => day.state)).toEqual([
      'completed',
      'idle',
      'completed',
      'idle',
      'completed',
      'idle',
      'idle',
    ])
    expect(view.recommendation).toBe('Run again on Monday')
  })

  it('starts a fresh cycle after the window expires', () => {
    const profile = buildProfile(MONDAY, [
      buildSession('session-1', buildDay(0)),
      buildSession('session-2', buildDay(2)),
      buildSession('session-3', buildDay(4)),
    ])
    const view = buildWeekView(profile, buildDay(7))

    expect(view.days.map((day) => day.state)).toEqual([
      'planned',
      'idle',
      'planned',
      'idle',
      'planned',
      'idle',
      'idle',
    ])
    expect(view.recommendation).toBe('Run today')
  })

  it('preserves the cycle start day', () => {
    const profile = buildProfile(buildDay(2), [
      buildSession('session-1', buildDay(2)),
      buildSession('session-2', buildDay(4)),
      buildSession('session-3', buildDay(6)),
    ])
    const view = buildWeekView(profile, buildDay(5))

    expect(view.recommendation).toBe('Run again on Wednesday')
  })

  it('spills the plan into next week in text only', () => {
    const profile = buildProfile(MONDAY, [
      buildSession('session-1', buildDay(0)),
      buildSession('session-2', buildDay(5)),
    ])
    const view = buildWeekView(profile, buildDay(6))

    expect(view.recommendation).toBe('Run again on Monday')
    expect(view.days.some((day) => day.state === 'planned')).toBe(false)
    expect(view.days[0]?.state).toBe('completed')
    expect(view.days[5]?.state).toBe('completed')
  })
})

describe('countWindowSessions', () => {
  it('counts sessions inside the rolling window', () => {
    const profile = buildProfile(MONDAY, [
      buildSession('session-1', buildDay(0)),
      buildSession('session-2', buildDay(2)),
      buildSession('session-3', buildDay(7)),
    ])

    expect(countWindowSessions(profile)).toBe(2)
  })

  it('returns all sessions when the window has not started', () => {
    const profile = buildProfile(null, [
      buildSession('session-1', buildDay(0)),
      buildSession('session-2', buildDay(2)),
    ])

    expect(countWindowSessions(profile)).toBe(2)
  })

  it('returns zero for a fresh profile', () => {
    expect(countWindowSessions(buildProfile(null, []))).toBe(0)
  })
})
