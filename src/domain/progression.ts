import type { Session, TrainingLevel, TrainingProfile } from './types.js'

const daysToMilliseconds = (days: number): number => days * 24 * 60 * 60 * 1000
const windowDurationMilliseconds = daysToMilliseconds(7)
const minRunSeconds = 15
const minWalkSeconds = 10
const maxWalkSeconds = 300

type LevelAdjustmentDirection = 'up' | 'down'

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)
const cloneLevel = (level: TrainingLevel): TrainingLevel => ({ ...level })

const adjustLevel = (level: TrainingLevel, direction: LevelAdjustmentDirection): TrainingLevel => {
  const runMultiplier = direction === 'up' ? 1.1 : 0.9
  const walkMultiplier = direction === 'up' ? 0.9 : 1.1

  return {
    ...cloneLevel(level),
    runSeconds: clamp(level.runSeconds * runMultiplier, minRunSeconds, level.intervalBlockSeconds),
    walkSeconds: clamp(level.walkSeconds * walkMultiplier, minWalkSeconds, maxWalkSeconds),
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
