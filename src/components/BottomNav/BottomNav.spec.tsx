import '@testing-library/jest-dom'
import { fireEvent, getQueriesForElement, render } from '@lynx-js/react/testing-library'
import { describe, expect, it, vi } from 'vitest'

import { BottomNav } from './BottomNav.js'

describe('BottomNav', () => {
  it('renders the icon tabs and calls callbacks on tap', async () => {
    const onHome = vi.fn()
    const onWorkout = vi.fn()

    render(<BottomNav activeTab='home' onHome={onHome} onWorkout={onWorkout} />)

    const { findByTestId, findByText } = getQueriesForElement(elementTree.root!)

    expect(await findByText('Home')).toBeInTheDocument()
    expect(await findByText('Workout')).toBeInTheDocument()
    expect(await findByText('Settings')).toBeInTheDocument()

    const homeTab = await findByTestId('bottomNav-home')
    const workoutTab = await findByTestId('bottomNav-workout')

    fireEvent.tap(homeTab)
    fireEvent.tap(workoutTab)

    expect(onHome).toHaveBeenCalledTimes(1)
    expect(onWorkout).toHaveBeenCalledTimes(1)
  })
})
