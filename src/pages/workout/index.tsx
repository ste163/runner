import { root } from '@lynx-js/react'

import type { WorkoutHaptics } from '../../native-bridge/haptics.js'
import { runnerHaptics } from '../../native-bridge/haptics.js'
import {
  runnerWorkoutTimer,
  type RunnerWorkoutTimerModule,
} from '../../native-bridge/workout-timer.js'
import { Workout } from './Workout.js'

// TODO: we do this check a lot, we should move it to a util or something so that we can reduce the amount of times
// do the the NativeModules check.
const resolveRunnerHapticModule = (): WorkoutHaptics | null => {
  if (typeof NativeModules === 'undefined') return null
  return NativeModules['RunnerHapticModule'] ?? null
}

const resolveRunnerWorkoutTimerModule = (): RunnerWorkoutTimerModule | null => {
  if (typeof NativeModules === 'undefined') return null
  return NativeModules['RunnerWorkoutTimerModule'] ?? null
}

runnerHaptics.configure(resolveRunnerHapticModule())
runnerWorkoutTimer.configure(resolveRunnerWorkoutTimerModule())

root.render(<Workout haptics={runnerHaptics} />)

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
}
