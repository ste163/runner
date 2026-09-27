import '@testing-library/jest-dom'
import { getQueriesForElement, fireEvent, render } from '@lynx-js/react/testing-library'
import { describe, expect, it, vi } from 'vitest'

import { Onboarding } from './Onboarding.js'

describe('Onboarding', () => {
  it('renders guidance and closes on Got it', async () => {
    const onMounted = vi.fn()
    const onClose = vi.fn()

    render(<Onboarding onMounted={onMounted} onClose={onClose} />)

    expect(onMounted).toBeCalledTimes(1)

    const { findByText, getByText } = getQueriesForElement(elementTree.root!)
    await findByText('How It Works')
    await findByText('Got it')

    fireEvent.tap(getByText('Got it'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
