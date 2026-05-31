import type { WorkoutHaptics } from './native-bridge/haptics.js'
import type { RunnerStorageModule } from './native-bridge/storage.js'

declare module '@lynx-js/types' {
  interface NativeModules {
    RunnerHapticModule: WorkoutHaptics
    RunnerStorageModule: RunnerStorageModule
  }
}

export {}
