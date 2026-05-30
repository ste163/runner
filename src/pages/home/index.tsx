import { root } from '@lynx-js/react'

import { Home } from './Home.js'

root.render(<Home />)

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
}
