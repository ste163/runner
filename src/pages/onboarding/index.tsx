import { root } from '@lynx-js/react'

import { AppLayout } from '../../components/AppLayout/index.js'
import { Onboarding } from './Onboarding.js'

root.render(
  <AppLayout initialPage='onboarding'>
    <Onboarding />
  </AppLayout>
)

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
}
