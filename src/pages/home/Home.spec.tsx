import '@testing-library/jest-dom'
import { getQueriesForElement, fireEvent, render } from '@lynx-js/react/testing-library'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as router from 'sparkling-navigation'

import { Home } from './Home.js'
import { sharedProfileStore } from '../../domain/profile.js'
import type { TrainingProfile } from '../../domain/types.js'
import { runnerProfileStorage, type RunnerStorageModule } from '../../native-bridge/storage.js'

vi.mock('sparkling-navigation', () => ({ open: vi.fn(), close: vi.fn() }))

const buildPageScheme = (bundle: string, title: string): string => {
  return (
    `hybrid://lynxview_page?bundle=${bundle}` +
    '&container_bg_color=%23000000' +
    '&force_theme_style=dark' +
    '&hide_nav_bar=1' +
    '&nav_bar_color=%23000000' +
    '&screen_orientation=portrait' +
    `&title=${encodeURIComponent(title)}` +
    '&trans_status_bar=0'
  )
}

const onboardingScheme = buildPageScheme('onboarding.lynx.bundle', 'How It Works')
const workoutScheme = buildPageScheme('workout.lynx.bundle', 'Workout')

const buildProfile = (): TrainingProfile => ({
  schemaVersion: 1,
  level: { runSeconds: 30, walkSeconds: 120, intervalBlockSeconds: 1200 },
  window: { windowStart: '2024-01-01T00:00:00.000Z', consecutiveMissed: 0 },
  sessions: [],
})

describe('Home', () => {
  beforeEach(() => {
    sharedProfileStore.reset()
    runnerProfileStorage.configure(null)
    vi.clearAllMocks()
  })

  afterEach(() => {
    runnerProfileStorage.configure(null)
    vi.unstubAllGlobals()
  })

  it('opens onboarding on first launch', async () => {
    const onMounted = vi.fn()

    render(<Home onMounted={onMounted} />)

    expect(onMounted).toBeCalledTimes(1)

    expect(router.open).toHaveBeenCalledWith({ scheme: onboardingScheme }, expect.any(Function))
  })

  it('updates the current interval when the user taps increase', async () => {
    render(<Home />)

    const { findByText, getByText } = getQueriesForElement(elementTree.root!)
    await findByText('Run 30s · Walk 2m 0s')

    fireEvent.tap(getByText('Increase 10%'))

    await findByText('Run 33s · Walk 1m 48s')
  })

  it('opens the workout page when the start button is tapped', async () => {
    sharedProfileStore.save(buildProfile())

    render(<Home />)

    const { findByText, getByText } = getQueriesForElement(elementTree.root!)
    await findByText('Start Workout')

    fireEvent.tap(getByText('Start Workout'))

    expect(router.open).toHaveBeenCalledWith({ scheme: workoutScheme }, expect.any(Function))
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

    render(<Home />)

    const queries = getQueriesForElement(elementTree.root!)
    await queries.findByText('Export JSON')

    fireEvent.tap(queries.getByText('Export JSON'))
    fireEvent.tap(queries.getByText('Import JSON'))

    await queries.findByText('Imported profile from device.')
    await queries.findByText('Run 33s · Walk 1m 48s')

    expect(exportProfile).toHaveBeenCalledTimes(1)
    expect(importProfile).toHaveBeenCalledTimes(1)
  })

  it('shows the current profile JSON for debugging', async () => {
    sharedProfileStore.save(buildProfile())

    render(<Home />)

    const queries = getQueriesForElement(elementTree.root!)
    await queries.findByText('Show current JSON')

    fireEvent.tap(queries.getByText('Show current JSON'))

    await queries.findByText(/"schemaVersion": 1/)
    await queries.findByText(/"runSeconds": 30/)
  })
})
