import { root } from '@lynx-js/react'

import { Home } from './Home.js'
import { runnerProfileStorage, type RunnerStorageModule } from '../../native/storage.js'

const resolveRunnerStorageModule = (): RunnerStorageModule | null => {
  if (typeof NativeModules === 'undefined') return null

  return NativeModules['RunnerStorageModule'] ?? null
}

runnerProfileStorage.configure(resolveRunnerStorageModule())

root.render(<Home />)

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
}
