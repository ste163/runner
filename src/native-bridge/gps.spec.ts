import { afterEach, describe, expect, it, vi } from 'vitest'

import { runnerGps, type RunnerGpsModule, type WorkoutGpsState } from './gps.js'

describe('gps bridge', () => {
  afterEach(() => {
    runnerGps.configure(null)
  })

  it('does nothing when the native module is unavailable', () => {
    expect(() => runnerGps.setWorkoutTrackingEnabled(true)).not.toThrow()
    expect(() => runnerGps.setWorkoutTrackingEnabled(false)).not.toThrow()
    expect(runnerGps.loadState()).toBeNull()
  })

  it('calls through to the native gps module', () => {
    const state: WorkoutGpsState = {
      distanceMiles: 0.48,
      hasPermission: true,
      isLocationEnabled: true,
      isTracking: true,
    }
    const module: RunnerGpsModule = {
      getWorkoutGpsState: vi.fn(() => JSON.stringify(state)),
      openLocationSettings: vi.fn(),
      setWorkoutTrackingEnabled: vi.fn(),
    }

    runnerGps.configure(module)

    expect(runnerGps.loadState()).toEqual(state)
    runnerGps.setWorkoutTrackingEnabled(true)
    runnerGps.setWorkoutTrackingEnabled(false)
    runnerGps.openLocationSettings()

    expect(module.getWorkoutGpsState).toHaveBeenCalledTimes(1)
    expect(module.setWorkoutTrackingEnabled).toHaveBeenCalledTimes(2)
    expect(module.openLocationSettings).toHaveBeenCalledTimes(1)
    expect(module.setWorkoutTrackingEnabled).toHaveBeenNthCalledWith(1, true)
    expect(module.setWorkoutTrackingEnabled).toHaveBeenNthCalledWith(2, false)
  })
})
