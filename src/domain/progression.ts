import type { Session, TrainingLevel, TrainingProfile } from './types.js'

const daysToMilliseconds = (days: number): number => days * 24 * 60 * 60 * 1000
const windowDurationMilliseconds = daysToMilliseconds(7)
const minRunSeconds = 15
const runMultiplierUp = 1.1
const runMultiplierDown = 0.9
const ladderBaseRunSeconds = 30

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

const countSessionsInWindow = (
  sessions: Session[],
  startMilliseconds: number,
  endMilliseconds: number
): number =>
  sessions.reduce((count, session) => {
    const completedAtMilliseconds = new Date(session.completedAt).getTime()

    return completedAtMilliseconds >= startMilliseconds && completedAtMilliseconds < endMilliseconds
      ? count + 1
      : count
  }, 0)

const buildWindowStarts = (startMilliseconds: number, expiredWindowCount: number): number[] =>
  Array.from(
    { length: expiredWindowCount },
    (_, index) => startMilliseconds + index * windowDurationMilliseconds
  )

export const adjustLevelManually = (
  level: TrainingLevel,
  direction: LevelAdjustmentDirection
): TrainingLevel => adjustLevel(level, direction)

export const evaluateWindows = (profile: TrainingProfile, now: Date): TrainingProfile => {
  if (profile.window.windowStart === '') return profile

  const startMilliseconds = new Date(profile.window.windowStart).getTime()
  const nowMilliseconds = now.getTime()
  if (nowMilliseconds <= startMilliseconds) return profile

  const expiredWindowCount = Math.floor(
    (nowMilliseconds - startMilliseconds) / windowDurationMilliseconds
  )
  if (expiredWindowCount <= 0) return profile

  const evaluated = buildWindowStarts(startMilliseconds, expiredWindowCount).reduce(
    (state, windowStartMilliseconds) => {
      const sessionCount = countSessionsInWindow(
        profile.sessions,
        windowStartMilliseconds,
        windowStartMilliseconds + windowDurationMilliseconds
      )

      return sessionCount >= 3
        ? {
            level: adjustLevel(state.level, 'up'),
            consecutiveMissed: 0,
          }
        : {
            level:
              state.consecutiveMissed + 1 >= 2 ? adjustLevel(state.level, 'down') : state.level,
            consecutiveMissed: state.consecutiveMissed + 1,
          }
    },
    { level: cloneLevel(profile.level), consecutiveMissed: profile.window.consecutiveMissed }
  )

  return {
    ...profile,
    level: evaluated.level,
    window: {
      ...profile.window,
      windowStart: now.toISOString(),
      consecutiveMissed: evaluated.consecutiveMissed,
    },
  }
}
