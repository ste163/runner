import '@testing-library/jest-dom'
import { fireEvent, getQueriesForElement, render } from '@lynx-js/react/testing-library'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Home } from './Home.js'
import { sharedProfileStore } from '../../domain/profile.js'
import type { Session, TrainingProfile } from '../../domain/types.js'

const MONDAY = new Date(2024, 0, 1, 12)

const buildDay = (dayOffset: number): Date => new Date(2024, 0, 1 + dayOffset, 12)

const buildSession = (id: string, completedAt: Date): Session => ({
  id,
  completedAt: completedAt.toISOString(),
  level: { runSeconds: 30, walkSeconds: 120, intervalBlockSeconds: 1200 },
  intervals: [],
  totalDistanceMiles: 0,
})

const buildProfile = (): TrainingProfile => ({
  schemaVersion: 1,
  level: { runSeconds: 30, walkSeconds: 120, intervalBlockSeconds: 1200 },
  window: { windowStart: '', consecutiveMissed: 0 },
  sessions: [],
})

const buildOneSessionProfile = (): TrainingProfile => ({
  ...buildProfile(),
  window: { windowStart: MONDAY.toISOString(), consecutiveMissed: 0 },
  sessions: [buildSession('session-1', buildDay(0))],
})

const buildCompletedWeekProfile = (): TrainingProfile => ({
  ...buildProfile(),
  window: { windowStart: MONDAY.toISOString(), consecutiveMissed: 0 },
  sessions: [
    buildSession('session-1', buildDay(0)),
    buildSession('session-2', buildDay(2)),
    buildSession('session-3', buildDay(4)),
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

    const { findByText, queryByText, getByTestId } = getQueriesForElement(elementTree.root!)

    expect(queryByText('Runner')).toBeNull()
    expect(queryByText('3 sessions. 7-day windows.')).toBeNull()
    await findByText('This Week')
    await findByText('Current interval')
    await findByText('Run 0:30')
    await findByText('Walk 1:30')
    await findByText('0/3')
    expect(queryByText('Decrease 10%')).toBeNull()
    expect(queryByText('Increase 10%')).toBeNull()
    fireEvent.tap(getByTestId('adjust-info'))
    await findByText(
      'Run intervals increase by 10% dynamically after three completed runs, or you can adjust intervals manually to suit your needs.'
    )
    await findByText('Decrease 10%')
    await findByText('Increase 10%')
  })

  it('updates the current interval when the user taps increase', async () => {
    render(<Home onStartWorkout={vi.fn()} />)

    const { findByText, getByTestId, getByText } = getQueriesForElement(elementTree.root!)
    await findByText('Run 0:30')

    fireEvent.tap(getByTestId('adjust-info'))
    fireEvent.tap(getByText('Increase 10%'))

    await findByText('Run 0:33')
    await findByText('Walk 1:30')
  })

  it('shows a completed week and the next cycle day after three sessions', async () => {
    vi.setSystemTime(buildDay(5))
    sharedProfileStore.save(buildCompletedWeekProfile())

    render(<Home onStartWorkout={vi.fn()} />)

    const { findByText, queryByText, getByTestId } = getQueriesForElement(elementTree.root!)

    await findByText('3/3')
    expect(queryByText('Completed!')).toBeNull()
    await findByText('Run again on Monday')
    expect(getByTestId('week-day-0-completed')).toBeInTheDocument()
    expect(getByTestId('week-day-2-completed')).toBeInTheDocument()
    expect(getByTestId('week-day-4-completed')).toBeInTheDocument()
  })

  it('shows the fresh week plan and says run today', async () => {
    vi.setSystemTime(buildDay(2))
    sharedProfileStore.save(buildProfile())

    render(<Home onStartWorkout={vi.fn()} />)

    const { findByText, getByTestId } = getQueriesForElement(elementTree.root!)

    await findByText('0/3')
    await findByText('Run today')
    expect(getByTestId('week-day-2-planned')).toBeInTheDocument()
    expect(getByTestId('week-day-4-planned')).toBeInTheDocument()
    expect(getByTestId('week-day-6-planned')).toBeInTheDocument()
  })

  it('recommends the next planned day after the first run', async () => {
    vi.setSystemTime(buildDay(1))
    sharedProfileStore.save(buildOneSessionProfile())

    render(<Home onStartWorkout={vi.fn()} />)

    const { findByText, getByTestId } = getQueriesForElement(elementTree.root!)

    await findByText('1/3')
    await findByText('Run again on Wednesday')
    expect(getByTestId('week-day-0-completed')).toBeInTheDocument()
    expect(getByTestId('week-day-2-planned')).toBeInTheDocument()
    expect(getByTestId('week-day-4-planned')).toBeInTheDocument()
  })

  it('says run today after a missed planned day', async () => {
    vi.setSystemTime(buildDay(3))
    sharedProfileStore.save(buildOneSessionProfile())

    render(<Home onStartWorkout={vi.fn()} />)

    const { findByText, getByTestId } = getQueriesForElement(elementTree.root!)

    await findByText('1/3')
    await findByText('Run today')
    expect(getByTestId('week-day-2-idle')).toBeInTheDocument()
    expect(getByTestId('week-day-3-planned')).toBeInTheDocument()
    expect(getByTestId('week-day-5-planned')).toBeInTheDocument()
  })

  it('updates the week section when the profile changes elsewhere', async () => {
    vi.setSystemTime(buildDay(1))
    sharedProfileStore.save(buildProfile())

    render(<Home onStartWorkout={vi.fn()} />)

    const { findByText } = getQueriesForElement(elementTree.root!)
    await findByText('0/3')
    await findByText('Run today')

    sharedProfileStore.save(buildOneSessionProfile())

    await findByText('1/3')
    await findByText('Run again on Wednesday')
  })

  it('plans from the last run after two sessions', async () => {
    const twoSessionProfile: TrainingProfile = {
      ...buildProfile(),
      window: { windowStart: MONDAY.toISOString(), consecutiveMissed: 0 },
      sessions: [buildSession('session-1', buildDay(0)), buildSession('session-2', buildDay(1))],
    }
    vi.setSystemTime(buildDay(2))
    sharedProfileStore.save(twoSessionProfile)

    render(<Home onStartWorkout={vi.fn()} />)

    const { findByText, getByTestId } = getQueriesForElement(elementTree.root!)

    await findByText('2/3')
    await findByText('Run again on Thursday')
    expect(getByTestId('week-day-3-planned')).toBeInTheDocument()
  })

  it('starts a fresh week plan after the window expires', async () => {
    vi.setSystemTime(buildDay(7))
    sharedProfileStore.save(buildCompletedWeekProfile())

    render(<Home onStartWorkout={vi.fn()} />)

    const { findByText, getByTestId } = getQueriesForElement(elementTree.root!)

    await findByText('Run today')
    expect(getByTestId('week-day-0-planned')).toBeInTheDocument()
    expect(getByTestId('week-day-2-planned')).toBeInTheDocument()
    expect(getByTestId('week-day-4-planned')).toBeInTheDocument()
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
