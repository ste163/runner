import '@testing-library/jest-dom'
import { fireEvent, getQueriesForElement, render } from '@lynx-js/react/testing-library'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Settings } from './Settings.js'
import { sharedProfileStore } from '../../domain/profile.js'
import type { IntervalRecord, Session, TrainingProfile } from '../../domain/types.js'
import { runnerProfileStorage, type RunnerStorageModule } from '../../native-bridge/storage.js'

const buildProfile = (): TrainingProfile => ({
  schemaVersion: 1,
  level: { runSeconds: 30, walkSeconds: 120, intervalBlockSeconds: 1200 },
  window: { windowStart: '2024-01-01T00:00:00.000Z', consecutiveMissed: 0 },
  sessions: [],
})

const buildIntervalRecord = (
  type: IntervalRecord['type'],
  durationSeconds: number
): IntervalRecord => ({
  type,
  durationSeconds,
  distanceMiles: 0.1,
  avgPaceMinPerMile: 16,
})

const buildStandardIntervals = (): IntervalRecord[] => [
  buildIntervalRecord('warmup', 300),
  buildIntervalRecord('run', 30),
  buildIntervalRecord('walk', 120),
  buildIntervalRecord('cooldown', 300),
]

const buildSession = (
  id: string,
  completedAt: string,
  intervals: IntervalRecord[],
  totalDistanceMiles: number
): Session => ({
  id,
  completedAt,
  level: { runSeconds: 30, walkSeconds: 120, intervalBlockSeconds: 1200 },
  intervals,
  totalDistanceMiles,
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
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'))

    const importedProfile: TrainingProfile = {
      ...buildProfile(),
      level: { runSeconds: 33, walkSeconds: 108, intervalBlockSeconds: 1200 },
      sessions: [
        {
          ...buildSession(
            'imported-session',
            '2024-01-10T12:00:00.000Z',
            [buildIntervalRecord('run', 33), buildIntervalRecord('walk', 108)],
            1.5
          ),
          level: { runSeconds: 33, walkSeconds: 108, intervalBlockSeconds: 1200 },
          totalElapsedSeconds: 540,
          avgPaceMinPerMile: 6,
        },
      ],
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

    await queries.findByText('Jan 10')
    await queries.findByText('33s')
    await queries.findByText('1m 48s')
    await queries.findByText('1.50 mi')
    await queries.findByText('6.00 min/mi')

    expect(exportProfile).toHaveBeenCalledTimes(1)
    expect(importProfile).toHaveBeenCalledTimes(1)
  })

  it('lists current-month sessions with interval totals in ascending order', async () => {
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'))

    const profile: TrainingProfile = {
      ...buildProfile(),
      sessions: [
        buildSession('session-2', '2024-01-02T12:00:00.000Z', buildStandardIntervals(), 1.23),
        buildSession('session-1', '2024-01-01T12:00:00.000Z', buildStandardIntervals(), 0.98),
        buildSession('session-3', '2024-01-03T12:00:00.000Z', buildStandardIntervals(), 1.1),
      ],
    }
    sharedProfileStore.save(profile)

    render(<Settings />)

    const queries = getQueriesForElement(elementTree.root!)

    await queries.findByText('January 2024')
    expect(await queries.findAllByText('30s')).toHaveLength(3)
    expect(await queries.findAllByText('2m 0s')).toHaveLength(3)
    await queries.findByText('1.23 mi')
    expect(queries.queryByText('Previous')).toBeNull()
    expect(queries.queryByText('Next')).toBeNull()

    const dateLabels = queries.getAllByText(/^Jan [0-9]+$/).map((node) => node.textContent)

    expect(dateLabels).toEqual(['Jan 1', 'Jan 2', 'Jan 3'])
  })

  it('shows level durations and dashes for missing distance and pace data', async () => {
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'))

    const profile: TrainingProfile = {
      ...buildProfile(),
      sessions: [buildSession('session-1', '2024-01-10T12:00:00.000Z', [], 0)],
    }
    sharedProfileStore.save(profile)

    render(<Settings />)

    const queries = getQueriesForElement(elementTree.root!)

    await queries.findByText('Jan 10')
    await queries.findByText('30s')
    await queries.findByText('2m 0s')
    expect(await queries.findAllByText('—')).toHaveLength(2)
  })

  it('shows an empty state for the current month when it has no sessions', async () => {
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'))

    const profile: TrainingProfile = {
      ...buildProfile(),
      sessions: [
        buildSession('session-1', '2023-12-20T12:00:00.000Z', buildStandardIntervals(), 1.5),
      ],
    }
    sharedProfileStore.save(profile)

    render(<Settings />)

    const queries = getQueriesForElement(elementTree.root!)

    await queries.findByText('January 2024')
    await queries.findByText('No runs this month')
    expect(queries.queryByText('Next')).toBeNull()
  })

  it('navigates to previous months and back', async () => {
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'))

    const profile: TrainingProfile = {
      ...buildProfile(),
      sessions: [
        buildSession('session-1', '2023-12-20T12:00:00.000Z', buildStandardIntervals(), 1.5),
      ],
    }
    sharedProfileStore.save(profile)

    render(<Settings />)

    const queries = getQueriesForElement(elementTree.root!)
    await queries.findByText('No runs this month')

    fireEvent.tap(queries.getByText('Previous'))

    await queries.findByText('December 2023')
    await queries.findByText('Dec 20')
    expect(queries.queryByText('No runs this month')).toBeNull()
    expect(queries.queryByText('Previous')).toBeNull()

    fireEvent.tap(queries.getByText('Next'))

    await queries.findByText('January 2024')
    await queries.findByText('No runs this month')
  })

  it('deletes a session after confirmation', async () => {
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'))

    const saveProfileJson = vi.fn()
    const module: RunnerStorageModule = {
      exportProfile: vi.fn(),
      importProfile: vi.fn(),
      loadProfileJson: vi.fn(() => JSON.stringify(buildProfile())),
      resetProfile: vi.fn(),
      saveProfileJson,
    }

    const profile: TrainingProfile = {
      ...buildProfile(),
      sessions: [
        buildSession('session-1', '2024-01-10T12:00:00.000Z', buildStandardIntervals(), 1.5),
      ],
    }
    sharedProfileStore.save(profile)
    runnerProfileStorage.configure(module)

    render(<Settings />)

    const queries = getQueriesForElement(elementTree.root!)
    await queries.findByText('Jan 10')

    fireEvent.tap(queries.getByTestId('trash-session-1'))
    await queries.findByText('Delete this session?')

    fireEvent.tap(queries.getByText('Yes'))

    await queries.findByText('No runs this month')
    expect(queries.queryByText('Jan 10')).toBeNull()
    expect(saveProfileJson).toHaveBeenCalledTimes(1)

    const savedProfileJson = saveProfileJson.mock.calls[0]?.[0] ?? '{}'
    const savedProfile = JSON.parse(savedProfileJson) as TrainingProfile

    expect(savedProfile.sessions).toHaveLength(0)
  })

  it('keeps the session when deletion is cancelled', async () => {
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'))

    const saveProfileJson = vi.fn()
    const module: RunnerStorageModule = {
      exportProfile: vi.fn(),
      importProfile: vi.fn(),
      loadProfileJson: vi.fn(() => JSON.stringify(buildProfile())),
      resetProfile: vi.fn(),
      saveProfileJson,
    }

    const profile: TrainingProfile = {
      ...buildProfile(),
      sessions: [
        buildSession('session-1', '2024-01-10T12:00:00.000Z', buildStandardIntervals(), 1.5),
      ],
    }
    sharedProfileStore.save(profile)
    runnerProfileStorage.configure(module)

    render(<Settings />)

    const queries = getQueriesForElement(elementTree.root!)
    await queries.findByText('Jan 10')

    fireEvent.tap(queries.getByTestId('trash-session-1'))
    await queries.findByText('Delete this session?')

    fireEvent.tap(queries.getByText('No'))

    expect(queries.queryByText('Delete this session?')).toBeNull()
    await queries.findByText('Jan 10')
    expect(saveProfileJson).not.toHaveBeenCalled()
  })
})
