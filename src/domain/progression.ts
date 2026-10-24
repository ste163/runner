import type { Session, TrainingLevel, TrainingProfile } from '@/domain/types.js'
import {
  addCalendarDays,
  countDaysBetween,
  isBeforeLocalDay,
  startOfLocalDay,
} from '@/domain/calendar.js'

const minRunSeconds = 15
const runMultiplierUp = 1.1
const runMultiplierDown = 0.9
const ladderBaseRunSeconds = 30
const windowDayCount = 7
const breakGapDayCount = 4

interface ProgressionPhase {
  maxRunSeconds: number
  walkSeconds: number
}

const LAST_PHASE: ProgressionPhase = { maxRunSeconds: 1200, walkSeconds: 30 }

const PHASES: ReadonlyArray<ProgressionPhase> = [
  { maxRunSeconds: 30, walkSeconds: 120 },
  { maxRunSeconds: 60, walkSeconds: 90 },
  { maxRunSeconds: 120, walkSeconds: 75 },
  { maxRunSeconds: 240, walkSeconds: 60 },
  { maxRunSeconds: 480, walkSeconds: 45 },
  { maxRunSeconds: 720, walkSeconds: 30 },
  { maxRunSeconds: 960, walkSeconds: 30 },
  LAST_PHASE,
]

type LevelAdjustmentDirection = 'up' | 'down'

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)
const cloneLevel = (level: TrainingLevel): TrainingLevel => ({ ...level })

const findPhaseIndex = (runSeconds: number): number => {
  const index = PHASES.findIndex((phase) => runSeconds < phase.maxRunSeconds)

  return index === -1 ? PHASES.length - 1 : index
}

const ladderDownRungCount = Math.floor(
  Math.log(minRunSeconds / ladderBaseRunSeconds) / Math.log(runMultiplierDown)
)
const ladderUpRungCount = Math.floor(
  Math.log(LAST_PHASE.maxRunSeconds / ladderBaseRunSeconds) / Math.log(runMultiplierUp)
)

const buildLadderDownRungs = (): number[] =>
  Array.from(
    { length: ladderDownRungCount },
    (_, index) => ladderBaseRunSeconds * Math.pow(runMultiplierDown, ladderDownRungCount - index)
  )

const buildLadderUpRungs = (): number[] =>
  Array.from(
    { length: ladderUpRungCount + 1 },
    (_, index) => ladderBaseRunSeconds * Math.pow(runMultiplierUp, index)
  )

// Canonical run ladder: base 30, ×1.1 up (k = 0..38), ×0.9 down (k = 1..6), floor 15.
// Every adjustment snaps to a rung, so up then down always returns to the same level.
export const RUN_LADDER: ReadonlyArray<number> = Object.freeze([
  minRunSeconds,
  ...buildLadderDownRungs(),
  ...buildLadderUpRungs(),
])

const snapToLadder = (runSeconds: number): number =>
  RUN_LADDER.reduce((nearest, rung) =>
    Math.abs(rung - runSeconds) < Math.abs(nearest - runSeconds) ? rung : nearest
  )

const adjustLevel = (level: TrainingLevel, direction: LevelAdjustmentDirection): TrainingLevel => {
  const runMultiplier = direction === 'up' ? runMultiplierUp : runMultiplierDown
  const nextRunSeconds = clamp(
    level.runSeconds * runMultiplier,
    minRunSeconds,
    level.intervalBlockSeconds
  )

  if (nextRunSeconds >= level.intervalBlockSeconds) {
    return {
      ...cloneLevel(level),
      runSeconds: level.intervalBlockSeconds,
      walkSeconds: LAST_PHASE.walkSeconds,
    }
  }

  const snappedRunSeconds = snapToLadder(nextRunSeconds)
  const phase = PHASES[findPhaseIndex(snappedRunSeconds)] ?? LAST_PHASE

  return {
    ...cloneLevel(level),
    runSeconds: snappedRunSeconds,
    walkSeconds: phase.walkSeconds,
  }
}

const countSessionsInWindow = (sessions: Session[], startDay: Date, endDay: Date): number =>
  sessions.reduce((count, session) => {
    const completedDay = startOfLocalDay(new Date(session.completedAt))

    return !isBeforeLocalDay(completedDay, startDay) && isBeforeLocalDay(completedDay, endDay)
      ? count + 1
      : count
  }, 0)

const buildWindowStarts = (startDay: Date, expiredWindowCount: number): Date[] =>
  Array.from({ length: expiredWindowCount }, (_, index) =>
    addCalendarDays(startDay, index * windowDayCount)
  )

const countExpiredWindows = (startDay: Date, nowDay: Date): number => {
  let count = 0
  let cursor = addCalendarDays(startDay, windowDayCount)

  while (!isBeforeLocalDay(nowDay, cursor)) {
    count += 1
    cursor = addCalendarDays(cursor, windowDayCount)
  }

  return count
}

