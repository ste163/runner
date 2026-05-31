import '@testing-library/jest-dom'
import { fireEvent, getQueriesForElement, render } from '@lynx-js/react/testing-library'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as router from 'sparkling-navigation'

import { Workout } from './Workout.js'
import { sharedProfileStore } from '../../domain/profile.js'
import type { TrainingProfile } from '../../domain/types.js'
import type { WorkoutGpsState } from '../../native-bridge/gps.js'
import type { WorkoutTimerState } from '../../native-bridge/workout-timer.js'

const workoutTimerMock = vi.hoisted(() => {
  let state: WorkoutTimerState | null = null
  let gpsState: WorkoutGpsState | null = null

  return {
    runnerWorkoutTimer: {
      configure: vi.fn(),
      loadState: vi.fn(() => state),
      pause: vi.fn(),
      resume: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    },
    runnerGps: {
      configure: vi.fn(),
      loadState: vi.fn(() => gpsState),
      openLocationSettings: vi.fn(),
      setWorkoutTrackingEnabled: vi.fn(),
    },
    runnerScreen: {
      configure: vi.fn(),
      keepScreenOn: vi.fn(),
    },
    reset: () => {
      state = null
      gpsState = null
    },
    setState: (nextState: WorkoutTimerState | null) => {
      state = nextState
    },
    setGpsState: (nextState: WorkoutGpsState | null) => {
      gpsState = nextState
    },
  }
})

vi.mock('../../native-bridge/workout-timer.js', () => ({
  runnerWorkoutTimer: workoutTimerMock.runnerWorkoutTimer,
}))

vi.mock('../../native-bridge/gps.js', () => ({
  runnerGps: workoutTimerMock.runnerGps,
}))

vi.mock('../../native-bridge/screen.js', () => ({
  runnerScreen: workoutTimerMock.runnerScreen,
}))

vi.mock('sparkling-navigation', () => ({ close: vi.fn() }))

const haptics = {
  cancel: vi.fn(),
  vibrate: vi.fn(),
}

const buildWorkoutProfile = (): TrainingProfile => ({
  schemaVersion: 1,
  level: { intervalBlockSeconds: 1, runSeconds: 1, walkSeconds: 10 },
  sessions: [],
  window: { consecutiveMissed: 0, windowStart: '' },
})

const buildCountdownProfile = (): TrainingProfile => ({
  schemaVersion: 1,
  level: { intervalBlockSeconds: 24, runSeconds: 12, walkSeconds: 12 },
  sessions: [],
  window: { consecutiveMissed: 0, windowStart: '' },
})

const buildTimerState = (overrides: Partial<WorkoutTimerState> = {}): WorkoutTimerState => ({
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
  ...overrides,
})

const getWorkoutQueries = () => getQueriesForElement(elementTree.root!)

