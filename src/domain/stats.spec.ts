import { describe, expect, it } from 'vitest'

import { buildIntervalRecords, buildLiveIntervals, buildPace, buildSessionPace } from './stats.js'
import type { IntervalRecord, Session } from './types.js'

const buildSession = (intervals: IntervalRecord[]): Session => ({
  id: 'session-1',
  completedAt: '2024-01-01T00:00:00.000Z',
  level: { runSeconds: 30, walkSeconds: 120, intervalBlockSeconds: 1200 },
  intervals,
  totalDistanceMiles: 0,
})

const buildInterval = (
  type: IntervalRecord['type'],
  durationSeconds: number,
  distanceMiles: number
): IntervalRecord => ({
  type,
  durationSeconds,
  distanceMiles,
  avgPaceMinPerMile: 0,
})

describe('buildIntervalRecords', () => {
  it('maps native intervals to records with computed pace', () => {
    expect(
      buildIntervalRecords([
        { type: 'run', durationSeconds: 30, distanceMiles: 0.08 },
        { type: 'walk', durationSeconds: 120, distanceMiles: 0 },
      ])
    ).toEqual([
      { type: 'run', durationSeconds: 30, distanceMiles: 0.08, avgPaceMinPerMile: 6.25 },
      { type: 'walk', durationSeconds: 120, distanceMiles: 0, avgPaceMinPerMile: 0 },
    ])
  })

  it('returns an empty list for no native intervals', () => {
    expect(buildIntervalRecords([])).toEqual([])
  })
})

describe('buildSessionPace', () => {
  it('returns null when the session has no distance for the kind', () => {
    const session = buildSession([buildInterval('run', 30, 0), buildInterval('walk', 120, 0.1)])

    expect(buildSessionPace(session, 'run')).toBeNull()
    expect(buildSessionPace(buildSession([]), 'walk')).toBeNull()
  })

  it('averages run intervals by total time over total distance', () => {
    const session = buildSession([
      buildInterval('run', 30, 0.08),
      buildInterval('run', 60, 0.12),
      buildInterval('walk', 120, 0.5),
    ])

    expect(buildSessionPace(session, 'run')).toBeCloseTo(7.5)
  })

  it('averages walk intervals including warmup and cooldown', () => {
    const session = buildSession([
      buildInterval('warmup', 300, 0.2),
      buildInterval('run', 30, 0.08),
      buildInterval('walk', 120, 0.15),
      buildInterval('cooldown', 300, 0.2),
    ])

    expect(buildSessionPace(session, 'walk')).toBeCloseTo(21.82, 2)
  })
})

describe('buildPace', () => {
  it('returns null when the intervals have no distance for the kind', () => {
    expect(buildPace([{ type: 'run', durationSeconds: 30, distanceMiles: 0 }], 'run')).toBeNull()
    expect(buildPace([], 'walk')).toBeNull()
  })

  it('averages each kind by total time over total distance', () => {
    const intervals = [
      buildInterval('warmup', 300, 0.25),
      buildInterval('run', 30, 0.125),
      buildInterval('walk', 120, 0.25),
      buildInterval('run', 30, 0.125),
    ]

    expect(buildPace(intervals, 'run')).toBeCloseTo(4)
    expect(buildPace(intervals, 'walk')).toBeCloseTo(14)
  })
})

describe('buildLiveIntervals', () => {
  it('appends the current phase with the unattributed distance', () => {
    expect(
      buildLiveIntervals(
        [
          { type: 'warmup', durationSeconds: 300, distanceMiles: 0.25 },
          { type: 'run', durationSeconds: 30, distanceMiles: 0.125 },
        ],
        'walk',
        45,
        0.5
      )
    ).toEqual([
      { type: 'warmup', durationSeconds: 300, distanceMiles: 0.25 },
      { type: 'run', durationSeconds: 30, distanceMiles: 0.125 },
      { type: 'walk', durationSeconds: 45, distanceMiles: 0.125 },
    ])
  })

  it('clamps the phase distance at zero when completed distance exceeds the total', () => {
    expect(
      buildLiveIntervals(
        [{ type: 'run', durationSeconds: 30, distanceMiles: 0.5 }],
        'walk',
        10,
        0.4
      )
    ).toEqual([
      { type: 'run', durationSeconds: 30, distanceMiles: 0.5 },
      { type: 'walk', durationSeconds: 10, distanceMiles: 0 },
    ])
  })
})
