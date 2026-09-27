import { useCallback, useEffect, useRef, useState, type ReactElement } from '@lynx-js/react'

import './WorkoutTimeline.css'

export interface TimelineInterval {
  type: 'cooldown' | 'run' | 'walk' | 'warmup'
  durationSeconds: number
}

export interface TimelineTimerState {
  isComplete: boolean
  isPaused: boolean
  phaseDurationSeconds: number
  phaseIndex: number
  phaseRemainingSeconds: number
  phaseType: 'cooldown' | 'run' | 'walk' | 'warmup'
}

interface WorkoutTimelineProps {
  intervals: TimelineInterval[]
  timerState: TimelineTimerState | null
}

type PhaseStatus = 'active' | 'done' | 'upcoming'

type CountdownTone = 'muted' | 'run' | 'walk'

interface DonutPhase {
  status: PhaseStatus
  arcFraction: number
  arcColor: string
  checkColor: string
  centerText: string | null
  centerTextTone: CountdownTone
  subtext: string | null
  radius: number
  size: number
  strokeWidth: number
}

const WARMUP_INDEX = 0
const RUN_COLOR = '#2dd35f'
const WALK_COLOR = '#f59e0b'
const TRACK_COLOR = '#1b231c'
const RUN_MUTED_COLOR = 'rgba(45, 211, 95, 0.35)'
const WALK_MUTED_COLOR = 'rgba(245, 158, 11, 0.35)'
const SMALL_DONUT_SIZE = 100
const SMALL_DONUT_RADIUS = 44
const SMALL_DONUT_STROKE = 10
const BLOCK_DONUT_SIZE = 240
const BLOCK_DONUT_RADIUS = 104
const BLOCK_DONUT_STROKE = 20
const ANIMATION_FRAME_MS = 33
const ANIMATION_DURATION_MS = 600

const formatDuration = (seconds: number): string => {
  const roundedSeconds = Math.max(Math.round(seconds), 0)
  const minutes = Math.floor(roundedSeconds / 60)
  const remainder = roundedSeconds % 60

  return minutes === 0 ? `${remainder}s` : `${minutes}m ${remainder}s`
}

const buildLastBlockIndex = (intervals: TimelineInterval[]): number =>
  Math.max(intervals.length - 2, 0)

const buildRunIntervalsRemaining = (intervals: TimelineInterval[], currentIndex: number): number =>
  intervals.slice(currentIndex + 1).filter((interval) => interval.type === 'run').length

const buildRemainingLabel = (remainingIntervals: number): string =>
  remainingIntervals === 1
    ? '1 run/walk interval left'
    : `${remainingIntervals} run/walk intervals left`

const buildArcFraction = (
  status: PhaseStatus,
  remainingSeconds: number,
  durationSeconds: number
): number => {
  if (status === 'done') return 1
  if (status === 'upcoming') return 0
  if (durationSeconds <= 0) return 0

  return Math.max(0, Math.min(1, 1 - remainingSeconds / durationSeconds))
}

const resolveArcColor = (tone: 'run' | 'walk', fullColor: boolean): string => {
  if (tone === 'run') return fullColor ? RUN_COLOR : RUN_MUTED_COLOR

  return fullColor ? WALK_COLOR : WALK_MUTED_COLOR
}

const buildWarmupPhase = (
  currentIndex: number,
  isDimmed: boolean,
  timerState: TimelineTimerState | null,
  intervals: TimelineInterval[]
): DonutPhase => {
  const status: PhaseStatus = currentIndex > WARMUP_INDEX ? 'done' : 'active'
  const durationSeconds = intervals[WARMUP_INDEX]?.durationSeconds ?? 300
  const remainingSeconds =
    currentIndex === WARMUP_INDEX ? (timerState?.phaseRemainingSeconds ?? durationSeconds) : 0
  const done = status === 'done'

  return {
    status,
    arcFraction: buildArcFraction(status, remainingSeconds, durationSeconds),
    arcColor: done || isDimmed ? WALK_MUTED_COLOR : WALK_COLOR,
    checkColor: WALK_COLOR,
    centerText: done ? null : formatDuration(remainingSeconds),
    centerTextTone: done || isDimmed ? 'muted' : 'walk',
    subtext: null,
    radius: SMALL_DONUT_RADIUS,
    size: SMALL_DONUT_SIZE,
    strokeWidth: SMALL_DONUT_STROKE,
  }
}

