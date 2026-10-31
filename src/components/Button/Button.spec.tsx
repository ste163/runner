import '@testing-library/jest-dom'
import { fireEvent, getQueriesForElement, render } from '@lynx-js/react/testing-library'
import { describe, expect, it, vi } from 'vitest'

import { Button } from '@/components/Button/Button.js'

describe('Button', () => {
  it('renders the label and fires onTap when pressed', async () => {
    const onTap = vi.fn()

    render(<Button label='Start workout' onTap={onTap} />)

    const { findByText } = getQueriesForElement(elementTree.root!)

    fireEvent.tap(await findByText('Start workout'))

    expect(onTap).toHaveBeenCalledTimes(1)
  })

  it('renders the icon branch and still fires onTap', async () => {
    const onTap = vi.fn()
    const icon =
      '<svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2v20"/></svg>'

    render(<Button label='Save' onTap={onTap} icon={icon} />)

    const { findByText } = getQueriesForElement(elementTree.root!)

    fireEvent.tap(await findByText('Save'))

    expect(onTap).toHaveBeenCalledTimes(1)
  })
})
