export interface WorkoutGpsState {
  distanceMiles: number
  hasPermission: boolean
  isLocationEnabled: boolean
  isTracking: boolean
}

export type RunnerGpsModule = {
  getWorkoutGpsState: () => string | null
  setWorkoutTrackingEnabled: (enabled: boolean) => void
  openLocationSettings: () => void
}

const parseWorkoutGpsState = (detail: string | null): WorkoutGpsState | null => {
  if (!detail) return null

  return JSON.parse(detail) as WorkoutGpsState
}

class RunnerGpsBridge {
  private module: RunnerGpsModule | null = null

  configure = (module: RunnerGpsModule | null): void => {
    this.module = module
  }

  loadState = (): WorkoutGpsState | null => {
    'background only'

    if (!this.module) return null
    return parseWorkoutGpsState(this.module.getWorkoutGpsState())
  }

  setWorkoutTrackingEnabled = (enabled: boolean): void => {
    'background only'

    if (!this.module) return
    this.module.setWorkoutTrackingEnabled(enabled)
  }

  openLocationSettings = (): void => {
    'background only'

    if (!this.module) return
    this.module.openLocationSettings()
  }
}

export const runnerGps = new RunnerGpsBridge()
