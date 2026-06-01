import '@testing-library/jest-dom'
import { getQueriesForElement, render } from '@lynx-js/react/testing-library'
import { describe, expect, it } from 'vitest'

import { DotChart } from './DotChart.js'

describe('DotChart', () => {
  it('renders a larger dot row', async () => {
    render(
      <DotChart
        amountValue='2/3 completed'
        color='primary'
        completedCount={2}
        label='Week'
        totalCount={3}
      />
    )

    const { findByText, findAllByText } = getQueriesForElement(elementTree.root!)

    await findByText('Week')
    await findByText('2/3 completed')
    expect((await findAllByText('●')).length).toBe(2)
    expect((await findAllByText('○')).length).toBe(1)
  })
})
