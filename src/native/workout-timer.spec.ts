import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  loadWorkoutTimerState,
  pauseRunnerWorkoutTimer,
  resumeRunnerWorkoutTimer,
  startRunnerWorkoutTimer,
  stopRunnerWorkoutTimer,
} from './workout-timer.js'
import type { WorkoutTimerState } from './workout-timer.js'
import type { TrainingLevel } from '../domain/types.js'

describe('workout timer bridge', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does nothing when the native module is unavailable', () => {
    expect(() =>
      startRunnerWorkoutTimer({ intervalBlockSeconds: 1, runSeconds: 1, walkSeconds: 1 })
    ).not.toThrow()
    expect(() => pauseRunnerWorkoutTimer()).not.toThrow()
    expect(() => resumeRunnerWorkoutTimer()).not.toThrow()
    expect(() => stopRunnerWorkoutTimer()).not.toThrow()
    expect(loadWorkoutTimerState()).toBeNull()
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
    const module = {
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

    vi.stubGlobal('NativeModules', {
      RunnerWorkoutTimerModule: module,
    })

    expect(loadWorkoutTimerState()).toEqual(state)
    startRunnerWorkoutTimer(level)
    pauseRunnerWorkoutTimer()
    resumeRunnerWorkoutTimer()
    stopRunnerWorkoutTimer()

    expect(module.getWorkoutTimerState).toHaveBeenCalledTimes(1)
    expect(module.startWorkout).toHaveBeenCalledWith(30, 120, 1200)
    expect(module.pauseWorkout).toHaveBeenCalledTimes(1)
    expect(module.resumeWorkout).toHaveBeenCalledTimes(1)
    expect(module.stopWorkout).toHaveBeenCalledTimes(1)
  })
})
