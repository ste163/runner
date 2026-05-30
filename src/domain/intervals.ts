import type { TrainingLevel } from './types.js'

const warmupSeconds = 300
const cooldownSeconds = 300

export const isGraduated = (level: TrainingLevel): boolean => level.walkSeconds <= 10

const buildWorkoutIntervals = (
  level: TrainingLevel,
  remainingSeconds: number,
  nextType: 'run' | 'walk'
): Array<{ type: 'run' | 'walk'; durationSeconds: number }> =>
  remainingSeconds <= 0
    ? []
    : nextType === 'run'
      ? (() => {
          const durationSeconds = Math.min(level.runSeconds, remainingSeconds)

          return durationSeconds <= 0
            ? []
            : [
                { type: 'run', durationSeconds },
                ...buildWorkoutIntervals(level, remainingSeconds - durationSeconds, 'walk'),
              ]
        })()
      : (() => {
          const durationSeconds = Math.min(level.walkSeconds, remainingSeconds)

          return durationSeconds <= 0
            ? []
            : [
                { type: 'walk', durationSeconds },
                ...buildWorkoutIntervals(level, remainingSeconds - durationSeconds, 'run'),
              ]
        })()

export const calculateIntervals = (
  level: TrainingLevel
): Array<{ type: 'warmup' | 'run' | 'walk' | 'cooldown'; durationSeconds: number }> => [
  { type: 'warmup', durationSeconds: warmupSeconds },
  ...(isGraduated(level)
    ? [{ type: 'run' as const, durationSeconds: level.intervalBlockSeconds }]
    : buildWorkoutIntervals(level, level.intervalBlockSeconds, 'run')),
  { type: 'cooldown', durationSeconds: cooldownSeconds },
]
