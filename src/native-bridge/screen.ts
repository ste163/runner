export type RunnerScreenModule = {
  keepScreenOn: (enabled: boolean) => void
  setShowWhenLocked: (enabled: boolean) => void
}

class RunnerScreenBridge {
  private module: RunnerScreenModule | null = null

  configure = (module: RunnerScreenModule | null): void => {
    this.module = module
  }

  keepScreenOn = (enabled: boolean): void => {
    'background only'

    if (!this.module) return
    this.module.keepScreenOn(enabled)
  }

  setShowWhenLocked = (enabled: boolean): void => {
    'background only'

    if (!this.module) return
    this.module.setShowWhenLocked(enabled)
  }
}

export const runnerScreen = new RunnerScreenBridge()
