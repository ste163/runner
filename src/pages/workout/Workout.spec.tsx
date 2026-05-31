import '@testing-library/jest-dom'
import { fireEvent, getQueriesForElement, render } from '@lynx-js/react/testing-library'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as router from 'sparkling-navigation'

import { Workout } from './Workout.js'
import { sharedProfileStore } from '../../domain/profile.js'
import type { TrainingProfile } from '../../domain/types.js'

vi.mock('sparkling-navigation', () => ({ close: vi.fn() }))

const haptics = {
  cancel: vi.fn(),
  vibrate: vi.fn(),
}

const buildWorkoutProfile = (): TrainingProfile => ({
  schemaVersion: 1,
  level: { intervalBlockSeconds: 1, runSeconds: 1, walkSeconds: 10 },
  sessions: [],
  window: { consecutiveMissed: 0, windowStart: '' },
})

const getWorkoutQueries = () => getQueriesForElement(elementTree.root!)

const startWorkout = async () => {
  const queries = getWorkoutQueries()

  await queries.findByText('Start Workout')
  fireEvent.tap(queries.getByText('Start Workout'))
  await queries.findByText('WARMUP')

  return queries
}

describe('Workout', () => {
  beforeEach(() => {
    sharedProfileStore.reset()
    sharedProfileStore.save(buildWorkoutProfile())
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('stops without saving', async () => {
    render(<Workout haptics={haptics} />)

    const queries = getWorkoutQueries()
    await queries.findByText('Start Workout')
    fireEvent.tap(queries.getByText('Start Workout'))
    await queries.findByText('WARMUP')

    fireEvent.tap(queries.getByText('Stop'))

    expect(haptics.cancel).toHaveBeenCalledTimes(1)
    expect(router.close).toHaveBeenCalledTimes(1)

    const profile = sharedProfileStore.loadOrCreate().profile
    expect(profile.sessions).toHaveLength(0)
  })

  it('shows warmup phase and start pulse', async () => {
    const onMounted = vi.fn()

    render(<Workout haptics={haptics} onMounted={onMounted} />)

    expect(onMounted).toBeCalledTimes(1)

    const queries = getWorkoutQueries()
    await queries.findByText('Start Workout')
    expect(queries.queryByText('WARMUP')).not.toBeInTheDocument()

    fireEvent.tap(queries.getByText('Start Workout'))

    await queries.findByText('WARMUP')
    await queries.findByText('5m 0s')
    await queries.findByText('Next up: RUN 1s')

    expect(haptics.vibrate).toHaveBeenCalledWith(500)
  })

  it('pauses and resumes the countdown', async () => {
    render(<Workout haptics={haptics} />)

    const { findByText, getByText } = await startWorkout()

    await findByText('Pause')
    await findByText('5m 0s')

    await vi.advanceTimersByTimeAsync(1000)
    await findByText('4m 59s')

    fireEvent.tap(getByText('Pause'))
    await findByText('Resume')

    await vi.advanceTimersByTimeAsync(3000)
    await findByText('4m 59s')

    fireEvent.tap(getByText('Resume'))
    await vi.advanceTimersByTimeAsync(1000)
    await findByText('4m 58s')
  })

  it('completes the workout, saves the session, and closes from the summary', async () => {
    render(<Workout haptics={haptics} />)

    const { findByText, getByText } = await startWorkout()

    await findByText('WARMUP')

    fireEvent.tap(getByText('Debug: complete workout'))
    await findByText('Workout complete')
    await findByText('Session saved. Close to return home.')
    await findByText('GPS unavailable yet. No interval breakdown recorded.')

    const profile = sharedProfileStore.loadOrCreate().profile
    expect(profile.sessions).toHaveLength(1)
    expect(profile.sessions[0]?.intervals).toHaveLength(0)
    expect(haptics.cancel).toHaveBeenCalledTimes(1)

    fireEvent.tap(getByText('Done'))

    expect(router.close).toHaveBeenCalledTimes(1)
  })
})
