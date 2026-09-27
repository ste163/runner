import '@testing-library/jest-dom'
import { fireEvent, getQueriesForElement, render } from '@lynx-js/react/testing-library'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Home } from './Home.js'
import { sharedProfileStore } from '../../domain/profile.js'
import type { TrainingProfile } from '../../domain/types.js'

const buildProfile = (): TrainingProfile => ({
  schemaVersion: 1,
  level: { runSeconds: 30, walkSeconds: 120, intervalBlockSeconds: 1200 },
  window: { windowStart: '2024-01-01T00:00:00.000Z', consecutiveMissed: 0 },
  sessions: [],
})

const buildOneSessionProfile = (): TrainingProfile => ({
  ...buildProfile(),
  sessions: [
    {
      id: 'session-1',
      completedAt: '2024-01-01T12:00:00.000Z',
      level: { runSeconds: 30, walkSeconds: 120, intervalBlockSeconds: 1200 },
      intervals: [],
      totalDistanceMiles: 0,
    },
  ],
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
      completedAt: '2024-01-06T12:00:00.000Z',
      level: { runSeconds: 30, walkSeconds: 120, intervalBlockSeconds: 1200 },
      intervals: [],
      totalDistanceMiles: 0,
    },
  ],
})

describe('Home', () => {
  beforeEach(() => {
    sharedProfileStore.reset()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the sectioned home layout and current values', async () => {
    render(<Home onStartWorkout={vi.fn()} />)

    const { findByText, queryByText } = getQueriesForElement(elementTree.root!)

    expect(queryByText('Runner')).toBeNull()
    expect(queryByText('3 sessions. 7-day windows.')).toBeNull()
    await findByText('This Week')
    await findByText('Current interval')
    await findByText('Run')
    await findByText('Walk')
    await findByText('0/3')
    await findByText('30s')
    await findByText('2m 0s')
    await findByText('Manually adjust interval')
    expect(queryByText('- Decrease')).toBeNull()
    expect(queryByText('+ Add')).toBeNull()
    fireEvent.tap(await findByText('Manually adjust interval'))
    await findByText('- Decrease')
    await findByText('+ Add')
  })

  it('updates the current interval when the user taps increase', async () => {
    render(<Home onStartWorkout={vi.fn()} />)

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

    render(<Home onStartWorkout={vi.fn()} />)

    const { findByText, queryByText } = getQueriesForElement(elementTree.root!)

    await findByText('3/3')
    expect(queryByText('Completed!')).toBeNull()
    await findByText('Exercise again on Monday')
  })

  it('recommends today plus two rest days when no sessions are complete', async () => {
    vi.setSystemTime(new Date('2024-01-01T12:00:00.000Z'))
    sharedProfileStore.save(buildProfile())

    render(<Home onStartWorkout={vi.fn()} />)

    const { findByText } = getQueriesForElement(elementTree.root!)

    await findByText('0/3')
    await findByText('Recommended days: run on Monday, Wednesday, Friday')
  })

  it('re-anchors the recommended days on the last session', async () => {
    sharedProfileStore.save(buildOneSessionProfile())

    render(<Home onStartWorkout={vi.fn()} />)

    const { findByText, queryByText } = getQueriesForElement(elementTree.root!)

    await findByText('1/3')
    await findByText('Recommended days: run on Wednesday, Friday')
    expect(queryByText(/Saturday/)).toBeNull()
  })

  it('updates the week section when the profile changes elsewhere', async () => {
    sharedProfileStore.save(buildProfile())

    render(<Home onStartWorkout={vi.fn()} />)

    const { findByText } = getQueriesForElement(elementTree.root!)
    await findByText('0/3')

    sharedProfileStore.save(buildOneSessionProfile())

    await findByText('1/3')
    await findByText('Recommended days: run on Wednesday, Friday')
  })

  it('shows only the last remaining session day after two sessions', async () => {
    const twoSessionProfile: TrainingProfile = {
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
          completedAt: '2024-01-02T12:00:00.000Z',
          level: { runSeconds: 30, walkSeconds: 120, intervalBlockSeconds: 1200 },
          intervals: [],
          totalDistanceMiles: 0,
        },
      ],
    }
    sharedProfileStore.save(twoSessionProfile)

    render(<Home onStartWorkout={vi.fn()} />)

    const { findByText } = getQueriesForElement(elementTree.root!)

    await findByText('2/3')
    await findByText('Recommended days: run on Thursday')
  })

  it('requests the workout tab when the start button is tapped', async () => {
    sharedProfileStore.save(buildProfile())

    const onStartWorkout = vi.fn()

    render(<Home onStartWorkout={onStartWorkout} />)

    const { findByText, getByText } = getQueriesForElement(elementTree.root!)
    await findByText('Start Workout')

    fireEvent.tap(getByText('Start Workout'))

    expect(onStartWorkout).toHaveBeenCalledTimes(1)
  })
})
