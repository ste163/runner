import { useCallback, useEffect, useMemo, useRef, useState } from '@lynx-js/react'

import { close } from 'sparkling-navigation'

import './Workout.css'
import { calculateIntervals, isGraduated } from '../../domain/intervals.js'
import { evaluateWindows } from '../../domain/progression.js'
import { sharedProfileStore } from '../../domain/profile.js'
import type { Session, TrainingLevel, TrainingProfile } from '../../domain/types.js'
import type { WorkoutHaptics } from '../../native-bridge/haptics.js'
import { runnerWorkoutTimer, type WorkoutTimerState } from '../../native-bridge/workout-timer.js'

type WorkoutInterval = ReturnType<typeof calculateIntervals>[number]

interface WorkoutSummary {
  session: Session
  profile: TrainingProfile
}

interface WorkoutProps {
  onMounted?: () => void
  haptics: WorkoutHaptics
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

const levelLabel = (level: TrainingLevel): string =>
  isGraduated(level)
    ? `Running ${formatDuration(level.intervalBlockSeconds)}`
    : `Run ${formatDuration(level.runSeconds)} · Walk ${formatDuration(level.walkSeconds)}`

const buildSessionId = (): string => {
  const randomId = globalThis.crypto?.randomUUID?.()

  return randomId ?? `session-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const buildWorkoutIntervals = (level: TrainingLevel): WorkoutInterval[] => calculateIntervals(level)

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

const buildNextUpLabel = (intervals: WorkoutInterval[], nextIndex: number): string => {
  const nextInterval = intervals[nextIndex]

  return nextInterval
    ? `Next up: ${nextInterval.type.toUpperCase()} ${formatDuration(nextInterval.durationSeconds)}`
    : 'Next up: complete'
}

const hasLevelChanged = (previous: TrainingLevel, next: TrainingLevel): boolean =>
  previous.runSeconds !== next.runSeconds ||
  previous.walkSeconds !== next.walkSeconds ||
  previous.intervalBlockSeconds !== next.intervalBlockSeconds

const isPendingNativeStartState = (timerState: WorkoutTimerState): boolean =>
  !timerState.isRunning && !timerState.isPaused && !timerState.isComplete

export const Workout = ({ haptics, onMounted }: WorkoutProps): JSX.Element => {
  const [sessionProfile] = useState<TrainingProfile>(
    () => sharedProfileStore.loadOrCreate().profile
  )
  const workoutIntervals = useMemo(
    () => buildWorkoutIntervals(sessionProfile.level),
    [sessionProfile.level]
  )
  const [isStarted, setIsStarted] = useState(false)
  const [timerState, setTimerState] = useState<WorkoutTimerState | null>(null)
  const [summary, setSummary] = useState<WorkoutSummary | null>(null)
  const hasStartedRef = useRef(false)
  const completionHandledRef = useRef(false)
  const startRequestedRef = useRef(false)

  const completeWorkout = useCallback((): void => {
    'background only'

    if (completionHandledRef.current) return

    completionHandledRef.current = true
    startRequestedRef.current = false

    runnerWorkoutTimer.stop()

    const completedAt = new Date()
    const session: Session = {
      id: buildSessionId(),
      completedAt: completedAt.toISOString(),
      intervals: [],
      level: { ...sessionProfile.level },
      totalDistanceMiles: 0,
    }
    const nextProfile = buildCompletedProfile(sessionProfile, session, completedAt)

    sharedProfileStore.save(nextProfile)
    setSummary({ profile: nextProfile, session })
    setIsStarted(false)
    setTimerState(null)
    haptics.cancel()
  }, [haptics, sessionProfile])

  const syncWorkoutState = useCallback((): void => {
    const nextTimerState = runnerWorkoutTimer.loadState()

    if (!nextTimerState) return
    if (startRequestedRef.current && isPendingNativeStartState(nextTimerState)) return

    setTimerState(nextTimerState)

    if (nextTimerState.isComplete) {
      startRequestedRef.current = false
      completeWorkout()
      return
    }

    startRequestedRef.current = false
    setIsStarted(nextTimerState.isRunning)
  }, [completeWorkout])

  const handlePauseToggle = useCallback((): void => {
    if (timerState?.isPaused) {
      runnerWorkoutTimer.resume()
      syncWorkoutState()
      return
    }

    runnerWorkoutTimer.pause()
    syncWorkoutState()
  }, [syncWorkoutState, timerState])

  const handleStart = useCallback((): void => {
    startRequestedRef.current = true
    setIsStarted(true)
    runnerWorkoutTimer.start(sessionProfile.level)
    haptics.vibrate(500)
    syncWorkoutState()
  }, [haptics, sessionProfile.level, syncWorkoutState])

  const handleStop = useCallback((): void => {
    startRequestedRef.current = false
    runnerWorkoutTimer.stop()
    haptics.cancel()
    setTimerState(null)
    setIsStarted(false)
    close()
  }, [haptics])

  const handleDone = useCallback((): void => {
    close()
  }, [])

  useEffect(() => {
    if (hasStartedRef.current) return

    hasStartedRef.current = true
    onMounted?.()
  }, [onMounted])

  useEffect(() => {
    if (!isStarted || summary !== null) return

    syncWorkoutState()

    const intervalId = setInterval(() => {
      syncWorkoutState()
    }, 1000)

    return () => clearInterval(intervalId)
  }, [isStarted, summary, syncWorkoutState])

  const currentPhaseIndex = timerState?.phaseIndex ?? 0
  const currentInterval = workoutIntervals[currentPhaseIndex]
  const totalSeconds = useMemo(
    () => workoutIntervals.reduce((total, interval) => total + interval.durationSeconds, 0),
    [workoutIntervals]
  )
  const remainingSeconds =
    timerState?.phaseRemainingSeconds ?? currentInterval?.durationSeconds ?? 0
  const isPaused = timerState?.isPaused ?? false
  const elapsedSeconds = timerState?.totalElapsedSeconds ?? 0
  const nextUpLabel = buildNextUpLabel(workoutIntervals, currentPhaseIndex + 1)
  const workoutLevel = summary === null ? sessionProfile.level : summary.profile.level
  const workoutLevelMessage = hasLevelChanged(sessionProfile.level, workoutLevel)
    ? `New level: ${levelLabel(workoutLevel)}`
    : `Current level: ${levelLabel(workoutLevel)}`

  return (
    <scroll-view className='page-scroll' scroll-orientation='vertical'>
      <view className='workout'>
        {summary === null ? (
          !isStarted ? (
            <>
              <view className='hero hero--tight'>
                <text className='eyebrow'>Workout</text>
                <text className='title'>Runner</text>
                <text className='subtitle'>
                  Tap start when you are ready. The timer begins with the warmup walk.
                </text>
              </view>

              <view className='card timer-card'>
                <view className='timer-card__header'>
                  <text className='label'>Ready</text>
                  <text className='timer-card__tag'>Not started</text>
                </view>

                <text className='timer'>{levelLabel(sessionProfile.level)}</text>

                <view className='timer-card__meta'>
                  <text className='copy'>
                    Warmup walk starts first, then the 20-minute interval block.
                  </text>
                  <text className='copy'>
                    Haptics and countdown start after you tap Start Workout.
                  </text>
                </view>
              </view>

              <view className='card'>
                <text className='label'>Session flow</text>
                <view className='stack'>
                  <text className='copy'>Warmup walk: 5 minutes</text>
                  <text className='copy'>Interval block: 20 minutes</text>
                  <text className='copy'>Cooldown walk: 5 minutes</text>
                </view>
              </view>

              <view className='primary' bindtap={handleStart}>
                <text className='primary__text'>Start Workout</text>
              </view>
            </>
          ) : (
            <>
              <view className='hero hero--tight'>
                <text className='eyebrow'>Workout</text>
                <text className='title'>Runner</text>
                <text className='subtitle'>
                  Stay with the interval. Haptics pulse in the last 5 seconds.
                </text>
              </view>

              <view className='card timer-card'>
                <view className='timer-card__header'>
                  <text className='label'>{currentInterval?.type.toUpperCase() ?? 'COMPLETE'}</text>
                  <text
                    className={
                      isPaused ? 'timer-card__tag timer-card__tag--paused' : 'timer-card__tag'
                    }
                  >
                    {isPaused ? 'Paused' : 'Live'}
                  </text>
                </view>

                <text className='timer'>{formatDuration(remainingSeconds)}</text>

                <view className='timer-card__meta'>
                  <text className='copy'>
                    Elapsed {formatDuration(elapsedSeconds)} / {formatDuration(totalSeconds)}
                  </text>
                  <text className='copy'>{nextUpLabel}</text>
                </view>
              </view>

              <view className='card'>
                <text className='label'>Session flow</text>
                <view className='stack'>
                  <text className='copy'>Warmup walk: 5 minutes</text>
                  <text className='copy'>Interval block: 20 minutes</text>
                  <text className='copy'>Cooldown walk: 5 minutes</text>
                </view>
              </view>

              <view className='stack'>
                <view className='primary' bindtap={handlePauseToggle}>
                  <text className='primary__text'>{isPaused ? 'Resume' : 'Pause'}</text>
                </view>
                <view className='secondary' bindtap={completeWorkout}>
                  <text className='secondary__text'>Debug: complete workout</text>
                </view>
                <view className='secondary' bindtap={handleStop}>
                  <text className='secondary__text'>Stop</text>
                </view>
              </view>
            </>
          )
        ) : (
          <>
            <view className='hero hero--tight'>
              <text className='eyebrow'>Workout complete</text>
              <text className='title'>Nice work</text>
              <text className='subtitle'>Session saved. Close to return home.</text>
            </view>

            <view className='card'>
              <text className='label'>Summary</text>
              <view className='stack'>
                <text className='copy'>
                  Total distance: {formatDistance(summary.session.totalDistanceMiles)}
                </text>
                <text className='copy'>
                  {summary.session.intervals.length === 0
                    ? 'GPS unavailable yet. No interval breakdown recorded.'
                    : 'Interval breakdown recorded below.'}
                </text>
                <text className='copy'>{workoutLevelMessage}</text>
              </view>
            </view>

            {summary.session.intervals.length > 0 ? (
              <view className='card'>
                <text className='label'>Per-interval breakdown</text>
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
              </view>
            ) : null}

            <view className='primary' bindtap={handleDone}>
              <text className='primary__text'>Done</text>
            </view>
          </>
        )}
      </view>
    </scroll-view>
  )
}
