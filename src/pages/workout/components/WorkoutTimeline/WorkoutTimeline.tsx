import { useCallback, useEffect, useRef, useState, type ReactElement } from '@lynx-js/react'
import type { NodesRef, ScrollEvent } from '@lynx-js/types'

import './WorkoutTimeline.css'
import { DonutGraph } from '../../../../components/DonutGraph/index.js'
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
  lineColor: string | null
  lineSide: 'left' | 'right' | null
}

interface IntervalSegment {
  key: string
  label: string
  status: PhaseStatus
  tone: 'run' | 'walk'
}

interface IntervalLine {
  key: string
  segments: IntervalSegment[]
}

const WARMUP_INDEX = 0
const SMALL_DONUT_SIZE = 88
const SMALL_DONUT_RADIUS = 36
const SMALL_DONUT_STROKE = 10
const BLOCK_DONUT_SIZE = 276
const BLOCK_DONUT_RADIUS = 127
const BLOCK_DONUT_STROKE = 22
// Bridges the ring outline to the donut box edge; keep in sync with
// .timeline__donutLine in WorkoutTimeline.css.
const DONUT_LINE_BRIDGE_WIDTH_PX =
  SMALL_DONUT_SIZE / 2 - (SMALL_DONUT_RADIUS + SMALL_DONUT_STROKE / 2)
const DIAL_VISIBLE_ROWS = 3
const DIAL_ROW_HEIGHT_PX = 28 // 1.75rem row; keep in sync with .timeline__row in WorkoutTimeline.css
const DIAL_CENTER_OFFSET_PX = DIAL_ROW_HEIGHT_PX // parks the target row in the middle slot
// Lynx scrollTo computes target = child(index).position + offset, so the
// centering offset must be negative to land on the detent.
const DIAL_SCROLL_TO_OFFSET_PX = -DIAL_CENTER_OFFSET_PX
const DIAL_SPACER_ROW_COUNT = 1
const DIAL_VIEWPORT_HEIGHT_PX = DIAL_ROW_HEIGHT_PX * DIAL_VISIBLE_ROWS
const DIAL_SNAP_EPSILON_PX = 1
const DIAL_SNAP_SETTLE_MS = 120
const DIAL_ROW_SCALE_FALLOFF = 0.008 // scale drops ~0.25 per row of distance from center
const DIAL_MIN_ROW_SCALE = 0.5

const buildLastBlockIndex = (intervals: TimelineInterval[]): number =>
  Math.max(intervals.length - 2, 0)

const buildActiveLineIndex = (currentIndex: number, lineCount: number): number => {
  if (currentIndex <= 0) return 0

  return Math.min(Math.floor((currentIndex - 1) / 2), lineCount - 1)
}

const buildSetNumber = (phaseIndex: number, totalSets: number): number => {
  if (phaseIndex <= 0) return 0

  return Math.min(Math.ceil(phaseIndex / 2), totalSets)
}

const buildSetHeaderLabel = (setNumber: number, totalSets: number): string =>
  `Set ${setNumber}/${totalSets}`

const buildCompletedRunCount = (phaseIndex: number, totalRuns: number): number =>
  Math.max(0, Math.min(Math.floor(phaseIndex / 2), totalRuns))

const buildCompletedWalkCount = (phaseIndex: number, totalWalks: number): number =>
  Math.max(0, Math.min(Math.floor((phaseIndex - 1) / 2), totalWalks))

const buildIntervalCountLabel = (
  label: 'Runs' | 'Walks',
  completed: number,
  total: number
): string => `${label} ${completed}/${total}`

const clampLineIndex = (lineIndex: number, lineCount: number): number =>
  Math.max(0, Math.min(lineIndex, lineCount - 1))

const buildCenteredLineIndex = (scrollY: number, lineCount: number): number =>
  clampLineIndex(Math.round(scrollY / DIAL_ROW_HEIGHT_PX), lineCount)

const buildDetentScrollY = (lineIndex: number): number => lineIndex * DIAL_ROW_HEIGHT_PX

