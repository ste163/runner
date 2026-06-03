import '@testing-library/jest-dom'
import { fireEvent, getQueriesForElement, render } from '@lynx-js/react/testing-library'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as router from 'sparkling-navigation'

import { AppLayout } from '../../components/AppLayout/index.js'
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

const buildCompletedWeekProfile = (): TrainingProfile => ({
  ...buildProfile(),
  sessions: [
    {
      id: 'session-1',
      completedAt: '2024-01-01T12:00:00.000Z',
      level: { runSeconds: 30, walkSeconds: 120, intervalBlockSeconds: 1200 },
      intervals: [],
      totalDistanceMiles: 0,
    },
    {
      id: 'session-2',
      completedAt: '2024-01-03T12:00:00.000Z',
      level: { runSeconds: 30, walkSeconds: 120, intervalBlockSeconds: 1200 },
      intervals: [],
      totalDistanceMiles: 0,
    },
    {
      id: 'session-3',
      completedAt: '2024-01-05T12:00:00.000Z',
      level: { runSeconds: 30, walkSeconds: 120, intervalBlockSeconds: 1200 },
      intervals: [],
      totalDistanceMiles: 0,
    },
  ],
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

    render(
      <AppLayout initialPage='home'>
        <Home onMounted={onMounted} />
      </AppLayout>
    )

    expect(onMounted).toBeCalledTimes(1)
    expect(router.open).toHaveBeenCalledWith({ scheme: onboardingScheme }, expect.any(Function))
  })

  it('renders the sectioned home layout and current values', async () => {
    render(
      <AppLayout initialPage='home'>
        <Home />
      </AppLayout>
    )

    const { findByText, queryByText } = getQueriesForElement(elementTree.root!)

    expect(queryByText('Runner')).toBeNull()
    expect(queryByText('3 sessions. 7-day windows.')).toBeNull()
    await findByText('This Week')
    await findByText('Current interval')
    await findByText('Run')
    await findByText('Walk')
    await findByText('0/3 completed')
    await findByText('30s')
    await findByText('2m 0s')
    await findByText('Manually adjust interval')
    expect(queryByText('- Decrease')).toBeNull()
    expect(queryByText('+ Add')).toBeNull()
    fireEvent.tap(await findByText('Manually adjust interval'))
    await findByText('- Decrease')
    await findByText('+ Add')
    await findByText('This month')
    await findByText('Coming soon.')
    await findByText('Backup & restore')
    await findByText('Home')
    await findByText('Workout')
  })

  it('updates the current interval when the user taps increase', async () => {
    render(
      <AppLayout initialPage='home'>
        <Home />
      </AppLayout>
    )

    const { findByText, getByText } = getQueriesForElement(elementTree.root!)
    await findByText('30s')
    await findByText('Manually adjust interval')

    fireEvent.tap(getByText('Manually adjust interval'))
    fireEvent.tap(getByText('+ Add'))

    await findByText('33s')
    await findByText('1m 48s')
  })

  it('shows a completed week message and the next cycle day after three sessions', async () => {
    sharedProfileStore.save(buildCompletedWeekProfile())

    render(
      <AppLayout initialPage='home'>
        <Home />
      </AppLayout>
    )

    const { findByText, queryByText } = getQueriesForElement(elementTree.root!)

    await findByText('3/3 completed')
    expect(queryByText('Completed!')).toBeNull()
    await findByText('Exercise again on Monday')
  })

  it('opens the workout page when the start button is tapped', async () => {
    sharedProfileStore.save(buildProfile())

    render(
      <AppLayout initialPage='home'>
        <Home />
      </AppLayout>
    )

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

    render(
      <AppLayout initialPage='home'>
        <Home />
      </AppLayout>
    )

    const queries = getQueriesForElement(elementTree.root!)
    await queries.findByText('Export JSON')

    fireEvent.tap(queries.getByText('Export JSON'))
    fireEvent.tap(queries.getByText('Import JSON'))

    await queries.findByText('Imported profile from device.')
    await queries.findByText('33s')
    await queries.findByText('1m 48s')

    expect(exportProfile).toHaveBeenCalledTimes(1)
    expect(importProfile).toHaveBeenCalledTimes(1)
  })

  it('shows the current profile JSON for debugging', async () => {
    sharedProfileStore.save(buildProfile())

    render(
      <AppLayout initialPage='home'>
        <Home />
      </AppLayout>
    )

    const queries = getQueriesForElement(elementTree.root!)
    await queries.findByText('Show current JSON')

    fireEvent.tap(queries.getByText('Show current JSON'))

    await queries.findByText(/"schemaVersion": 1/)
    await queries.findByText(/"runSeconds": 30/)
  })
})
