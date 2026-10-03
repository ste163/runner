import '@testing-library/jest-dom'
import { fireEvent, getQueriesForElement, render } from '@lynx-js/react/testing-library'
import { describe, expect, it, vi } from 'vitest'

import { BottomNav } from './BottomNav.js'

describe('BottomNav', () => {
  it('renders the icon tabs and calls callbacks on tap', async () => {
    const onHome = vi.fn()
    const onWorkout = vi.fn()
    const onData = vi.fn()

    render(<BottomNav activeTab='home' onHome={onHome} onWorkout={onWorkout} onData={onData} />)

    const { findByTestId, findByText } = getQueriesForElement(elementTree.root!)

    expect(await findByText('Home')).toBeInTheDocument()
    expect(await findByText('Workout')).toBeInTheDocument()
    expect(await findByText('Data')).toBeInTheDocument()

    const homeTab = await findByTestId('bottomNav-home')
    const workoutTab = await findByTestId('bottomNav-workout')
    const dataTab = await findByTestId('bottomNav-data')

    fireEvent.tap(homeTab)
    fireEvent.tap(workoutTab)
    fireEvent.tap(dataTab)

    expect(onHome).toHaveBeenCalledTimes(1)
    expect(onWorkout).toHaveBeenCalledTimes(1)
    expect(onData).toHaveBeenCalledTimes(1)
  })
})
