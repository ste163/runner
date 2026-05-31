import { root } from '@lynx-js/react'

import { Home } from './Home.js'
import { runnerProfileStorage } from '../../native-bridge/storage.js'

const configureHomeNativeModules = (): void => {
  const nativeModules = typeof NativeModules === 'undefined' ? null : NativeModules
  const storageModule = nativeModules?.['RunnerStorageModule'] ?? null
  runnerProfileStorage.configure(storageModule)
}

configureHomeNativeModules()

root.render(<Home />)

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
}
