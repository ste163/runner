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

export type WorkoutTimerStatus =
  | 'completed'
  | 'error'
  | 'paused'
  | 'resumed'
  | 'started'
  | 'stopped'
  | 'tick'

export interface WorkoutTimerEvent {
  message?: string
  state?: WorkoutTimerState
  status: WorkoutTimerStatus
}

interface RunnerWorkoutTimerModule {
  getWorkoutTimerState: () => string | null
  pauseWorkout: () => void
  resumeWorkout: () => void
  startWorkout: (runSeconds: number, walkSeconds: number, intervalBlockSeconds: number) => void
  stopWorkout: () => void
}

const resolveRunnerWorkoutTimerModule = (): RunnerWorkoutTimerModule | null => {
  'background only'

  if (typeof NativeModules === 'undefined') return null

  return NativeModules['RunnerWorkoutTimerModule'] ?? null
}

const parseWorkoutTimerState = (detail: string | null): WorkoutTimerState | null => {
  if (!detail) return null

  return JSON.parse(detail) as WorkoutTimerState
}

export const loadWorkoutTimerState = (): WorkoutTimerState | null => {
  'background only'

  const module = resolveRunnerWorkoutTimerModule()

  if (!module) return null

  return parseWorkoutTimerState(module.getWorkoutTimerState())
}

export const startRunnerWorkoutTimer = (level: TrainingLevel): void => {
  'background only'

  const module = resolveRunnerWorkoutTimerModule()

  if (!module) return

  module.startWorkout(level.runSeconds, level.walkSeconds, level.intervalBlockSeconds)
}

export const pauseRunnerWorkoutTimer = (): void => {
  'background only'

  const module = resolveRunnerWorkoutTimerModule()

  if (!module) return

  module.pauseWorkout()
}

export const resumeRunnerWorkoutTimer = (): void => {
  'background only'

  const module = resolveRunnerWorkoutTimerModule()

  if (!module) return

  module.resumeWorkout()
}

export const stopRunnerWorkoutTimer = (): void => {
  'background only'

  const module = resolveRunnerWorkoutTimerModule()

  if (!module) return

  module.stopWorkout()
}
