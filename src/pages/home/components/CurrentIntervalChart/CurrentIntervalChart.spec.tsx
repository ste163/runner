import '@testing-library/jest-dom'
import { getQueriesForElement, render } from '@lynx-js/react/testing-library'
import { describe, it } from 'vitest'

import { CurrentIntervalChart } from './CurrentIntervalChart.js'

describe('CurrentIntervalChart', () => {
  it('renders a single run/walk bar with endpoint labels', async () => {
    render(<CurrentIntervalChart runAmount='30s' runPercent={25} walkAmount='2m 0s' />)

    const { findByText } = getQueriesForElement(elementTree.root!)

    await findByText('Run')
    await findByText('Walk')
    await findByText('30s')
    await findByText('2m 0s')
  })
})
