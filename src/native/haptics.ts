export interface WorkoutHaptics {
  cancel: () => void
  vibrate: (durationMs: number) => void
}

const resolveRunnerHapticModule = (): WorkoutHaptics | null => {
  'background only'

  if (typeof NativeModules === 'undefined') return null

  return NativeModules.RunnerHapticModule ?? null
}

export const cancelRunnerHaptics = (): void => {
  'background only'

  const module = resolveRunnerHapticModule()

  if (!module) return

  module.cancel()
}

export const vibrateRunnerHaptics = (durationMs: number): void => {
  'background only'

  const module = resolveRunnerHapticModule()

  if (!module) return

  module.vibrate(durationMs)
}
