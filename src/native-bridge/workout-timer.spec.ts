import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  runnerWorkoutTimer,
  type RunnerWorkoutTimerModule,
  type WorkoutTimerState,
} from './workout-timer.js'
import type { TrainingLevel } from '../domain/types.js'

describe('workout timer bridge', () => {
  afterEach(() => {
    runnerWorkoutTimer.configure(null)
  })

  it('does nothing when the native module is unavailable', () => {
    expect(() =>
      runnerWorkoutTimer.start({ intervalBlockSeconds: 1, runSeconds: 1, walkSeconds: 1 })
    ).not.toThrow()
    expect(() => runnerWorkoutTimer.pause()).not.toThrow()
    expect(() => runnerWorkoutTimer.resume()).not.toThrow()
    expect(() => runnerWorkoutTimer.stop()).not.toThrow()
    expect(runnerWorkoutTimer.loadState()).toBeNull()
  })

  it('returns null when the native timer state is empty', () => {
    const module: RunnerWorkoutTimerModule = {
      getWorkoutTimerState: vi.fn(() => null),
      pauseWorkout: vi.fn(),
      resumeWorkout: vi.fn(),
      startWorkout: vi.fn(),
      stopWorkout: vi.fn(),
    }

    runnerWorkoutTimer.configure(module)

    expect(runnerWorkoutTimer.loadState()).toBeNull()
    expect(module.getWorkoutTimerState).toHaveBeenCalledTimes(1)
  })

  it('calls through to the native workout timer module', () => {
    const state: WorkoutTimerState = {
      isComplete: false,
      isPaused: false,
      isRunning: true,
      phaseDurationSeconds: 300,
      phaseIndex: 0,
      phaseLabel: 'WARMUP',
      phaseRemainingSeconds: 300,
      phaseType: 'warmup',
      totalElapsedSeconds: 0,
      totalRemainingSeconds: 1800,
    }
    const module: RunnerWorkoutTimerModule = {
      getWorkoutTimerState: vi.fn(() => JSON.stringify(state)),
      pauseWorkout: vi.fn(),
      resumeWorkout: vi.fn(),
      startWorkout: vi.fn(),
      stopWorkout: vi.fn(),
    }
    const level: TrainingLevel = {
      intervalBlockSeconds: 1200,
      runSeconds: 30,
      walkSeconds: 120,
    }

    runnerWorkoutTimer.configure(module)

    expect(runnerWorkoutTimer.loadState()).toEqual(state)
    runnerWorkoutTimer.start(level)
    runnerWorkoutTimer.pause()
    runnerWorkoutTimer.resume()
    runnerWorkoutTimer.stop()

    expect(module.getWorkoutTimerState).toHaveBeenCalledTimes(1)
    expect(module.startWorkout).toHaveBeenCalledWith(30, 120, 1200)
    expect(module.pauseWorkout).toHaveBeenCalledTimes(1)
    expect(module.resumeWorkout).toHaveBeenCalledTimes(1)
    expect(module.stopWorkout).toHaveBeenCalledTimes(1)
  })
})
