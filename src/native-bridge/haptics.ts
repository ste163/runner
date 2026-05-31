export interface WorkoutHaptics {
  cancel: () => void
  vibrate: (durationMs: number) => void
}

class RunnerHapticsBridge {
  private module: WorkoutHaptics | null = null

  configure = (module: WorkoutHaptics | null): void => {
    this.module = module
  }

  cancel = (): void => {
    'background only'

    if (!this.module) return
    this.module.cancel()
  }

  vibrate = (durationMs: number): void => {
    'background only'

    if (!this.module) return
    this.module.vibrate(durationMs)
  }
}

export const runnerHaptics = new RunnerHapticsBridge()
