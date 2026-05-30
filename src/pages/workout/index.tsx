import { root } from '@lynx-js/react'

import { Workout } from './Workout.js'

root.render(<Workout />)

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
}
