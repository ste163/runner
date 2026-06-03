import '@testing-library/jest-dom'
import { fireEvent, getQueriesForElement, render } from '@lynx-js/react/testing-library'
import { describe, expect, it, vi } from 'vitest'

import { BottomNav } from './BottomNav.js'

describe('BottomNav', () => {
  it('renders the tabs and calls callbacks on tap', async () => {
    const onHome = vi.fn()
    const onWorkout = vi.fn()

    render(<BottomNav activeTab='home' onHome={onHome} onWorkout={onWorkout} />)

    const { findByText } = getQueriesForElement(elementTree.root!)

    await findByText('Home')
    await findByText('Workout')

    fireEvent.tap(await findByText('Home'))
    fireEvent.tap(await findByText('Workout'))

    expect(onHome).toHaveBeenCalledTimes(1)
    expect(onWorkout).toHaveBeenCalledTimes(1)
  })
})
