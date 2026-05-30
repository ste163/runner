import { describe, expect, it } from 'vitest'

import { calculateIntervals, isGraduated } from './intervals.js'

describe('calculateIntervals', () => {
  it('builds warmup, alternating intervals, and cooldown', () => {
    expect(
      calculateIntervals({
        runSeconds: 30,
        walkSeconds: 120,
        intervalBlockSeconds: 360,
      })
    ).toEqual([
      { type: 'warmup', durationSeconds: 300 },
      { type: 'run', durationSeconds: 30 },
      { type: 'walk', durationSeconds: 120 },
      { type: 'run', durationSeconds: 30 },
      { type: 'walk', durationSeconds: 120 },
      { type: 'run', durationSeconds: 30 },
      { type: 'walk', durationSeconds: 30 },
      { type: 'cooldown', durationSeconds: 300 },
    ])
  })

  it('switches to continuous running when graduated', () => {
    expect(isGraduated({ runSeconds: 45, walkSeconds: 10, intervalBlockSeconds: 1200 })).toBe(true)
    expect(
      calculateIntervals({
        runSeconds: 45,
        walkSeconds: 10,
        intervalBlockSeconds: 1200,
      })
    ).toEqual([
      { type: 'warmup', durationSeconds: 300 },
      { type: 'run', durationSeconds: 1200 },
      { type: 'cooldown', durationSeconds: 300 },
    ])
  })
})
