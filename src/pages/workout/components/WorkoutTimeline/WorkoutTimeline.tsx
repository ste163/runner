import { useCallback, useEffect, useRef, useState, type ReactElement } from '@lynx-js/react'

import './WorkoutTimeline.css'
import { formatClockDuration } from '../../../../format.js'
import { themeColors } from '../../../../theme.js'

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
  centerText: string | null
  centerTextTone: CountdownTone
  centerLabel: string | null
  centerLabelTone: CountdownTone
  radius: number
  size: number
  strokeWidth: number
}

interface IntervalSegment {
  key: string
  label: string
  status: PhaseStatus
  tone: 'run' | 'walk'
}

interface IntervalLine {
  key: string
  setNumber: number
  segments: IntervalSegment[]
}

const WARMUP_INDEX = 0
const SMALL_DONUT_SIZE = 88
const SMALL_DONUT_RADIUS = 36
const SMALL_DONUT_STROKE = 10
const BLOCK_DONUT_SIZE = 276
const BLOCK_DONUT_RADIUS = 127
const BLOCK_DONUT_STROKE = 22
const ANIMATION_FRAME_MS = 8
const ANIMATION_DURATION_MS = 1000

const buildLastBlockIndex = (intervals: TimelineInterval[]): number =>
  Math.max(intervals.length - 2, 0)

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
  if (tone === 'run') return fullColor ? themeColors.run : themeColors.runMuted

  return fullColor ? themeColors.walk : themeColors.walkMuted
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
    arcColor: done || isDimmed ? themeColors.walkMuted : themeColors.walk,
    centerText: done ? 'Done' : formatClockDuration(remainingSeconds),
    centerTextTone: done || isDimmed ? 'muted' : 'walk',
    centerLabel: null,
    centerLabelTone: 'muted',
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
    arcColor: done ? themeColors.runMuted : resolveArcColor(tone, blockActive && !isDimmed),
    centerText: done ? 'Done' : formatClockDuration(remainingSeconds),
    centerTextTone: done || !blockActive || isDimmed ? 'muted' : tone,
    centerLabel: done ? null : tone === 'run' ? 'Run' : 'Walk',
    centerLabelTone: done || !blockActive || isDimmed ? 'muted' : tone,
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
    arcColor: done || isDimmed || status === 'upcoming' ? themeColors.walkMuted : themeColors.walk,
    centerText: done ? 'Done' : formatClockDuration(remainingSeconds),
    centerTextTone: done || isDimmed || status === 'upcoming' ? 'muted' : 'walk',
    centerLabel: null,
    centerLabelTone: 'muted',
    radius: SMALL_DONUT_RADIUS,
    size: SMALL_DONUT_SIZE,
    strokeWidth: SMALL_DONUT_STROKE,
  }
}

const buildIntervalSegments = (
  intervals: TimelineInterval[],
  currentIndex: number
): IntervalSegment[] =>
  intervals.slice(1, -1).map((interval, index) => {
    const rowIndex = index + 1

    return {
      key: `${interval.type}-${rowIndex}`,
      label: `${interval.type === 'run' ? 'Run' : 'Walk'} ${formatClockDuration(interval.durationSeconds)}`,
      status: currentIndex > rowIndex ? 'done' : currentIndex === rowIndex ? 'active' : 'upcoming',
      tone: interval.type === 'run' ? 'run' : 'walk',
    }
  })

const chunkByTwo = (segments: IntervalSegment[]): IntervalSegment[][] =>
  segments.length <= 2 ? [segments] : [segments.slice(0, 2), ...chunkByTwo(segments.slice(2))]

const buildIntervalLines = (segments: IntervalSegment[]): IntervalLine[] =>
  segments.length === 0
    ? []
    : chunkByTwo(segments).map((pair, index) => ({
        key: `line-${index}`,
        setNumber: index + 1,
        segments: pair,
      }))

const buildIntervalSegmentClassName = (segment: IntervalSegment): string =>
  `timeline__segment timeline__segment--${segment.status}--${segment.tone}`

