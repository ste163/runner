import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from '@lynx-js/react'

import './Workout.css'
import { calculateIntervals, isGraduated } from '../../domain/intervals.js'
import { evaluateWindows } from '../../domain/progression.js'
import { sharedProfileStore } from '../../domain/profile.js'
import type { Session, TrainingLevel, TrainingProfile } from '../../domain/types.js'
import { useSharedProfile } from '../../domain/useSharedProfile.js'
import { runnerGps, type WorkoutGpsState } from '../../native-bridge/gps.js'
import { runnerHaptics } from '../../native-bridge/haptics.js'
import { runnerScreen } from '../../native-bridge/screen.js'
import {
  isPendingNativeStartState,
  runnerWorkoutTimer,
  type WorkoutTimerState,
} from '../../native-bridge/workout-timer.js'
import {
  Button,
  buildPauseIconContent,
  buildPlayIconContent,
  buildStopIconContent,
} from '../../components/Button/index.js'
import { Pressable } from '../../components/Pressable/index.js'
import { WorkoutTimeline } from './components/WorkoutTimeline/index.js'
import { Card } from '../../components/Card/index.js'

type WorkoutInterval = ReturnType<typeof calculateIntervals>[number]

interface WorkoutSummary {
  session: Session
  profile: TrainingProfile
}

interface WorkoutProps {
  onMounted?: () => void
  onLiveChange: (isLive: boolean) => void
  startRequestId: number
}

const formatDuration = (seconds: number): string => {
  const roundedSeconds = Math.max(Math.round(seconds), 0)
  const minutes = Math.floor(roundedSeconds / 60)
  const remainder = roundedSeconds % 60

  return minutes === 0 ? `${remainder}s` : `${minutes}m ${remainder}s`
}

const formatDistance = (miles: number): string => `${miles.toFixed(2)} mi`

const formatPace = (paceMinPerMile: number): string =>
  paceMinPerMile <= 0 ? 'No pace' : `${paceMinPerMile.toFixed(2)} min/mi`

const buildCurrentPace = (elapsedSeconds: number, distanceMiles: number): number =>
  distanceMiles <= 0 ? 0 : elapsedSeconds / 60 / distanceMiles

const levelLabel = (level: TrainingLevel): string =>
  isGraduated(level)
    ? `Running ${formatDuration(level.intervalBlockSeconds)}`
    : `Run ${formatDuration(level.runSeconds)} · Walk ${formatDuration(level.walkSeconds)}`

