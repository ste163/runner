import '@testing-library/jest-dom'
import { fireEvent, getQueriesForElement, render } from '@lynx-js/react/testing-library'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import * as router from 'sparkling-navigation'
import { AppLayout } from './AppLayout.js'

vi.mock('sparkling-navigation', () => ({ open: vi.fn() }))

describe('AppLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders children with BottomNav on home page', async () => {
    render(
      <AppLayout initialPage='home'>
        <text>Test Content</text>
      </AppLayout>
    )

    const { findByText } = getQueriesForElement(elementTree.root!)

    await findByText('Test Content')
    await findByText('Home')
    await findByText('Workout')
  })

  it('renders children with BottomNav on workout page', async () => {
    render(
      <AppLayout initialPage='workout'>
        <text>Workout Content</text>
      </AppLayout>
    )

    const { findByText } = getQueriesForElement(elementTree.root!)

    await findByText('Workout Content')
    await findByText('Home')
    await findByText('Workout')
  })

  it('renders children with BottomNav on onboarding page', async () => {
    render(
      <AppLayout initialPage='onboarding'>
        <text>Onboarding Content</text>
      </AppLayout>
    )

    const { findByText } = getQueriesForElement(elementTree.root!)

    await findByText('Onboarding Content')
    await findByText('Home')
    await findByText('Workout')
  })

  it('renders children with BottomNav on graphs page', async () => {
    render(
      <AppLayout initialPage='graphs'>
        <text>Graphs Content</text>
      </AppLayout>
    )

    const { findByText } = getQueriesForElement(elementTree.root!)

    await findByText('Graphs Content')
    await findByText('Home')
    await findByText('Workout')
  })

  it('does NOT render BottomNav on activeWorkout page', async () => {
    render(
      <AppLayout initialPage='activeWorkout'>
        <text>Active Workout Content</text>
      </AppLayout>
    )

    const { findByText, queryByText } = getQueriesForElement(elementTree.root!)

    await findByText('Active Workout Content')
    expect(queryByText('Home')).toBeNull()
    expect(queryByText('Workout')).toBeNull()
  })

  it('calls router.open when Home button is clicked', async () => {
    render(
      <AppLayout initialPage='workout'>
        <text>Content</text>
      </AppLayout>
    )

    const { findByText } = getQueriesForElement(elementTree.root!)
    const homeButton = await findByText('Home')
    fireEvent.tap(homeButton)

    expect(router.open).toHaveBeenCalled()
  })

  it('calls router.open when Workout button is clicked', async () => {
    render(
      <AppLayout initialPage='home'>
        <text>Content</text>
      </AppLayout>
    )

    const { findByText } = getQueriesForElement(elementTree.root!)
    const workoutButton = await findByText('Workout')
    fireEvent.tap(workoutButton)

    expect(router.open).toHaveBeenCalled()
  })
})
