import type { WorkoutHaptics } from './native/haptics.js'

declare module '@lynx-js/types' {
  interface NativeModules {
    RunnerHapticModule: WorkoutHaptics
  }
}

export {}
