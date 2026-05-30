import '@testing-library/jest-dom'
import { getQueriesForElement, fireEvent, render } from '@lynx-js/react/testing-library'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as router from 'sparkling-navigation'

import { App } from './App.js'
import { sharedProfileStore } from '../../domain/profile.js'

vi.mock('sparkling-navigation', () => ({ open: vi.fn(), close: vi.fn() }))

const onboardingScheme =
  'hybrid://lynxview_page?bundle=onboarding.lynx.bundle&title=How%20It%20Works&screen_orientation=portrait'
const workoutScheme =
  'hybrid://lynxview_page?bundle=second.lynx.bundle&title=Workout&screen_orientation=portrait'

describe('App', () => {
  beforeEach(() => {
    sharedProfileStore.reset()
    vi.clearAllMocks()
  })

  it('renders the home screen and opens onboarding on first launch', async () => {
    const onMounted = vi.fn()

    render(<App onMounted={onMounted} />)

    expect(onMounted).toBeCalledTimes(1)

    const { findByText } = getQueriesForElement(elementTree.root!)
    await findByText('Runner')
    await findByText('Start Workout')

    expect(router.open).toHaveBeenCalledWith({ scheme: onboardingScheme }, expect.any(Function))
  })

  it('updates the current interval when the user taps increase', async () => {
    render(<App />)

    const { findByText, getByText } = getQueriesForElement(elementTree.root!)
    await findByText('Run 30s · Walk 2m 0s')

    fireEvent.tap(getByText('Increase 10%'))

    await findByText('Run 33s · Walk 1m 48s')
  })

  it('opens the workout page when the start button is tapped', async () => {
    render(<App />)

    const { findByText, getByText } = getQueriesForElement(elementTree.root!)
    await findByText('Start Workout')

    vi.clearAllMocks()
    fireEvent.tap(getByText('Start Workout'))

    expect(router.open).toHaveBeenCalledWith({ scheme: workoutScheme }, expect.any(Function))
  })
})
