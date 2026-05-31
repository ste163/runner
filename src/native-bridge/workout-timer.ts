import type { TrainingLevel } from '../domain/types.js'

export interface WorkoutTimerState {
  isComplete: boolean
  isPaused: boolean
  isRunning: boolean
  phaseDurationSeconds: number
  phaseIndex: number
  phaseLabel: string
  phaseRemainingSeconds: number
  phaseType: 'cooldown' | 'run' | 'walk' | 'warmup'
  totalElapsedSeconds: number
  totalRemainingSeconds: number
}

export type RunnerWorkoutTimerModule = {
  getWorkoutTimerState: () => string | null
  pauseWorkout: () => void
  resumeWorkout: () => void
  startWorkout: (runSeconds: number, walkSeconds: number, intervalBlockSeconds: number) => void
  stopWorkout: () => void
}

const parseWorkoutTimerState = (detail: string | null): WorkoutTimerState | null => {
  if (!detail) return null

  return JSON.parse(detail) as WorkoutTimerState
}

class RunnerWorkoutTimerBridge {
  private module: RunnerWorkoutTimerModule | null = null

  configure = (module: RunnerWorkoutTimerModule | null): void => {
    this.module = module
  }

  loadState = (): WorkoutTimerState | null => {
    'background only'

    if (!this.module) return null
    return parseWorkoutTimerState(this.module.getWorkoutTimerState())
  }

  start = (level: TrainingLevel): void => {
    'background only'

    if (!this.module) return
    this.module.startWorkout(level.runSeconds, level.walkSeconds, level.intervalBlockSeconds)
  }

  pause = (): void => {
    'background only'

    if (!this.module) return
    this.module.pauseWorkout()
  }

  resume = (): void => {
    'background only'

    if (!this.module) return
    this.module.resumeWorkout()
  }

  stop = (): void => {
    'background only'

    if (!this.module) return
    this.module.stopWorkout()
  }
}

export const runnerWorkoutTimer = new RunnerWorkoutTimerBridge()