const buildInfoLabelClassName = (status: PhaseStatus, dimmed: boolean): string => {
  if (status === 'done') return 'timeline__infoLabel timeline__infoLabel--done'
  if (status === 'active' && !dimmed) return 'timeline__infoLabel timeline__infoLabel--active'

  return 'timeline__infoLabel'
}

const isLineComplete = (line: IntervalLine): boolean =>
  line.segments.every((segment) => segment.status === 'done')

const buildSetNumberClassName = (line: IntervalLine): string =>
  isLineComplete(line) ? 'timeline__setNumber timeline__setNumber--done' : 'timeline__setNumber'

const renderLineSegments = (line: IntervalLine): ReactElement[] => {
  const setNumberText = (
    <text className={buildSetNumberClassName(line)} key={`${line.key}-setNumber`}>
      {`${line.setNumber}. `}
    </text>
  )

  return [
    setNumberText,
    ...line.segments.flatMap((segment, index) => {
      const segmentText = (
        <text className={buildIntervalSegmentClassName(segment)} key={segment.key}>
          {segment.label}
        </text>
      )

      if (index === 0) return [segmentText]

      return [
        <text
          className={
            isLineComplete(line) ? 'timeline__slash timeline__slash--done' : 'timeline__slash'
          }
          key={`${segment.key}-slash`}
        >
          {' / '}
        </text>,
        segmentText,
      ]
    }),
  ]
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
    `<svg viewBox="0 0 ${size} ${size}" preserveAspectRatio="xMidYMid meet" ` +
    `xmlns="http://www.w3.org/2000/svg">` +
    `<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${themeColors.track}" ` +
    `stroke-width="${strokeWidth}"/>` +
    progressCircle +
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

  const svgStyle =
    size === BLOCK_DONUT_SIZE
      ? { width: '100%', height: '100%' }
      : { width: `${size}px`, height: `${size}px` }

  return (
    <svg
      content={buildDonutSvgContent(size, radius, strokeWidth, displayedFraction, arcColor)}
      style={svgStyle}
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
  const labelToneClass =
    phase.centerLabelTone === 'run'
      ? 'timeline__phaseLabel--run'
      : phase.centerLabelTone === 'walk'
        ? 'timeline__phaseLabel--walk'
        : 'timeline__phaseLabel--muted'

  return (
    <view className={`timeline__donut ${sizeClass}`}>
      <AnimatedDonut
        size={phase.size}
        radius={phase.radius}
        strokeWidth={phase.strokeWidth}
        arcColor={phase.arcColor}
        targetFraction={phase.arcFraction}
        animate={animate}
      />
      {phase.centerText !== null ? (
        <view className='timeline__center'>
          <text className={`timeline__countdown ${toneClass}`}>{phase.centerText}</text>
          {phase.centerLabel !== null ? (
            <text className={`timeline__phaseLabel ${labelToneClass}`}>{phase.centerLabel}</text>
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
  const intervalLines = buildIntervalLines(buildIntervalSegments(intervals, currentIndex))
  const warmupDone = warmupPhase.status === 'done'
  const blockDone = blockPhase.status === 'done'

  const warmupAnimated = !isDimmed && warmupPhase.status === 'active'
  const blockAnimated = !isDimmed && blockPhase.status === 'active'
  const cooldownAnimated = !isDimmed && cooldownPhase.status === 'active'

  return (
    <view className='timeline'>
      <view className='timeline__donuts'>
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
      <view className='timeline__info'>
        <view className='timeline__infoZone timeline__infoZone--small'>
          <text className={buildInfoLabelClassName(warmupPhase.status, isDimmed)}>
            Warm-up walk
          </text>
        </view>
        <view className='timeline__infoZone timeline__infoZone--block'>
          <view className='timeline__list'>
            {intervalLines.map((line) => (
              <text className='timeline__listLine' key={line.key}>
                {renderLineSegments(line)}
              </text>
            ))}
          </view>
        </view>
        <view className='timeline__infoZone timeline__infoZone--small'>
          <text className={buildInfoLabelClassName(cooldownPhase.status, isDimmed)}>
            Cool-down walk
          </text>
        </view>
      </view>
    </view>
  )
}
