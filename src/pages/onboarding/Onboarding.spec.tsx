import '@testing-library/jest-dom'
import { getQueriesForElement, fireEvent, render } from '@lynx-js/react/testing-library'
import { describe, expect, it, vi } from 'vitest'

import * as router from 'sparkling-navigation'

import { Onboarding } from './Onboarding.js'

vi.mock('sparkling-navigation', () => ({ open: vi.fn(), close: vi.fn() }))

describe('Onboarding', () => {
  it('renders guidance and closes on Got it', async () => {
    const onMounted = vi.fn()

    render(<Onboarding onMounted={onMounted} />)

    expect(onMounted).toBeCalledTimes(1)

    const { findByText, getByText } = getQueriesForElement(elementTree.root!)
    await findByText('How It Works')
    await findByText('Got it')

    fireEvent.tap(getByText('Got it'))

    expect(router.close).toHaveBeenCalledTimes(1)
  })
})
