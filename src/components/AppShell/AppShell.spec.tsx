import '@testing-library/jest-dom'
import { getQueriesForElement, render, waitFor } from '@lynx-js/react/testing-library'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppShell } from './AppShell.js'
import { sharedProfileStore } from '../../domain/profile.js'
import { runnerGps } from '../../native-bridge/gps.js'
import { runnerScreen } from '../../native-bridge/screen.js'
import { runnerProfileStorage } from '../../native-bridge/storage.js'
import {
  runnerWorkoutTimer,
  type RunnerWorkoutTimerModule,
  type WorkoutTimerState,
} from '../../native-bridge/workout-timer.js'

const buildTimerModule = (state: WorkoutTimerState | null): RunnerWorkoutTimerModule => ({
  getWorkoutTimerState: vi.fn(() => (state === null ? null : JSON.stringify(state))),
  pauseWorkout: vi.fn(),
  resumeWorkout: vi.fn(),
  startWorkout: vi.fn(),
  stopWorkout: vi.fn(),
})

const buildLiveTimerState = (): WorkoutTimerState => ({
  isComplete: false,
  isPaused: false,
  isRunning: true,
  phaseDurationSeconds: 30,
  phaseIndex: 3,
  phaseLabel: 'RUN',
  phaseRemainingSeconds: 17,
  phaseType: 'run',
  totalElapsedSeconds: 343,
  totalRemainingSeconds: 1457,
})

describe('AppShell', () => {
  beforeEach(() => {
    sharedProfileStore.reset()
    runnerProfileStorage.configure(null)
    runnerWorkoutTimer.configure(null)
    runnerGps.configure(null)
    runnerScreen.configure(null)
  })

  afterEach(() => {
    runnerProfileStorage.configure(null)
    runnerWorkoutTimer.configure(null)
    runnerGps.configure(null)
    runnerScreen.configure(null)
    vi.unstubAllGlobals()
  })

  it('opens the workout tab when a workout is live in the native state', async () => {
    runnerWorkoutTimer.configure(buildTimerModule(buildLiveTimerState()))

    render(<AppShell />)

    const { findByTestId } = getQueriesForElement(elementTree.root!)

    const homeTab = await findByTestId('tab-home')
    const workoutTab = await findByTestId('tab-workout')

    await waitFor(() => {
      expect(workoutTab.style.display).toBe('flex')
      expect(homeTab.style.display).toBe('none')
    })
  })

  it('keeps the home tab when the native timer state is empty', async () => {
    render(<AppShell />)

    const { findByTestId } = getQueriesForElement(elementTree.root!)

    const homeTab = await findByTestId('tab-home')
    const workoutTab = await findByTestId('tab-workout')

    await waitFor(() => {
      expect(homeTab.style.display).toBe('flex')
      expect(workoutTab.style.display).toBe('none')
    })
  })
})
