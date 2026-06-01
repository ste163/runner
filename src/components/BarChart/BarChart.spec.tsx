import '@testing-library/jest-dom'
import { getQueriesForElement, render } from '@lynx-js/react/testing-library'
import { describe, expect, it } from 'vitest'

import { BarChart } from './BarChart.js'

describe('BarChart', () => {
  it('renders a labeled fill row', async () => {
    render(<BarChart amountValue='33s' color='primary' fillPercent={50} label='Run' />)

    const { findByText } = getQueriesForElement(elementTree.root!)

    await findByText('Run')
    await findByText('33s')
    expect(
      (await getQueriesForElement(elementTree.root!).findAllByText(/[█░]/)).length
    ).toBeGreaterThan(0)
  })
})
