import { root } from '@lynx-js/react'

import { AppLayout } from '../../components/AppLayout/index.js'
import { Graphs } from './Graphs.js'

root.render(
  <AppLayout initialPage='graphs'>
    <Graphs />
  </AppLayout>
)

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
}