describe('Workout', () => {
  beforeEach(() => {
    sharedProfileStore.reset()
    sharedProfileStore.save(buildWorkoutProfile())
    vi.clearAllMocks()
    workoutTimerMock.reset()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('stops without saving', async () => {
    workoutTimerMock.setState(buildTimerState())
    render(<Workout haptics={haptics} />)

    const queries = getWorkoutQueries()
    await queries.findByText('Start Workout')
    fireEvent.tap(queries.getByText('Start Workout'))
    await queries.findByText('WARMUP')

    fireEvent.tap(queries.getByText('Stop'))

    expect(workoutTimerMock.runnerWorkoutTimer.start).toHaveBeenCalledTimes(1)
    expect(workoutTimerMock.runnerWorkoutTimer.stop).toHaveBeenCalledTimes(1)
    expect(workoutTimerMock.runnerScreen.keepScreenOn).toHaveBeenNthCalledWith(1, true)
    expect(workoutTimerMock.runnerScreen.keepScreenOn).toHaveBeenNthCalledWith(2, false)
    expect(haptics.cancel).toHaveBeenCalledTimes(1)

    const profile = sharedProfileStore.loadOrCreate().profile
    expect(profile.sessions).toHaveLength(0)
  })

  it('shows warmup phase and start pulse', async () => {
    const onMounted = vi.fn()
    workoutTimerMock.setState(buildTimerState({ totalElapsedSeconds: 300 }))
    workoutTimerMock.setGpsState(buildGpsState({ distanceMiles: 0.25 }))

    render(<Workout haptics={haptics} onMounted={onMounted} />)

    expect(onMounted).toBeCalledTimes(1)

    const queries = getWorkoutQueries()
    await queries.findByText('Start Workout')
    expect(queries.queryByText('WARMUP')).not.toBeInTheDocument()

    fireEvent.tap(queries.getByText('Start Workout'))

    expect(workoutTimerMock.runnerWorkoutTimer.start).toHaveBeenCalledWith(
      buildWorkoutProfile().level
    )

    await vi.advanceTimersByTimeAsync(1000)
    expect(queries.getByText('WARMUP')).toBeInTheDocument()
    expect(queries.getByText('Distance: 0.25 mi')).toBeInTheDocument()
    expect(queries.getByText('Pace: 20.00 min/mi')).toBeInTheDocument()
    expect(
      queries.getByText(
        (_, element) => element?.className === 'timer' && element.textContent === '5m 0s'
      )
    ).toBeInTheDocument()
    expect(queries.getByText('Next up: RUN 1s')).toBeInTheDocument()

    expect(haptics.vibrate).toHaveBeenCalledWith(500)
    expect(workoutTimerMock.runnerGps.setWorkoutTrackingEnabled).toHaveBeenCalledWith(true)
    expect(workoutTimerMock.runnerScreen.keepScreenOn).toHaveBeenCalledWith(true)
  })

  it('prompts to open location settings when GPS services are off', async () => {
    workoutTimerMock.setGpsState(
      buildGpsState({
        isLocationEnabled: false,
      })
    )

    render(<Workout haptics={haptics} />)

    const queries = getWorkoutQueries()
    await queries.findByText('Start Workout')
    expect(
      queries.getByText('Turn on location services to track pace and distance.')
    ).toBeInTheDocument()

    fireEvent.tap(queries.getByText('Open Location Settings'))

    expect(workoutTimerMock.runnerGps.openLocationSettings).toHaveBeenCalledTimes(1)
  })

  it('keeps the workout started while the native timer catches up', async () => {
    workoutTimerMock.setState(
      buildTimerState({
        isComplete: false,
        isPaused: false,
        isRunning: false,
      })
    )

    render(<Workout haptics={haptics} />)

    const queries = getWorkoutQueries()
    await queries.findByText('Start Workout')

    fireEvent.tap(queries.getByText('Start Workout'))

    expect(workoutTimerMock.runnerGps.setWorkoutTrackingEnabled).toHaveBeenCalledWith(true)

    workoutTimerMock.setState(buildTimerState())
    await vi.advanceTimersByTimeAsync(1000)

    await queries.findByText('WARMUP')
    await queries.findByText('5m 0s')

    expect(workoutTimerMock.runnerWorkoutTimer.start).toHaveBeenCalledTimes(1)
    expect(haptics.vibrate).toHaveBeenCalledWith(500)
  })

  it('restarts after stopping and calls the bridges for each start', async () => {
    workoutTimerMock.setState(buildTimerState())
    render(<Workout haptics={haptics} />)

    const queries = getWorkoutQueries()
    await queries.findByText('Start Workout')

    fireEvent.tap(queries.getByText('Start Workout'))
    await queries.findByText('Pause')

    fireEvent.tap(queries.getByText('Stop'))
    await queries.findByText('Start Workout')

    fireEvent.tap(queries.getByText('Start Workout'))
    await queries.findByText('Pause')

    expect(workoutTimerMock.runnerWorkoutTimer.start).toHaveBeenCalledTimes(2)
    expect(workoutTimerMock.runnerWorkoutTimer.stop).toHaveBeenCalledTimes(1)
    expect(workoutTimerMock.runnerGps.setWorkoutTrackingEnabled).toHaveBeenCalledWith(false)
    expect(haptics.vibrate).toHaveBeenCalledTimes(2)
    expect(haptics.cancel).toHaveBeenCalledTimes(1)
  })

  it('pulses countdown haptics with the rendered timer', async () => {
    sharedProfileStore.reset()
    sharedProfileStore.save(buildCountdownProfile())
    workoutTimerMock.setState(buildTimerState())
    render(<Workout haptics={haptics} />)

    const queries = getWorkoutQueries()
    await queries.findByText('Start Workout')

    fireEvent.tap(queries.getByText('Start Workout'))
    await queries.findByText('WARMUP')

    const countdownPhases = [
      {
        phaseIndex: 0,
        phaseLabel: 'WARMUP',
        phaseType: 'warmup' as const,
        phaseDurationSeconds: 300,
      },
      { phaseIndex: 1, phaseLabel: 'RUN', phaseType: 'run' as const, phaseDurationSeconds: 12 },
      { phaseIndex: 2, phaseLabel: 'WALK', phaseType: 'walk' as const, phaseDurationSeconds: 12 },
      {
        phaseIndex: 3,
        phaseLabel: 'COOLDOWN',
        phaseType: 'cooldown' as const,
        phaseDurationSeconds: 300,
      },
    ]
    const countdownSeconds = [5.4, 4.4, 3.4, 2.4, 1.4]
    const countdownStates = countdownPhases.flatMap((phase) =>
      countdownSeconds.map((phaseRemainingSeconds) => ({
        ...phase,
        phaseRemainingSeconds,
        timerText: `${Math.round(phaseRemainingSeconds)}s`,
      }))
    )

    let expectedCalls = 1
    for (const state of countdownStates) {
      workoutTimerMock.setState(
        buildTimerState({
          isRunning: true,
          phaseDurationSeconds: state.phaseDurationSeconds,
          phaseIndex: state.phaseIndex,
          phaseLabel: state.phaseLabel,
          phaseRemainingSeconds: state.phaseRemainingSeconds,
          phaseType: state.phaseType,
          totalElapsedSeconds: 0,
          totalRemainingSeconds: 0,
        })
      )

      await vi.advanceTimersByTimeAsync(1000)
      await queries.findByText(state.timerText)

      expectedCalls += 1
      expect(haptics.vibrate).toHaveBeenCalledTimes(expectedCalls)
    }
  })

  it('pauses and resumes the countdown', async () => {
    workoutTimerMock.setState(buildTimerState())
    render(<Workout haptics={haptics} />)

    const queries = getWorkoutQueries()
    await queries.findByText('Start Workout')

    fireEvent.tap(queries.getByText('Start Workout'))
    await queries.findByText('Pause')

    workoutTimerMock.setState(
      buildTimerState({
        phaseRemainingSeconds: 299,
        totalElapsedSeconds: 1,
        totalRemainingSeconds: 1799,
      })
    )
    await vi.advanceTimersByTimeAsync(1000)
    await queries.findByText('4m 59s')

    fireEvent.tap(queries.getByText('Pause'))
    expect(workoutTimerMock.runnerWorkoutTimer.pause).toHaveBeenCalledTimes(1)
    expect(workoutTimerMock.runnerGps.setWorkoutTrackingEnabled).toHaveBeenCalledWith(false)

    workoutTimerMock.setState(
      buildTimerState({
        isPaused: true,
        phaseRemainingSeconds: 299,
        totalElapsedSeconds: 1,
        totalRemainingSeconds: 1799,
      })
    )
    await vi.advanceTimersByTimeAsync(1000)
    await queries.findByText('Resume')

    fireEvent.tap(queries.getByText('Resume'))
    expect(workoutTimerMock.runnerWorkoutTimer.resume).toHaveBeenCalledTimes(1)
    expect(workoutTimerMock.runnerGps.setWorkoutTrackingEnabled).toHaveBeenCalledWith(true)

    workoutTimerMock.setState(
      buildTimerState({
        phaseRemainingSeconds: 298,
        totalElapsedSeconds: 2,
        totalRemainingSeconds: 1798,
      })
    )
    await vi.advanceTimersByTimeAsync(1000)
    await queries.findByText('4m 58s')
  })

  it('completes the workout, saves the session, and closes from the summary', async () => {
    workoutTimerMock.setState(buildTimerState())
    workoutTimerMock.setGpsState(
      buildGpsState({
        distanceMiles: 0.47,
      })
    )
    render(<Workout haptics={haptics} />)

    const queries = getWorkoutQueries()
    await queries.findByText('Start Workout')

    fireEvent.tap(queries.getByText('Start Workout'))
    await queries.findByText('WARMUP')

    workoutTimerMock.setState(
      buildTimerState({
        isComplete: true,
        isRunning: false,
        phaseIndex: 2,
        phaseLabel: 'COOLDOWN',
        phaseRemainingSeconds: 0,
        totalElapsedSeconds: 1800,
        totalRemainingSeconds: 0,
      })
    )

    await vi.advanceTimersByTimeAsync(1000)
    await queries.findByText('Workout complete')
    await queries.findByText('Session saved. Close to return home.')
    expect(
      queries.getByText((_, element) => element?.textContent === 'Total distance: 0.47 mi')
    ).toBeInTheDocument()
    expect(
      queries.getByText('GPS metrics recorded. No interval breakdown recorded.')
    ).toBeInTheDocument()

    const profile = sharedProfileStore.loadOrCreate().profile
    expect(profile.sessions).toHaveLength(1)
    expect(profile.sessions[0]?.intervals).toHaveLength(0)
    expect(profile.sessions[0]?.totalDistanceMiles).toBe(0.47)
    expect(workoutTimerMock.runnerWorkoutTimer.stop).toHaveBeenCalledTimes(1)
    expect(workoutTimerMock.runnerGps.setWorkoutTrackingEnabled).toHaveBeenCalledWith(false)
    expect(haptics.cancel).toHaveBeenCalledTimes(1)

    fireEvent.tap(queries.getByText('Done'))

    expect(router.close).toHaveBeenCalledTimes(1)
  })
})

const buildGpsState = (overrides: Partial<WorkoutGpsState> = {}): WorkoutGpsState => ({
  distanceMiles: 0.5,
  hasPermission: true,
  isLocationEnabled: true,
  isTracking: true,
  ...overrides,
})
