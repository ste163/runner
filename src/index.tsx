import { root } from '@lynx-js/react'

import { AppShell } from './components/AppShell/index.js'
import { runnerGps } from './native-bridge/gps.js'
import { runnerHaptics } from './native-bridge/haptics.js'
import { runnerScreen } from './native-bridge/screen.js'
import { runnerProfileStorage } from './native-bridge/storage.js'
import { runnerWorkoutTimer } from './native-bridge/workout-timer.js'

const configureNativeModules = (): void => {
  const nativeModules = typeof NativeModules === 'undefined' ? null : NativeModules
  const hapticsModule = nativeModules?.['RunnerHapticModule'] ?? null
  const gpsModule = nativeModules?.['RunnerGpsModule'] ?? null
  const screenModule = nativeModules?.['RunnerScreenModule'] ?? null
  const workoutTimerModule = nativeModules?.['RunnerWorkoutTimerModule'] ?? null
  const storageModule = nativeModules?.['RunnerStorageModule'] ?? null
  runnerHaptics.configure(hapticsModule)
  runnerGps.configure(gpsModule)
  runnerScreen.configure(screenModule)
  runnerWorkoutTimer.configure(workoutTimerModule)
  runnerProfileStorage.configure(storageModule)
}

configureNativeModules()

root.render(<AppShell />)

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
}
