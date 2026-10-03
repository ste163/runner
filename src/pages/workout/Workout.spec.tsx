import '@testing-library/jest-dom'
import { fireEvent, getQueriesForElement, render } from '@lynx-js/react/testing-library'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Workout } from './Workout.js'
import { sharedProfileStore } from '../../domain/profile.js'
import type { TrainingProfile } from '../../domain/types.js'
import { runnerGps, type RunnerGpsModule } from '../../native-bridge/gps.js'
import { runnerHaptics, type WorkoutHaptics } from '../../native-bridge/haptics.js'
import { runnerScreen, type RunnerScreenModule } from '../../native-bridge/screen.js'
import { runnerProfileStorage } from '../../native-bridge/storage.js'
import {
  runnerWorkoutTimer,
  type RunnerWorkoutTimerModule,
  type WorkoutTimerState,
} from '../../native-bridge/workout-timer.js'

const buildProfile = (runSeconds: number, walkSeconds: number): TrainingProfile => ({
  schemaVersion: 1,
  level: { runSeconds, walkSeconds, intervalBlockSeconds: 1200 },
  window: { windowStart: '', consecutiveMissed: 0 },
  sessions: [],
})

const buildTimerModule = (state: WorkoutTimerState | null): RunnerWorkoutTimerModule => ({
  getWorkoutTimerState: vi.fn(() => (state === null ? null : JSON.stringify(state))),
  pauseWorkout: vi.fn(),
  resumeWorkout: vi.fn(),
  startWorkout: vi.fn(),
  stopWorkout: vi.fn(),
})

const buildGpsModule = (): RunnerGpsModule => ({
  getWorkoutGpsState: vi.fn(() => null),
  resetWorkoutDistance: vi.fn(),
  setWorkoutTrackingEnabled: vi.fn(),
  openLocationSettings: vi.fn(),
})

const buildScreenModule = (): RunnerScreenModule => ({
  keepScreenOn: vi.fn(),
  setShowWhenLocked: vi.fn(),
})

const buildHapticsModule = (): WorkoutHaptics => ({
  cancel: vi.fn(),
  vibratePattern: vi.fn(),
})

const buildStubNodesRef = () => ({ invoke: () => ({ exec: () => {} }) })

// The @lynx-js/react testing library mock runtime does not implement
// NodesRef.invoke. Stub the background thread's lynx.createSelectorQuery so
// ref-based imperative calls (the timeline dial's scrollTo) become no-ops.
// The env copies this object onto the worker global on each thread switch,
// and its auto-reset rebuilds it after every test, so no restore is needed.
const stubSelectorQuery = (): void => {
  const backgroundGlobal = (
    globalThis as unknown as {
      lynxTestingEnv?: { backgroundThread: { globalThis: Record<string, unknown> } }
    }
  ).lynxTestingEnv?.backgroundThread.globalThis

  if (!backgroundGlobal) return

  backgroundGlobal['lynx'] = {
    ...(backgroundGlobal['lynx'] as Record<string, unknown>),
    createSelectorQuery: () => ({
      selectUniqueID: buildStubNodesRef,
      select: buildStubNodesRef,
    }),
  }
}

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
  intervals: [],
})

const buildCompleteTimerState = (): WorkoutTimerState => ({
  isComplete: true,
  isPaused: false,
  isRunning: false,
  phaseDurationSeconds: 300,
  phaseIndex: 0,
  phaseLabel: 'COOLDOWN',
  phaseRemainingSeconds: 0,
  phaseType: 'cooldown',
  totalElapsedSeconds: 1800,
  totalRemainingSeconds: 0,
  intervals: [
    { type: 'warmup', durationSeconds: 300, distanceMiles: 0.25 },
    { type: 'run', durationSeconds: 30, distanceMiles: 0.0625 },
    { type: 'walk', durationSeconds: 120, distanceMiles: 0.25 },
    { type: 'cooldown', durationSeconds: 300, distanceMiles: 0.25 },
  ],
})

const buildStaleTimerState = (): WorkoutTimerState => ({
  isComplete: false,
  isPaused: false,
  isRunning: false,
  phaseDurationSeconds: 0,
  phaseIndex: 0,
  phaseLabel: 'WARMUP',
  phaseRemainingSeconds: 0,
  phaseType: 'warmup',
  totalElapsedSeconds: 0,
  totalRemainingSeconds: 0,
  intervals: [],
})

