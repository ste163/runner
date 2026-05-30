import { root } from '@lynx-js/react'

import { cancelRunnerHaptics, vibrateRunnerHaptics } from '../../native/haptics.js'
import { Workout } from './Workout.js'

root.render(
  <Workout
    haptics={{
      cancel: cancelRunnerHaptics,
      vibrate: vibrateRunnerHaptics,
    }}
  />
)

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
}
