import { root } from '@lynx-js/react'

import { AppLayout } from '../../components/AppLayout/index.js'
import { runnerProfileStorage } from '../../native-bridge/storage.js'
import { Workout } from './Workout.js'

const configureWorkoutNativeModules = (): void => {
  const nativeModules = typeof NativeModules === 'undefined' ? null : NativeModules
  const storageModule = nativeModules?.['RunnerStorageModule'] ?? null
  runnerProfileStorage.configure(storageModule)
}

configureWorkoutNativeModules()

root.render(
  <AppLayout initialPage='workout'>
    <Workout />
  </AppLayout>
)

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
}
