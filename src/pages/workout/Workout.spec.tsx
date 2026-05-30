import '@testing-library/jest-dom'
import { fireEvent, getQueriesForElement, render } from '@lynx-js/react/testing-library'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as router from 'sparkling-navigation'

import { Workout } from './Workout.js'
import { sharedProfileStore } from '../../domain/profile.js'
import type { TrainingProfile } from '../../domain/types.js'

vi.mock('sparkling-navigation', () => ({ close: vi.fn() }))

const buildWorkoutProfile = (): TrainingProfile => ({
  schemaVersion: 1,
  level: { intervalBlockSeconds: 1, runSeconds: 1, walkSeconds: 10 },
  sessions: [],
  window: { consecutiveMissed: 0, windowStart: '' },
})

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

  it('renders the workout timer and start pulse', async () => {
    const haptics = {
      cancel: vi.fn(),
      vibrate: vi.fn(),
    }
    const onMounted = vi.fn()

    render(<Workout haptics={haptics} onMounted={onMounted} />)

    expect(onMounted).toBeCalledTimes(1)

    const { findByText, getByText, queryByText } = getQueriesForElement(elementTree.root!)
    await findByText('Start Workout')
    expect(queryByText('WARMUP')).not.toBeInTheDocument()

    fireEvent.tap(getByText('Start Workout'))

    await findByText('WARMUP')
    await findByText('5m 0s')
    await findByText('Next up: RUN 1s')

    expect(haptics.vibrate).toHaveBeenCalledWith(500)
  })

  it('pauses and resumes the countdown', async () => {
    const haptics = {
      cancel: vi.fn(),
      vibrate: vi.fn(),
    }

    render(<Workout haptics={haptics} />)

    const { findByText, getByText } = getQueriesForElement(elementTree.root!)
    await findByText('Start Workout')

    fireEvent.tap(getByText('Start Workout'))

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
    const haptics = {
      cancel: vi.fn(),
      vibrate: vi.fn(),
    }

    render(<Workout haptics={haptics} />)

    const { findByText, getByText } = getQueriesForElement(elementTree.root!)
    await findByText('Start Workout')

    fireEvent.tap(getByText('Start Workout'))

    await findByText('WARMUP')

    await vi.advanceTimersByTimeAsync(601_000)
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

  it('stops without saving the workout', async () => {
    const haptics = {
      cancel: vi.fn(),
      vibrate: vi.fn(),
    }

    render(<Workout haptics={haptics} />)

    const { findByText, getByText } = getQueriesForElement(elementTree.root!)
    await findByText('Start Workout')

    fireEvent.tap(getByText('Start Workout'))

    await findByText('WARMUP')

    fireEvent.tap(getByText('Stop'))

    expect(haptics.cancel).toHaveBeenCalledTimes(1)
    expect(router.close).toHaveBeenCalledTimes(1)

    const profile = sharedProfileStore.loadOrCreate().profile
    expect(profile.sessions).toHaveLength(0)
  })
})
