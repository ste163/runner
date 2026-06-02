import '@testing-library/jest-dom'
import { fireEvent, getQueriesForElement, render } from '@lynx-js/react/testing-library'
import { describe, expect, it, vi } from 'vitest'

import { BottomNav } from './BottomNav.js'

describe('BottomNav', () => {
  it('renders the three tabs and triggers callbacks', async () => {
    const onHome = vi.fn()
    const onWorkout = vi.fn()
    const onSettings = vi.fn()

    render(
      <BottomNav
        activeTab='workout'
        onHome={onHome}
        onSettings={onSettings}
        onWorkout={onWorkout}
      />
    )

    const { findByText } = getQueriesForElement(elementTree.root!)

    await findByText('Home')
    await findByText('Workout')
    await findByText('Settings')

    fireEvent.tap(await findByText('Home'))
    fireEvent.tap(await findByText('Workout'))
    fireEvent.tap(await findByText('Settings'))

    expect(onHome).toHaveBeenCalledTimes(1)
    expect(onWorkout).toHaveBeenCalledTimes(1)
    expect(onSettings).toHaveBeenCalledTimes(1)
  })
})
