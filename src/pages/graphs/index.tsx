import { root } from '@lynx-js/react'

import { Graphs } from './Graphs.js'

root.render(<Graphs />)

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
}