const applyMiss = (
  level: TrainingLevel,
  consecutiveMissed: number
): { level: TrainingLevel; consecutiveMissed: number } => ({
  level: consecutiveMissed + 1 >= 2 ? adjustLevel(level, 'down') : level,
  consecutiveMissed: consecutiveMissed + 1,
})

const findLatestSession = (sessions: Session[]): Session | null =>
  sessions.reduce(
    (latest, session) =>
      latest === null ||
      new Date(session.completedAt).getTime() > new Date(latest.completedAt).getTime()
        ? session
        : latest,
    null as Session | null
  )

export const adjustLevelManually = (
  level: TrainingLevel,
  direction: LevelAdjustmentDirection
): TrainingLevel => adjustLevel(level, direction)

export const completeSession = (
  profile: TrainingProfile,
  session: Session,
  completedAt: Date
): TrainingProfile => {
  const profileWithSession: TrainingProfile = {
    ...profile,
    sessions: [...profile.sessions, session],
  }

  if (profile.window.windowStart === '') {
    return {
      ...profileWithSession,
      window: {
        ...profile.window,
        consecutiveMissed: 0,
        windowStart: startOfLocalDay(completedAt).toISOString(),
      },
    }
  }

  const startDay = startOfLocalDay(new Date(profile.window.windowStart))
  const endDay = addCalendarDays(startDay, windowDayCount)
  const completedDay = startOfLocalDay(completedAt)

  if (!isBeforeLocalDay(completedDay, endDay)) {
    return evaluateWindows(profileWithSession, completedAt)
  }

  if (countSessionsInWindow(profile.sessions, startDay, endDay) >= 3) {
    return {
      ...profileWithSession,
      window: {
        ...profile.window,
        consecutiveMissed: 0,
        windowStart: completedDay.toISOString(),
      },
    }
  }

  const latestSession = findLatestSession(profile.sessions)
  const gapDayCount =
    latestSession === null
      ? 0
      : countDaysBetween(startOfLocalDay(new Date(latestSession.completedAt)), completedDay)

  if (gapDayCount >= breakGapDayCount) {
    const missed = applyMiss(profile.level, profile.window.consecutiveMissed)

    return {
      ...profileWithSession,
      level: missed.level,
      window: {
        ...profile.window,
        windowStart: completedDay.toISOString(),
        consecutiveMissed: missed.consecutiveMissed,
      },
    }
  }

  const sessionCount = countSessionsInWindow(profileWithSession.sessions, startDay, endDay)

  if (sessionCount >= 3) {
    return {
      ...profileWithSession,
      level: adjustLevelManually(profile.level, 'up'),
      window: {
        ...profile.window,
        consecutiveMissed: 0,
      },
    }
  }

  return profileWithSession
}

export const reanchorWindow = (profile: TrainingProfile, now: Date): TrainingProfile => {
  const sessions = [...profile.sessions].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  )
  const latestThree = sessions.slice(-3)
  const firstRun = latestThree[0]
  const lastRun = latestThree[latestThree.length - 1]
  const anchorDay =
    latestThree.length === 3 &&
    firstRun !== undefined &&
    lastRun !== undefined &&
    countDaysBetween(
      startOfLocalDay(new Date(firstRun.completedAt)),
      startOfLocalDay(new Date(lastRun.completedAt))
    ) <= windowDayCount
      ? startOfLocalDay(new Date(firstRun.completedAt))
      : startOfLocalDay(now)

  return {
    ...profile,
    window: {
      ...profile.window,
      windowStart: anchorDay.toISOString(),
      consecutiveMissed: 0,
    },
  }
}

export const evaluateWindows = (profile: TrainingProfile, now: Date): TrainingProfile => {
  if (profile.window.windowStart === '') return profile

  const startDay = startOfLocalDay(new Date(profile.window.windowStart))
  const nowDay = startOfLocalDay(now)
  if (!isBeforeLocalDay(startDay, nowDay)) return profile

  const expiredWindowCount = countExpiredWindows(startDay, nowDay)
  if (expiredWindowCount <= 0) return profile

  const evaluated = buildWindowStarts(startDay, expiredWindowCount).reduce(
    (state, windowStartDay) => {
      const sessionCount = countSessionsInWindow(
        profile.sessions,
        windowStartDay,
        addCalendarDays(windowStartDay, windowDayCount)
      )

      if (sessionCount >= 3) {
        return { level: state.level, consecutiveMissed: 0 }
      }

      return applyMiss(state.level, state.consecutiveMissed)
    },
    { level: cloneLevel(profile.level), consecutiveMissed: profile.window.consecutiveMissed }
  )

  return {
    ...profile,
    level: evaluated.level,
    window: {
      ...profile.window,
      windowStart: nowDay.toISOString(),
      consecutiveMissed: evaluated.consecutiveMissed,
    },
  }
}
