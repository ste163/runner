import { root } from '@lynx-js/react'

import { runnerGps } from '../../native-bridge/gps.js'
import { runnerHaptics } from '../../native-bridge/haptics.js'
import { runnerScreen } from '../../native-bridge/screen.js'
import { runnerWorkoutTimer } from '../../native-bridge/workout-timer.js'
import { ActiveWorkout } from './ActiveWorkout.js'

const configureActiveWorkoutNativeModules = (): void => {
  const nativeModules = typeof NativeModules === 'undefined' ? null : NativeModules
  const hapticsModule = nativeModules?.['RunnerHapticModule'] ?? null
  const gpsModule = nativeModules?.['RunnerGpsModule'] ?? null
  const screenModule = nativeModules?.['RunnerScreenModule'] ?? null
  const workoutTimerModule = nativeModules?.['RunnerWorkoutTimerModule'] ?? null
  runnerHaptics.configure(hapticsModule)
  runnerGps.configure(gpsModule)
  runnerScreen.configure(screenModule)
  runnerWorkoutTimer.configure(workoutTimerModule)
}

configureActiveWorkoutNativeModules()

root.render(<ActiveWorkout haptics={runnerHaptics} />)

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
}