const buildRowScale = (lineIndex: number, scrollY: number): number => {
  const rowCenter =
    (lineIndex + DIAL_SPACER_ROW_COUNT) * DIAL_ROW_HEIGHT_PX + DIAL_ROW_HEIGHT_PX / 2
  const distance = Math.abs(rowCenter - scrollY - DIAL_VIEWPORT_HEIGHT_PX / 2)

  return Math.max(1 - distance * DIAL_ROW_SCALE_FALLOFF, DIAL_MIN_ROW_SCALE)
}

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
    lineColor: done ? themeColors.walkMuted : themeColors.connector,
    lineSide: 'right',
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
    lineColor: null,
    lineSide: null,
  }
}

const buildCooldownPhase = (
  currentIndex: number,
  isDimmed: boolean,
  timerState: TimelineTimerState | null,
  intervals: TimelineInterval[],
  blockDone: boolean
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
    lineColor: blockDone ? themeColors.walkMuted : themeColors.connector,
    lineSide: 'left',
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

const renderLineSegments = (line: IntervalLine): ReactElement[] =>
  line.segments.flatMap((segment, index) => {
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
  })

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
      <DonutGraph
        size={phase.size}
        radius={phase.radius}
        strokeWidth={phase.strokeWidth}
        fraction={phase.arcFraction}
        trackColor={themeColors.track}
        arcColor={phase.arcColor}
        animated={animate}
        fillContainer={phase.size === BLOCK_DONUT_SIZE}
      >
        {phase.centerText !== null ? (
          <view className='timeline__center'>
            <text className={`timeline__countdown ${toneClass}`}>{phase.centerText}</text>
            {phase.centerLabel !== null ? (
              <text className={`timeline__phaseLabel ${labelToneClass}`}>{phase.centerLabel}</text>
            ) : null}
          </view>
        ) : null}
      </DonutGraph>
      {phase.lineColor !== null && phase.lineSide !== null ? (
        <view
          className={`timeline__donutLine timeline__donutLine--${phase.lineSide}`}
          style={{
            width: `${DONUT_LINE_BRIDGE_WIDTH_PX}px`,
            backgroundColor: phase.lineColor,
          }}
        />
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
  const blockDone = blockPhase.status === 'done'
  const cooldownPhase = buildCooldownPhase(currentIndex, isDimmed, timerState, intervals, blockDone)
  const intervalLines = buildIntervalLines(buildIntervalSegments(intervals, currentIndex))
  const totalSets = intervalLines.length
  const setNumber = buildSetNumber(timerState?.phaseIndex ?? 0, totalSets)
  const setHeaderLabel = buildSetHeaderLabel(setNumber, totalSets)
  const totalRuns = intervals.filter((interval) => interval.type === 'run').length
  const totalWalks = intervals.filter((interval) => interval.type === 'walk').length
  const completedRuns = buildCompletedRunCount(timerState?.phaseIndex ?? 0, totalRuns)
  const completedWalks = buildCompletedWalkCount(timerState?.phaseIndex ?? 0, totalWalks)
  const runCountLabel = buildIntervalCountLabel('Runs', completedRuns, totalRuns)
  const walkCountLabel = buildIntervalCountLabel('Walks', completedWalks, totalWalks)
  const warmupDone = warmupPhase.status === 'done'
  const dialRef = useRef<NodesRef | null>(null)
  const dialLineIndex = buildActiveLineIndex(currentIndex, intervalLines.length)
  const [dialScrollY, setDialScrollY] = useState(() => buildDetentScrollY(dialLineIndex))
  const dialScrollYRef = useRef(dialScrollY)
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTouchingRef = useRef(false)

  const cancelPendingSnap = useCallback((): void => {
    if (snapTimerRef.current !== null) {
      clearTimeout(snapTimerRef.current)
      snapTimerRef.current = null
    }
  }, [])

  const handleDialScroll = useCallback(
    (event: ScrollEvent): void => {
      cancelPendingSnap()
      dialScrollYRef.current = event.detail.scrollTop
      setDialScrollY(event.detail.scrollTop)
    },
    [cancelPendingSnap]
  )

  const handleDialTouchStart = useCallback((): void => {
    isTouchingRef.current = true
    cancelPendingSnap()
  }, [cancelPendingSnap])

  const handleDialTouchEnd = useCallback((): void => {
    isTouchingRef.current = false
  }, [])

  const snapToCenteredRow = useCallback((): void => {
    if (intervalLines.length === 0) return
    if (isTouchingRef.current) return

    const scrollY = dialScrollYRef.current
    const centeredLineIndex = buildCenteredLineIndex(scrollY, intervalLines.length)
    const targetScrollY = buildDetentScrollY(centeredLineIndex)

    if (Math.abs(scrollY - targetScrollY) <= DIAL_SNAP_EPSILON_PX) return

    dialRef.current
      ?.invoke({
        method: 'scrollTo',
        params: {
          index: centeredLineIndex + DIAL_SPACER_ROW_COUNT,
          offset: DIAL_SCROLL_TO_OFFSET_PX,
          smooth: true,
        },
      })
      .exec()
  }, [intervalLines.length])

  const handleDialScrollEnd = useCallback((): void => {
    cancelPendingSnap()
    snapTimerRef.current = setTimeout(snapToCenteredRow, DIAL_SNAP_SETTLE_MS)
  }, [cancelPendingSnap, snapToCenteredRow])

  useEffect(() => {
    return () => cancelPendingSnap()
  }, [cancelPendingSnap])

  useEffect(() => {
    dialRef.current
      ?.invoke({
        method: 'scrollTo',
        params: {
          index: dialLineIndex + DIAL_SPACER_ROW_COUNT,
          offset: DIAL_SCROLL_TO_OFFSET_PX,
          smooth: true,
        },
      })
      .exec()
  }, [dialLineIndex])

  const warmupAnimated = !isDimmed && warmupPhase.status === 'active'
  const blockAnimated = !isDimmed && blockPhase.status === 'active'
  const cooldownAnimated = !isDimmed && cooldownPhase.status === 'active'

  return (
    <view className='timeline'>
      <view className='timeline__donuts'>
        <view className='timeline__donutColumn'>
          <PhaseDonut phase={warmupPhase} animate={warmupAnimated} />
          <text
            className={`${buildInfoLabelClassName(warmupPhase.status, isDimmed)} timeline__caption`}
          >
            Warm-up walk
          </text>
        </view>
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
        <view className='timeline__donutColumn'>
          <PhaseDonut phase={cooldownPhase} animate={cooldownAnimated} />
          <text
            className={`${buildInfoLabelClassName(cooldownPhase.status, isDimmed)} timeline__caption`}
          >
            Cool-down walk
          </text>
        </view>
      </view>
      <text className='timeline__setHeader'>{setHeaderLabel}</text>
      <view className='timeline__intervalCounts'>
        <text className='timeline__intervalCount'>{runCountLabel}</text>
        {totalWalks > 0 ? <text className='timeline__intervalCount'>{walkCountLabel}</text> : null}
      </view>
      <view className='timeline__info'>
        <scroll-view
          ref={dialRef}
          className='timeline__dial'
          scroll-orientation='vertical'
          scroll-bar-enable={false}
          bindscroll={handleDialScroll}
          bindscrollend={handleDialScrollEnd}
          bindtouchstart={handleDialTouchStart}
          bindtouchend={handleDialTouchEnd}
        >
          <view className='timeline__row' flatten={false} />
          {intervalLines.map((line, lineIndex) => {
            const rowScale = buildRowScale(lineIndex, dialScrollY)

            return (
              <view
                className='timeline__row'
                flatten={false}
                key={line.key}
                style={{ transform: `scale(${rowScale.toFixed(3)})`, opacity: rowScale }}
              >
                <text className='timeline__listLine'>{renderLineSegments(line)}</text>
              </view>
            )
          })}
          <view className='timeline__row' flatten={false} />
        </scroll-view>
      </view>
    </view>
  )
}