const buildBlockPhase = (
  currentIndex: number,
  isDimmed: boolean,
  timerState: TimelineTimerState | null,
  intervals: TimelineInterval[],
  lastBlockIndex: number
): DonutPhase => {
  const status: PhaseStatus =
    currentIndex < 1 ? 'upcoming' : currentIndex > lastBlockIndex ? 'done' : 'active'
  const blockActive = status === 'active'
  const previewType = intervals[1]?.type === 'walk' ? 'walk' : 'run'
  const phaseType = blockActive ? (timerState?.phaseType ?? previewType) : previewType
  const currentDuration = blockActive
    ? (timerState?.phaseDurationSeconds ?? 30)
    : (intervals[1]?.durationSeconds ?? 30)
  const remainingSeconds = blockActive
    ? (timerState?.phaseRemainingSeconds ?? currentDuration)
    : currentDuration
  const done = status === 'done'
  const tone: 'run' | 'walk' = phaseType === 'run' ? 'run' : 'walk'

  return {
    status,
    arcFraction: buildArcFraction(status, remainingSeconds, currentDuration),
    arcColor: done ? RUN_MUTED_COLOR : resolveArcColor(tone, blockActive && !isDimmed),
    checkColor: RUN_COLOR,
    centerText: done
      ? null
      : `${tone === 'run' ? 'Run' : 'Walk'} ${formatDuration(remainingSeconds)}`,
    centerTextTone: done || !blockActive || isDimmed ? 'muted' : tone,
    subtext: done ? null : buildRemainingLabel(buildRunIntervalsRemaining(intervals, currentIndex)),
    radius: BLOCK_DONUT_RADIUS,
    size: BLOCK_DONUT_SIZE,
    strokeWidth: BLOCK_DONUT_STROKE,
  }
}

const buildCooldownPhase = (
  currentIndex: number,
  isDimmed: boolean,
  timerState: TimelineTimerState | null,
  intervals: TimelineInterval[]
): DonutPhase => {
  const cooldownIndex = intervals.length - 1
  const status: PhaseStatus =
    timerState?.isComplete === true ? 'done' : currentIndex < cooldownIndex ? 'upcoming' : 'active'
  const durationSeconds = intervals[cooldownIndex]?.durationSeconds ?? 300
  const remainingSeconds =
    currentIndex === cooldownIndex
      ? (timerState?.phaseRemainingSeconds ?? durationSeconds)
      : durationSeconds
  const done = status === 'done'

  return {
    status,
    arcFraction: buildArcFraction(status, remainingSeconds, durationSeconds),
    arcColor: done || isDimmed || status === 'upcoming' ? WALK_MUTED_COLOR : WALK_COLOR,
    checkColor: WALK_COLOR,
    centerText: done ? null : formatDuration(remainingSeconds),
    centerTextTone: done || isDimmed || status === 'upcoming' ? 'muted' : 'walk',
    subtext: null,
    radius: SMALL_DONUT_RADIUS,
    size: SMALL_DONUT_SIZE,
    strokeWidth: SMALL_DONUT_STROKE,
  }
}

const buildDonutSvgContent = (
  size: number,
  radius: number,
  strokeWidth: number,
  arcFraction: number,
  arcColor: string
): string => {
  const center = size / 2
  const circumference = 2 * Math.PI * radius
  const safeFraction = Math.max(0, Math.min(arcFraction, 1))
  const dashLength = (circumference * safeFraction).toFixed(2)

  const progressCircle =
    safeFraction <= 0
      ? ''
      : `<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${arcColor}" ` +
        `stroke-width="${strokeWidth}" stroke-linecap="round" ` +
        `stroke-dasharray="${dashLength} ${circumference.toFixed(2)}" ` +
        `transform="rotate(-90 ${center} ${center})"/>`

  return (
    `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">` +
    `<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${TRACK_COLOR}" ` +
    `stroke-width="${strokeWidth}"/>` +
    progressCircle +
    `</svg>`
  )
}

const buildCheckSvgContent = (size: number, color: string): string => {
  const s = size
  const path = [
    `M ${(s * 0.22).toFixed(1)} ${(s * 0.5).toFixed(1)}`,
    `L ${(s * 0.38).toFixed(1)} ${(s * 0.66).toFixed(1)}`,
    `L ${(s * 0.38).toFixed(1)} ${(s * 0.76).toFixed(1)}`,
    `L ${(s * 0.78).toFixed(1)} ${(s * 0.26).toFixed(1)}`,
    `L ${(s * 0.68).toFixed(1)} ${(s * 0.22).toFixed(1)}`,
    `L ${(s * 0.38).toFixed(1)} ${(s * 0.58).toFixed(1)}`,
    `L ${(s * 0.22).toFixed(1)} ${(s * 0.42).toFixed(1)}`,
    'Z',
  ].join(' ')

  return (
    `<svg viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg">` +
    `<path d="${path}" fill="${color}"/>` +
    `</svg>`
  )
}

const easeInOutQuad = (progress: number): number =>
  progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress

interface AnimatedDonutProps {
  size: number
  radius: number
  strokeWidth: number
  arcColor: string
  targetFraction: number
  animate: boolean
}

