import type { TrainingLevel } from './types.js'

const warmupSeconds = 300
const cooldownSeconds = 300

export const isGraduated = (level: TrainingLevel): boolean =>
  level.runSeconds >= level.intervalBlockSeconds

const buildBlockIntervals = (
  level: TrainingLevel
): Array<{ type: 'run' | 'walk'; durationSeconds: number }> =>
  level.intervalBlockSeconds <= 0
    ? []
    : isGraduated(level)
      ? [{ type: 'run', durationSeconds: level.intervalBlockSeconds }]
      : buildWorkoutIntervals(level, level.intervalBlockSeconds, 'run')

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

          return [
            { type: 'walk', durationSeconds },
            ...buildWorkoutIntervals(level, remainingSeconds - durationSeconds, 'run'),
          ]
        })()

export const calculateIntervals = (
  level: TrainingLevel
): Array<{ type: 'warmup' | 'run' | 'walk' | 'cooldown'; durationSeconds: number }> => [
  { type: 'warmup', durationSeconds: warmupSeconds },
  ...buildBlockIntervals(level),
  { type: 'cooldown', durationSeconds: cooldownSeconds },
]
