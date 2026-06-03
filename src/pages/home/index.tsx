import { root } from '@lynx-js/react'

import { AppLayout } from '../../components/AppLayout/index.js'
import { runnerProfileStorage } from '../../native-bridge/storage.js'
import { Home } from './Home.js'

const configureHomeNativeModules = (): void => {
  const nativeModules = typeof NativeModules === 'undefined' ? null : NativeModules
  const storageModule = nativeModules?.['RunnerStorageModule'] ?? null
  runnerProfileStorage.configure(storageModule)
}

configureHomeNativeModules()

root.render(
  <AppLayout initialPage='home'>
    <Home />
  </AppLayout>
)

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
}