const buildSessionId = (): string => {
  const randomId = globalThis.crypto?.randomUUID?.()

  return randomId ?? `session-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const buildWorkoutIntervals = (level: TrainingLevel): WorkoutInterval[] => calculateIntervals(level)

const countdownHapticDurationMs = 150
const countdownPulsePattern = [0, countdownHapticDurationMs]
const phaseBoundaryPulsePattern = [0, 70, 150, 70]
const startWorkoutPulsePattern = [0, 500]

const buildCountdownPulseKey = (
  phaseIndex: number,
  displayedRemainingSeconds: number
): string | null =>
  displayedRemainingSeconds >= 1 && displayedRemainingSeconds <= 4
    ? `${phaseIndex}:${displayedRemainingSeconds}`
    : null

const buildCompletedProfile = (
  profile: TrainingProfile,
  session: Session,
  completedAt: Date
): TrainingProfile => {
  const profileWithSession: TrainingProfile = {
    ...profile,
    sessions: [...profile.sessions, session],
  }

  return profile.window.windowStart === ''
    ? {
        ...profileWithSession,
        window: {
          ...profile.window,
          consecutiveMissed: 0,
          windowStart: completedAt.toISOString(),
        },
      }
    : evaluateWindows(profileWithSession, completedAt)
}

const hasLevelChanged = (previous: TrainingLevel, next: TrainingLevel): boolean =>
  previous.runSeconds !== next.runSeconds ||
  previous.walkSeconds !== next.walkSeconds ||
  previous.intervalBlockSeconds !== next.intervalBlockSeconds

const setScreenWakeLock = (enabled: boolean): void => {
  runnerScreen.keepScreenOn(enabled)
}

const setWorkoutGpsTracking = (enabled: boolean): void => {
  runnerGps.setWorkoutTrackingEnabled(enabled)
}

const openLocationSettings = (): void => {
  runnerGps.openLocationSettings()
}

const isGpsUnavailable = (gpsState: WorkoutGpsState | null): boolean =>
  gpsState === null || !gpsState.hasPermission || !gpsState.isLocationEnabled

const buildDistanceStatLabel = (gpsState: WorkoutGpsState | null): string =>
  isGpsUnavailable(gpsState) ? 'N/A' : formatDistance(gpsState?.distanceMiles ?? 0)

const buildPaceStatLabel = (gpsState: WorkoutGpsState | null, elapsedSeconds: number): string => {
  if (isGpsUnavailable(gpsState)) return 'N/A - Location off'

  const distanceMiles = gpsState?.distanceMiles ?? 0
  const paceMinPerMile = buildCurrentPace(elapsedSeconds, distanceMiles)

  return distanceMiles <= 0 ? 'No pace yet' : formatPace(paceMinPerMile)
}

export const Workout = ({
  onMounted,
  onLiveChange,
  startRequestId,
}: WorkoutProps): ReactElement => {
  const [isStarted, setIsStarted] = useState(false)
  const [timerState, setTimerState] = useState<WorkoutTimerState | null>(null)
  const [gpsState, setGpsState] = useState<WorkoutGpsState | null>(() => runnerGps.loadState())
  const [summary, setSummary] = useState<WorkoutSummary | null>(null)
  const [isConfirmingStop, setIsConfirmingStop] = useState(false)
  const { profile: sessionProfile, refresh: refreshSessionProfile } = useSharedProfile({
    active: !isStarted && summary === null,
  })
  const workoutIntervals = useMemo(
    () => buildWorkoutIntervals(sessionProfile.level),
    [sessionProfile.level]
  )
  const hasStartedRef = useRef(false)
  const completionHandledRef = useRef(false)
  const startRequestedRef = useRef(false)
  const recoveryHandledRef = useRef(false)
  const countdownPulseKeyRef = useRef<string | null>(null)
  const lastPhaseIndexRef = useRef<number | null>(null)
  const gpsUnavailable = isGpsUnavailable(gpsState)

  const completeWorkout = useCallback((): void => {
    'background only'

    if (completionHandledRef.current) return

    completionHandledRef.current = true
    startRequestedRef.current = false

    const completedGpsState = runnerGps.loadState()
    const completedTimerState = runnerWorkoutTimer.loadState()
    setWorkoutGpsTracking(false)
    runnerWorkoutTimer.stop()
    setScreenWakeLock(false)

    const completedAt = new Date()
    const latestProfile = sharedProfileStore.loadOrCreate().profile
    const session: Session = {
      id: buildSessionId(),
      completedAt: completedAt.toISOString(),
      intervals: [],
      level: { ...latestProfile.level },
      totalDistanceMiles: completedGpsState?.distanceMiles ?? 0,
      totalElapsedSeconds: completedTimerState?.totalElapsedSeconds ?? 0,
      avgPaceMinPerMile: buildCurrentPace(
        completedTimerState?.totalElapsedSeconds ?? 0,
        completedGpsState?.distanceMiles ?? 0
      ),
    }
    const nextProfile = buildCompletedProfile(latestProfile, session, completedAt)

    sharedProfileStore.save(nextProfile)
    setSummary({ profile: nextProfile, session })
    setIsStarted(false)
    setTimerState(null)
    setGpsState(completedGpsState)
    onLiveChange(false)
    runnerHaptics.cancel()
    runnerHaptics.vibratePattern(phaseBoundaryPulsePattern)
  }, [onLiveChange])

  const syncWorkoutState = useCallback((): void => {
    const nextTimerState = runnerWorkoutTimer.loadState()

    if (!nextTimerState) return
    if (startRequestedRef.current && isPendingNativeStartState(nextTimerState)) return

    setTimerState(nextTimerState)
    setGpsState(runnerGps.loadState())

    if (nextTimerState.isComplete) {
      startRequestedRef.current = false
      completeWorkout()
      return
    }

    startRequestedRef.current = false
    setIsStarted(nextTimerState.isRunning)
  }, [completeWorkout])

  const handlePauseToggle = useCallback((): void => {
    setIsConfirmingStop(false)

    if (timerState?.isPaused) {
      setWorkoutGpsTracking(true)
      runnerWorkoutTimer.resume()
      syncWorkoutState()
      return
    }

    setWorkoutGpsTracking(false)
    runnerWorkoutTimer.pause()
    syncWorkoutState()
  }, [syncWorkoutState, timerState])

  const handleStart = useCallback((): void => {
    startRequestedRef.current = true
    setIsConfirmingStop(false)
    const latestProfile = sharedProfileStore.loadOrCreate().profile

    refreshSessionProfile()
    setIsStarted(true)
    setWorkoutGpsTracking(true)
    setScreenWakeLock(true)
    runnerWorkoutTimer.start(latestProfile.level)
    runnerHaptics.vibratePattern(startWorkoutPulsePattern)
    onLiveChange(true)
    syncWorkoutState()
  }, [onLiveChange, refreshSessionProfile, syncWorkoutState])

  const handleStop = useCallback((): void => {
    startRequestedRef.current = false
    setIsConfirmingStop(false)
    setWorkoutGpsTracking(false)
    setScreenWakeLock(false)
    runnerWorkoutTimer.stop()
    runnerHaptics.cancel()
    setTimerState(null)
    setIsStarted(false)
    setGpsState(runnerGps.loadState())
    onLiveChange(false)
  }, [onLiveChange])

  const handleDone = useCallback((): void => {
    completionHandledRef.current = false
    setIsConfirmingStop(false)
    refreshSessionProfile()
    setSummary(null)
    setTimerState(null)
    setIsStarted(false)
    setGpsState(runnerGps.loadState())
  }, [refreshSessionProfile])

  const handleRequestStop = useCallback((): void => {
    setIsConfirmingStop(true)
  }, [])

  const handleCancelStop = useCallback((): void => {
    setIsConfirmingStop(false)
  }, [])

  const handleOpenPaceSettings = useCallback((): void => {
    if (!gpsUnavailable) return

    openLocationSettings()
  }, [gpsUnavailable])

  useEffect(() => {
    if (hasStartedRef.current) return

    hasStartedRef.current = true
    onMounted?.()
  }, [onMounted])

  useEffect(() => {
    return () => {
      setWorkoutGpsTracking(false)
      setScreenWakeLock(false)
    }
  }, [])

  useEffect(() => {
    if (recoveryHandledRef.current) return

    recoveryHandledRef.current = true

    const recoveredState = runnerWorkoutTimer.loadState()

    if (recoveredState === null || isPendingNativeStartState(recoveredState)) return

    if (recoveredState.isComplete) {
      syncWorkoutState()
      return
    }

    setScreenWakeLock(true)
    setIsStarted(true)
    onLiveChange(true)
  }, [onLiveChange, syncWorkoutState])

  useEffect(() => {
    if (!isStarted || summary !== null) return

    syncWorkoutState()

    const intervalId = setInterval(() => {
      syncWorkoutState()
    }, 250)

    return () => clearInterval(intervalId)
  }, [isStarted, summary, syncWorkoutState])

  const startRequestIdRef = useRef(startRequestId)

  useEffect(() => {
    if (startRequestId === startRequestIdRef.current) return

    startRequestIdRef.current = startRequestId

    if (summary !== null) handleDone()
    if (isStarted) return

    handleStart()
  }, [startRequestId, summary, isStarted, handleDone, handleStart])

  const currentPhaseIndex = timerState?.phaseIndex ?? 0
  const currentInterval = workoutIntervals[currentPhaseIndex]
  const remainingSeconds =
    timerState?.phaseRemainingSeconds ?? currentInterval?.durationSeconds ?? 0
  const displayedRemainingSeconds = Math.max(Math.round(remainingSeconds), 0)
  const isPaused = timerState?.isPaused ?? false
  const isFresh = timerState === null && !isStarted
  const toggleLabel = isFresh ? 'Start' : isPaused ? 'Resume' : 'Pause'
  const toggleIconContent = isFresh || isPaused ? buildPlayIconContent() : buildPauseIconContent()
  const elapsedSeconds = timerState?.totalElapsedSeconds ?? 0
  const distanceStatLabel = buildDistanceStatLabel(gpsState)
  const paceStatLabel = buildPaceStatLabel(gpsState, elapsedSeconds)
  const workoutLevel = summary === null ? sessionProfile.level : summary.profile.level
  const workoutLevelMessage = hasLevelChanged(sessionProfile.level, workoutLevel)
    ? `New level: ${levelLabel(workoutLevel)}`
    : `Current level: ${levelLabel(workoutLevel)}`

  useEffect(() => {
    if (!isStarted || summary !== null) {
      countdownPulseKeyRef.current = null
      return
    }

    if (isPaused) return

    const nextPulseKey = buildCountdownPulseKey(currentPhaseIndex, displayedRemainingSeconds)

    if (!nextPulseKey) {
      countdownPulseKeyRef.current = null
      return
    }

    if (countdownPulseKeyRef.current === nextPulseKey) return

    countdownPulseKeyRef.current = nextPulseKey
    runnerHaptics.vibratePattern(countdownPulsePattern)
  }, [currentPhaseIndex, displayedRemainingSeconds, isPaused, isStarted, summary])

  useEffect(() => {
    const nextPhaseIndex = timerState?.phaseIndex ?? null

    if (nextPhaseIndex === null) {
      lastPhaseIndexRef.current = null
      return
    }

    const previousPhaseIndex = lastPhaseIndexRef.current

    if (previousPhaseIndex !== null && nextPhaseIndex !== previousPhaseIndex) {
      runnerHaptics.vibratePattern(phaseBoundaryPulsePattern)
    }

    lastPhaseIndexRef.current = nextPhaseIndex
  }, [timerState])

  return (
    <view className='page workout'>
      {summary === null ? (
        <>
          <WorkoutTimeline intervals={workoutIntervals} timerState={timerState} />

          <view className='workout__bottom'>
            <Card className='stats'>
              <view className='stats__item'>
                <text className='stats__label'>Elapsed</text>
                <text className='stats__value'>{formatDuration(elapsedSeconds)}</text>
              </view>
              <view className='stats__item'>
                <text className='stats__label'>Distance</text>
                <text className='stats__value'>{distanceStatLabel}</text>
              </view>
              <Pressable className='stats__item' onTap={handleOpenPaceSettings}>
                <text className='stats__label'>Pace</text>
                <text
                  className={gpsUnavailable ? 'stats__value stats__value--action' : 'stats__value'}
                >
                  {paceStatLabel}
                </text>
              </Pressable>
            </Card>

            <view className='stack'>
              <Button
                label={toggleLabel}
                icon={toggleIconContent}
                onTap={isFresh ? handleStart : handlePauseToggle}
              />
              {isFresh ? null : isConfirmingStop ? (
                <>
                  <text className='stopConfirm__text'>
                    If you stop before the cool-down walk, your progress will not be saved.
                  </text>
                  <view className='stopConfirm__actions'>
                    <Button label='Cancel' variant='neutral' onTap={handleCancelStop} />
                    <Button
                      label='Stop'
                      variant='danger'
                      icon={buildStopIconContent()}
                      onTap={handleStop}
                    />
                  </view>
                </>
              ) : (
                <Button
                  label='Stop'
                  variant='danger'
                  icon={buildStopIconContent()}
                  onTap={handleRequestStop}
                />
              )}
            </view>
          </view>
        </>
      ) : (
        <>
          <view className='hero hero--tight'>
            <text className='eyebrow'>Workout complete</text>
            <text className='title'>Nice work</text>
            <text className='subtitle'>Session saved. Stay here or head back home.</text>
          </view>

          <Card title='Summary'>
            <view className='stack'>
              <text className='copy'>
                Total distance: {formatDistance(summary.session.totalDistanceMiles)}
              </text>
              <text className='copy'>
                {summary.session.totalDistanceMiles > 0
                  ? 'GPS metrics recorded. No interval breakdown recorded.'
                  : summary.session.intervals.length === 0
                    ? 'GPS unavailable yet. No interval breakdown recorded.'
                    : 'Interval breakdown recorded below.'}
              </text>
              <text className='copy'>{workoutLevelMessage}</text>
            </view>
          </Card>

          {summary.session.intervals.length > 0 ? (
            <Card title='Per-interval breakdown'>
              <view className='breakdown'>
                {summary.session.intervals.map((interval, index) => (
                  <view className='breakdown__row' key={`${interval.type}-${index}`}>
                    <text className='breakdown__label'>
                      {interval.type.toUpperCase()} {formatDuration(interval.durationSeconds)}
                    </text>
                    <text className='breakdown__value'>
                      {formatDistance(interval.distanceMiles)} ·{' '}
                      {formatPace(interval.avgPaceMinPerMile)}
                    </text>
                  </view>
                ))}
              </view>
            </Card>
          ) : null}

          <Button label='Done' onTap={handleDone} />
        </>
      )}
    </view>
  )
}