const AnimatedDonut = ({
  size,
  radius,
  strokeWidth,
  arcColor,
  targetFraction,
  animate,
}: AnimatedDonutProps): ReactElement => {
  const [displayedFraction, setDisplayedFraction] = useState(targetFraction)
  const displayedFractionRef = useRef(targetFraction)
  const targetFractionRef = useRef(targetFraction)
  const animationStartedAtRef = useRef(0)
  const animationFromRef = useRef(targetFraction)
  const animationFrameRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopAnimation = useCallback((): void => {
    if (animationFrameRef.current !== null) {
      clearInterval(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  const applyFraction = useCallback((fraction: number): void => {
    displayedFractionRef.current = fraction
    setDisplayedFraction(fraction)
  }, [])

  useEffect(() => {
    return () => stopAnimation()
  }, [stopAnimation])

  useEffect(() => {
    targetFractionRef.current = targetFraction

    if (!animate || Math.abs(targetFraction - displayedFractionRef.current) < 0.001) {
      stopAnimation()
      applyFraction(targetFraction)
      return
    }

    animationFromRef.current = displayedFractionRef.current
    animationStartedAtRef.current = Date.now()
    stopAnimation()

    animationFrameRef.current = setInterval(() => {
      const elapsed = Date.now() - animationStartedAtRef.current
      const progress = Math.min(elapsed / ANIMATION_DURATION_MS, 1)
      const delta = targetFractionRef.current - animationFromRef.current
      const nextFraction = easeInOutQuad(progress) * delta + animationFromRef.current

      applyFraction(nextFraction)

      if (progress >= 1) {
        stopAnimation()
        applyFraction(targetFractionRef.current)
      }
    }, ANIMATION_FRAME_MS)
  }, [animate, applyFraction, stopAnimation, targetFraction])

  return (
    <svg
      content={buildDonutSvgContent(size, radius, strokeWidth, displayedFraction, arcColor)}
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  )
}

const PhaseDonut = ({ phase, animate }: { phase: DonutPhase; animate: boolean }): ReactElement => {
  const sizeClass =
    phase.size === BLOCK_DONUT_SIZE ? 'timeline__donut--block' : 'timeline__donut--small'
  const toneClass =
    phase.centerTextTone === 'run'
      ? 'timeline__countdown--run'
      : phase.centerTextTone === 'walk'
        ? 'timeline__countdown--walk'
        : 'timeline__countdown--muted'

  return (
    <view className={`timeline__donut ${sizeClass}`}>
      {phase.status === 'done' ? (
        <svg
          content={buildCheckSvgContent(phase.size, phase.checkColor)}
          style={{ width: `${phase.size}px`, height: `${phase.size}px` }}
        />
      ) : (
        <AnimatedDonut
          size={phase.size}
          radius={phase.radius}
          strokeWidth={phase.strokeWidth}
          arcColor={phase.arcColor}
          targetFraction={phase.arcFraction}
          animate={animate}
        />
      )}
      {phase.centerText !== null ? (
        <view className='timeline__center'>
          <text className={`timeline__countdown ${toneClass}`}>{phase.centerText}</text>
          {phase.subtext !== null ? (
            <text className='timeline__subtext'>{phase.subtext}</text>
          ) : null}
        </view>
      ) : null}
    </view>
  )
}

export const WorkoutTimeline = ({ intervals, timerState }: WorkoutTimelineProps): ReactElement => {
  const currentIndex = timerState?.phaseIndex ?? 0
  const isDimmed = timerState === null || timerState.isPaused
  const lastBlockIndex = buildLastBlockIndex(intervals)
  const warmupPhase = buildWarmupPhase(currentIndex, isDimmed, timerState, intervals)
  const blockPhase = buildBlockPhase(currentIndex, isDimmed, timerState, intervals, lastBlockIndex)
  const cooldownPhase = buildCooldownPhase(currentIndex, isDimmed, timerState, intervals)
  const warmupDone = warmupPhase.status === 'done'
  const blockDone = blockPhase.status === 'done'

  const warmupAnimated = !isDimmed && warmupPhase.status === 'active'
  const blockAnimated = !isDimmed && blockPhase.status === 'active'
  const cooldownAnimated = !isDimmed && cooldownPhase.status === 'active'

  return (
    <view className='timeline'>
      <PhaseDonut phase={warmupPhase} animate={warmupAnimated} />
      <view
        className={
          warmupDone ? 'timeline__connector timeline__connector--done' : 'timeline__connector'
        }
      />
      <PhaseDonut phase={blockPhase} animate={blockAnimated} />
      <view
        className={
          blockDone ? 'timeline__connector timeline__connector--done' : 'timeline__connector'
        }
      />
      <PhaseDonut phase={cooldownPhase} animate={cooldownAnimated} />
    </view>
  )
}
