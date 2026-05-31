export type RunnerScreenModule = {
  keepScreenOn: (enabled: boolean) => void
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
}

export const runnerScreen = new RunnerScreenBridge()
