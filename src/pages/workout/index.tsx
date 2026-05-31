import { root } from '@lynx-js/react'

import { runnerGps } from '../../native-bridge/gps.js'
import { runnerHaptics } from '../../native-bridge/haptics.js'
import { runnerScreen } from '../../native-bridge/screen.js'
import { runnerWorkoutTimer } from '../../native-bridge/workout-timer.js'
import { Workout } from './Workout.js'

const configureWorkoutNativeModules = (): void => {
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

configureWorkoutNativeModules()

root.render(<Workout haptics={runnerHaptics} />)

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
}
