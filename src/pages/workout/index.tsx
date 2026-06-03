import { root } from '@lynx-js/react'

import { AppLayout } from '../../components/AppLayout/index.js'
import { Workout } from './Workout.js'

root.render(
  <AppLayout initialPage='workout'>
    <Workout />
  </AppLayout>
)

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
}
