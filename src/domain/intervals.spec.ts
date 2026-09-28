import { describe, expect, it } from 'vitest'

import { calculateIntervals, isGraduated } from './intervals.js'

describe('isGraduated', () => {
  it('returns false when the run is shorter than the block', () => {
    expect(isGraduated({ runSeconds: 45, walkSeconds: 90, intervalBlockSeconds: 1200 })).toBe(false)
  })

  it('returns true when the run fills the block', () => {
    expect(isGraduated({ runSeconds: 1200, walkSeconds: 30, intervalBlockSeconds: 1200 })).toBe(
      true
    )
  })
})

describe('calculateIntervals', () => {
  it('returns only warmup and cooldown when the block is empty', () => {
    expect(
      calculateIntervals({
        runSeconds: 30,
        walkSeconds: 120,
        intervalBlockSeconds: 0,
      })
    ).toEqual([
      { type: 'warmup', durationSeconds: 300 },
      { type: 'cooldown', durationSeconds: 300 },
    ])
  })

  it('stops when runSeconds is zero', () => {
    expect(
      calculateIntervals({
        runSeconds: 0,
        walkSeconds: 120,
        intervalBlockSeconds: 360,
      })
    ).toEqual([
      { type: 'warmup', durationSeconds: 300 },
      { type: 'cooldown', durationSeconds: 300 },
    ])
  })

  it('truncates the final run when the block ends mid-run', () => {
    expect(
      calculateIntervals({
        runSeconds: 60,
        walkSeconds: 30,
        intervalBlockSeconds: 50,
      })
    ).toEqual([
      { type: 'warmup', durationSeconds: 300 },
      { type: 'run', durationSeconds: 50 },
      { type: 'cooldown', durationSeconds: 300 },
    ])
  })

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
    expect(
      calculateIntervals({
        runSeconds: 1200,
        walkSeconds: 30,
        intervalBlockSeconds: 1200,
      })
    ).toEqual([
      { type: 'warmup', durationSeconds: 300 },
      { type: 'run', durationSeconds: 1200 },
      { type: 'cooldown', durationSeconds: 300 },
    ])
  })
})
