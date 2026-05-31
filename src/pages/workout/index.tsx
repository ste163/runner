import { root } from '@lynx-js/react'

import { runnerHaptics } from '../../native-bridge/haptics.js'
import { runnerWorkoutTimer } from '../../native-bridge/workout-timer.js'
import { Workout } from './Workout.js'

const configureWorkoutNativeModules = (): void => {
  const nativeModules = typeof NativeModules === 'undefined' ? null : NativeModules
  const hapticsModule = nativeModules?.['RunnerHapticModule'] ?? null
  const workoutTimerModule = nativeModules?.['RunnerWorkoutTimerModule'] ?? null
  runnerHaptics.configure(hapticsModule)
  runnerWorkoutTimer.configure(workoutTimerModule)
}

configureWorkoutNativeModules()

root.render(<Workout haptics={runnerHaptics} />)

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
}
