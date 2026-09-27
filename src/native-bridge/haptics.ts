export interface WorkoutHaptics {
  cancel: () => void
  vibratePattern: (patternJson: string) => void
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

  vibratePattern = (pattern: number[]): void => {
    'background only'

    if (!this.module) return
    this.module.vibratePattern(JSON.stringify(pattern))
  }
}

export const runnerHaptics = new RunnerHapticsBridge()
