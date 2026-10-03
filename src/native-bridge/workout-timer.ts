import type { IntervalRecord, TrainingLevel } from '../domain/types.js'

export interface CompletedWorkoutInterval {
  type: IntervalRecord['type']
  durationSeconds: number
  distanceMiles: number
}

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
  intervals: CompletedWorkoutInterval[]
}

export type RunnerWorkoutTimerModule = {
  getWorkoutTimerState: () => string | null
  pauseWorkout: () => void
  resumeWorkout: () => void
  startWorkout: (runSeconds: number, walkSeconds: number, intervalBlockSeconds: number) => void
  stopWorkout: () => void
}

export const isPendingNativeStartState = (timerState: WorkoutTimerState): boolean =>
  !timerState.isRunning && !timerState.isPaused && !timerState.isComplete

const parseWorkoutTimerState = (detail: string | null): WorkoutTimerState | null => {
  if (!detail) return null

  try {
    const parsed = JSON.parse(detail) as WorkoutTimerState

    return Array.isArray(parsed.intervals) ? parsed : { ...parsed, intervals: [] }
  } catch {
    return null
  }
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