describe('Workout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sharedProfileStore.reset()
    runnerProfileStorage.configure(null)
    runnerWorkoutTimer.configure(null)
    runnerGps.configure(null)
    runnerScreen.configure(null)
    runnerHaptics.configure(null)
    stubSelectorQuery()
  })

  afterEach(() => {
    runnerProfileStorage.configure(null)
    runnerWorkoutTimer.configure(null)
    runnerGps.configure(null)
    runnerScreen.configure(null)
    runnerHaptics.configure(null)
    vi.unstubAllGlobals()
  })

  it('renders the timeline from the stored profile on mount', async () => {
    sharedProfileStore.save(buildProfile(33, 90))

    render(<Workout onLiveChange={vi.fn()} startRequestId={0} />)

    const { findAllByText, findByText } = getQueriesForElement(elementTree.root!)

    expect((await findAllByText('Run 0:33')).length).toBeGreaterThan(0)
    expect((await findAllByText('Walk 1:30')).length).toBeGreaterThan(0)
    await findByText('Set 0/10')
    await findByText('Runs 0/10')
    await findByText('Walks 0/10')
  })

  it('updates the timeline when the profile changes on another page', async () => {
    render(<Workout onLiveChange={vi.fn()} startRequestId={0} />)

    const { findAllByText, queryByText } = getQueriesForElement(elementTree.root!)

    expect((await findAllByText('Run 0:30')).length).toBeGreaterThan(0)

    sharedProfileStore.save(buildProfile(33, 90))

    expect((await findAllByText('Run 0:33')).length).toBeGreaterThan(0)
    expect(queryByText('Run 0:30')).toBeNull()
  })

  it('recovers a live workout from the native timer state on mount', async () => {
    const gpsModule = buildGpsModule()
    const screenModule = buildScreenModule()
    const onLiveChange = vi.fn()

    runnerWorkoutTimer.configure(buildTimerModule(buildLiveTimerState()))
    runnerGps.configure(gpsModule)
    runnerScreen.configure(screenModule)

    render(<Workout onLiveChange={onLiveChange} startRequestId={0} />)

    const { findAllByText, findByText } = getQueriesForElement(elementTree.root!)

    await findByText('Pause')
    await findByText('Run pace')
    await findByText('Walk pace')
    expect(await findAllByText('N/A')).toHaveLength(3)
    expect(onLiveChange).toHaveBeenCalledWith(true)
    expect(screenModule.keepScreenOn).toHaveBeenCalledWith(true)
    expect(screenModule.setShowWhenLocked).toHaveBeenCalledWith(true)
    expect(gpsModule.setWorkoutTrackingEnabled).not.toHaveBeenCalled()
  })

  it('shows run pace and walk pace during a live workout', async () => {
    const liveState: WorkoutTimerState = {
      ...buildLiveTimerState(),
      phaseRemainingSeconds: 15,
      intervals: [
        { type: 'warmup', durationSeconds: 300, distanceMiles: 0.25 },
        { type: 'run', durationSeconds: 30, distanceMiles: 0.125 },
        { type: 'walk', durationSeconds: 120, distanceMiles: 0.0625 },
      ],
    }
    const gpsModule: RunnerGpsModule = {
      getWorkoutGpsState: vi.fn(() =>
        JSON.stringify({
          distanceMiles: 0.5,
          hasPermission: true,
          isLocationEnabled: true,
          isTracking: true,
        })
      ),
      openLocationSettings: vi.fn(),
      resetWorkoutDistance: vi.fn(),
      setWorkoutTrackingEnabled: vi.fn(),
    }

    runnerWorkoutTimer.configure(buildTimerModule(liveState))
    runnerGps.configure(gpsModule)
    runnerScreen.configure(buildScreenModule())

    render(<Workout onLiveChange={vi.fn()} startRequestId={0} />)

    const { findAllByText, findByText } = getQueriesForElement(elementTree.root!)

    await findByText('Run pace')
    await findByText('Walk pace')
    await findByText('4.00')
    await findByText('22.40')
    expect(await findAllByText('min/mi')).toHaveLength(2)
  })

  it('records the session and shows the summary when the workout completed while closed', async () => {
    const onLiveChange = vi.fn()
    const screenModule = buildScreenModule()

    runnerWorkoutTimer.configure(buildTimerModule(buildCompleteTimerState()))
    runnerScreen.configure(screenModule)

    render(<Workout onLiveChange={onLiveChange} startRequestId={0} />)

    const { findByText } = getQueriesForElement(elementTree.root!)

    await findByText('Workout complete')
    await findByText('Interval breakdown recorded below.')
    expect(onLiveChange).toHaveBeenCalledWith(false)
    expect(screenModule.setShowWhenLocked).toHaveBeenCalledWith(false)

    const storedSession = sharedProfileStore.loadOrCreate().profile.sessions[0]

    expect(storedSession?.intervals).toEqual([
      { type: 'warmup', durationSeconds: 300, distanceMiles: 0.25, avgPaceMinPerMile: 20 },
      { type: 'run', durationSeconds: 30, distanceMiles: 0.0625, avgPaceMinPerMile: 8 },
      { type: 'walk', durationSeconds: 120, distanceMiles: 0.25, avgPaceMinPerMile: 8 },
      { type: 'cooldown', durationSeconds: 300, distanceMiles: 0.25, avgPaceMinPerMile: 20 },
    ])
  })

  it('shows the current set count in the header during the block', async () => {
    sharedProfileStore.save(buildProfile(33, 90))

    runnerWorkoutTimer.configure(buildTimerModule(buildLiveTimerState()))
    runnerScreen.configure(buildScreenModule())

    render(<Workout onLiveChange={vi.fn()} startRequestId={0} />)

    const { findByText } = getQueriesForElement(elementTree.root!)

    await findByText('Set 2/10')
    await findByText('Runs 1/10')
    await findByText('Walks 1/10')
  })

  it('shows the final set count in the header during the cooldown', async () => {
    sharedProfileStore.save(buildProfile(33, 90))

    const cooldownState: WorkoutTimerState = {
      ...buildLiveTimerState(),
      phaseDurationSeconds: 300,
      phaseIndex: 21,
      phaseLabel: 'COOLDOWN',
      phaseRemainingSeconds: 210,
      phaseType: 'cooldown',
    }

    runnerWorkoutTimer.configure(buildTimerModule(cooldownState))
    runnerScreen.configure(buildScreenModule())

    render(<Workout onLiveChange={vi.fn()} startRequestId={0} />)

    const { findByText } = getQueriesForElement(elementTree.root!)

    await findByText('Set 10/10')
    await findByText('Runs 10/10')
    await findByText('Walks 10/10')
  })

  it('hides the walk count for a graduated profile', async () => {
    sharedProfileStore.save(buildProfile(1200, 120))

    render(<Workout onLiveChange={vi.fn()} startRequestId={0} />)

    const { findByText, queryByText } = getQueriesForElement(elementTree.root!)

    await findByText('Set 0/1')
    await findByText('Runs 0/1')
    expect(queryByText(/Walks/)).toBeNull()
  })

  it('shows the fresh workout UI when the native timer state is empty', async () => {
    runnerWorkoutTimer.configure(buildTimerModule(null))

    render(<Workout onLiveChange={vi.fn()} startRequestId={0} />)

    const { findByText } = getQueriesForElement(elementTree.root!)

    await findByText('Start')
  })

  it('shows the fresh workout UI when the native timer state is stale', async () => {
    runnerWorkoutTimer.configure(buildTimerModule(buildStaleTimerState()))

    render(<Workout onLiveChange={vi.fn()} startRequestId={0} />)

    const { findByText } = getQueriesForElement(elementTree.root!)

    await findByText('Start')
  })

  it('vibrates when the user pauses the workout', async () => {
    const timerModule = buildTimerModule(buildLiveTimerState())
    const hapticsModule = buildHapticsModule()

    runnerWorkoutTimer.configure(timerModule)
    runnerHaptics.configure(hapticsModule)
    runnerScreen.configure(buildScreenModule())

    render(<Workout onLiveChange={vi.fn()} startRequestId={0} />)

    const { findByText } = getQueriesForElement(elementTree.root!)

    fireEvent.tap(await findByText('Pause'))

    expect(timerModule.pauseWorkout).toHaveBeenCalledTimes(1)
    expect(hapticsModule.vibratePattern).toHaveBeenCalledTimes(1)
    expect(hapticsModule.vibratePattern).toHaveBeenCalledWith('[0,150]')
  })

  it('vibrates when the user resumes the workout', async () => {
    const timerModule = buildTimerModule({
      ...buildLiveTimerState(),
      isPaused: true,
      isRunning: false,
    })
    const hapticsModule = buildHapticsModule()

    runnerWorkoutTimer.configure(timerModule)
    runnerHaptics.configure(hapticsModule)
    runnerScreen.configure(buildScreenModule())

    render(<Workout onLiveChange={vi.fn()} startRequestId={0} />)

    const { findByText } = getQueriesForElement(elementTree.root!)

    fireEvent.tap(await findByText('Resume'))

    expect(timerModule.resumeWorkout).toHaveBeenCalledTimes(1)
    expect(hapticsModule.vibratePattern).toHaveBeenCalledTimes(1)
    expect(hapticsModule.vibratePattern).toHaveBeenCalledWith('[0,150]')
  })

  it('vibrates when the user confirms stop', async () => {
    const timerModule = buildTimerModule(buildLiveTimerState())
    const hapticsModule = buildHapticsModule()

    runnerWorkoutTimer.configure(timerModule)
    runnerHaptics.configure(hapticsModule)
    runnerScreen.configure(buildScreenModule())

    render(<Workout onLiveChange={vi.fn()} startRequestId={0} />)

    const { findByText } = getQueriesForElement(elementTree.root!)

    fireEvent.tap(await findByText('Stop'))
    await findByText('If you stop before the cool-down walk, your progress will not be saved.')
    fireEvent.tap(await findByText('Stop'))

    expect(timerModule.stopWorkout).toHaveBeenCalledTimes(1)
    expect(hapticsModule.cancel).toHaveBeenCalledTimes(1)
    expect(hapticsModule.vibratePattern).toHaveBeenCalledTimes(1)
    expect(hapticsModule.vibratePattern).toHaveBeenCalledWith('[0,150]')
  })
})
