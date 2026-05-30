import '@testing-library/jest-dom'
import { getQueriesForElement, fireEvent, render } from '@lynx-js/react/testing-library'
import { describe, expect, it, vi } from 'vitest'

import * as router from 'sparkling-navigation'

import { App } from './App.js'

vi.mock('sparkling-navigation', () => ({ open: vi.fn(), close: vi.fn() }))

describe('App', () => {
  it('renders onboarding guidance', async () => {
    const onMounted = vi.fn()

    render(<App onMounted={onMounted} />)

    expect(onMounted).toBeCalledTimes(1)

    const { findByText } = getQueriesForElement(elementTree.root!)
    await findByText('How It Works')
    await findByText('Got it')
  })

  it('closes when the user taps Got it', async () => {
    render(<App />)

    const { findByText, getByText } = getQueriesForElement(elementTree.root!)
    await findByText('Got it')

    fireEvent.tap(getByText('Got it'))

    expect(router.close).toHaveBeenCalledTimes(1)
  })
})
