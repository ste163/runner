import type { WorkoutHaptics } from './native/haptics.js'
import type { RunnerStorageModule } from './native/storage.js'

declare module '@lynx-js/types' {
  interface NativeModules {
    RunnerHapticModule: WorkoutHaptics
    RunnerStorageModule: RunnerStorageModule
  }
}

export {}
