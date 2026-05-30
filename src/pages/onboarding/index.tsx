import { root } from '@lynx-js/react'

import { Onboarding } from './Onboarding.js'

root.render(<Onboarding />)

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
}
