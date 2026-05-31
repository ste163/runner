import type { WorkoutHaptics } from './native-bridge/haptics.js'
import type { RunnerGpsModule } from './native-bridge/gps.js'
import type { RunnerScreenModule } from './native-bridge/screen.js'
import type { RunnerStorageModule } from './native-bridge/storage.js'

declare module '@lynx-js/types' {
  interface NativeModules {
    RunnerHapticModule: WorkoutHaptics
    RunnerGpsModule: RunnerGpsModule
    RunnerScreenModule: RunnerScreenModule
    RunnerStorageModule: RunnerStorageModule
  }
}

export {}
