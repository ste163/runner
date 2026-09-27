import '@testing-library/jest-dom'
import { fireEvent, getQueriesForElement, render } from '@lynx-js/react/testing-library'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Settings } from './Settings.js'
import { sharedProfileStore } from '../../domain/profile.js'
import type { TrainingProfile } from '../../domain/types.js'
import { runnerProfileStorage, type RunnerStorageModule } from '../../native-bridge/storage.js'

const buildProfile = (): TrainingProfile => ({
  schemaVersion: 1,
  level: { runSeconds: 30, walkSeconds: 120, intervalBlockSeconds: 1200 },
  window: { windowStart: '2024-01-01T00:00:00.000Z', consecutiveMissed: 0 },
  sessions: [],
})

describe('Settings', () => {
  beforeEach(() => {
    sharedProfileStore.reset()
    runnerProfileStorage.configure(null)
    vi.clearAllMocks()
  })

  afterEach(() => {
    runnerProfileStorage.configure(null)
    vi.unstubAllGlobals()
  })

  it('exports and imports profile JSON with the native file pickers', async () => {
    const importedProfile = {
      ...buildProfile(),
      level: { runSeconds: 33, walkSeconds: 108, intervalBlockSeconds: 1200 },
    }
    const exportProfile = vi.fn((callback) => {
      callback('success', 'content://runner-profile.json')
    })
    const importProfile = vi.fn((callback) => {
      callback('success', JSON.stringify(importedProfile))
    })

    const module: RunnerStorageModule = {
      exportProfile,
      importProfile,
      loadProfileJson: vi.fn(() => JSON.stringify(buildProfile())),
      resetProfile: vi.fn(),
      saveProfileJson: vi.fn(),
    }

    runnerProfileStorage.configure(module)

    render(<Settings />)

    const queries = getQueriesForElement(elementTree.root!)
    await queries.findByText('Export JSON')

    fireEvent.tap(queries.getByText('Export JSON'))
    fireEvent.tap(queries.getByText('Import JSON'))

    await queries.findByText('Imported profile from device.')
    fireEvent.tap(queries.getByText('Show current JSON'))

    await queries.findByText(/"runSeconds": 33/)
    await queries.findByText(/"walkSeconds": 108/)

    expect(exportProfile).toHaveBeenCalledTimes(1)
    expect(importProfile).toHaveBeenCalledTimes(1)
  })

  it('shows the current profile JSON for debugging', async () => {
    sharedProfileStore.save(buildProfile())

    render(<Settings />)

    const queries = getQueriesForElement(elementTree.root!)
    await queries.findByText('Show current JSON')

    fireEvent.tap(queries.getByText('Show current JSON'))

    await queries.findByText(/"schemaVersion": 1/)
    await queries.findByText(/"runSeconds": 30/)
  })
})
