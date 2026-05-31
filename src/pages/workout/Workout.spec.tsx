import '@testing-library/jest-dom'
import { fireEvent, getQueriesForElement, render } from '@lynx-js/react/testing-library'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as router from 'sparkling-navigation'

import { Workout } from './Workout.js'
import { sharedProfileStore } from '../../domain/profile.js'
import type { TrainingProfile } from '../../domain/types.js'
import type { WorkoutTimerState } from '../../native-bridge/workout-timer.js'

const workoutTimerMock = vi.hoisted(() => {
  let state: WorkoutTimerState | null = null

  return {
    runnerWorkoutTimer: {
      configure: vi.fn(),
      loadState: vi.fn(() => state),
      pause: vi.fn(),
      resume: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    },
    reset: () => {
      state = null
    },
    setState: (nextState: WorkoutTimerState | null) => {
      state = nextState
    },
  }
})

vi.mock('../../native-bridge/workout-timer.js', () => ({
  runnerWorkoutTimer: workoutTimerMock.runnerWorkoutTimer,
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
    expect(haptics.cancel).toHaveBeenCalledTimes(1)

    const profile = sharedProfileStore.loadOrCreate().profile
    expect(profile.sessions).toHaveLength(0)
  })

  it('shows warmup phase and start pulse', async () => {
    const onMounted = vi.fn()
    workoutTimerMock.setState(buildTimerState())

    render(<Workout haptics={haptics} onMounted={onMounted} />)

    expect(onMounted).toBeCalledTimes(1)

    const queries = getWorkoutQueries()
    await queries.findByText('Start Workout')
    expect(queries.queryByText('WARMUP')).not.toBeInTheDocument()

    fireEvent.tap(queries.getByText('Start Workout'))

    expect(workoutTimerMock.runnerWorkoutTimer.start).toHaveBeenCalledWith(
      buildWorkoutProfile().level
    )

    await queries.findByText('WARMUP')
    await queries.findByText('5m 0s')
    await queries.findByText('Next up: RUN 1s')

    expect(haptics.vibrate).toHaveBeenCalledWith(500)
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
    await queries.findByText('GPS unavailable yet. No interval breakdown recorded.')

    const profile = sharedProfileStore.loadOrCreate().profile
    expect(profile.sessions).toHaveLength(1)
    expect(profile.sessions[0]?.intervals).toHaveLength(0)
    expect(workoutTimerMock.runnerWorkoutTimer.stop).toHaveBeenCalledTimes(1)
    expect(haptics.cancel).toHaveBeenCalledTimes(1)

    fireEvent.tap(queries.getByText('Done'))

    expect(router.close).toHaveBeenCalledTimes(1)
  })
})
