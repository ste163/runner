import '@testing-library/jest-dom'
import { fireEvent, getQueriesForElement, render } from '@lynx-js/react/testing-library'
import { describe, expect, it, vi } from 'vitest'

import { Pressable } from '@/components/Pressable/Pressable.js'

describe('Pressable', () => {
  it('fires onTap when pressed', async () => {
    const onTap = vi.fn()

    render(
      <Pressable onTap={onTap}>
        <text>Tap target</text>
      </Pressable>
    )

    const { findByText } = getQueriesForElement(elementTree.root!)

    fireEvent.tap(await findByText('Tap target'))

    expect(onTap).toHaveBeenCalledTimes(1)
  })

  it('renders children and exposes the testId', async () => {
    render(
      <Pressable testId='pressable-root'>
        <text>Inner</text>
      </Pressable>
    )

    const { findByTestId, findByText } = getQueriesForElement(elementTree.root!)

    expect(await findByText('Inner')).toBeInTheDocument()
    expect(await findByTestId('pressable-root')).toBeInTheDocument()
  })
})
