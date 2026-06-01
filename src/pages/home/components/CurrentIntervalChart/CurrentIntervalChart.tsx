import { useCallback, useState } from '@lynx-js/react'

import './CurrentIntervalChart.css'

type CurrentIntervalChartProps = {
  runAmount: string
  walkAmount?: string
  runPercent: number
}

type LayoutEvent = {
  detail: {
    width: number
  }
}

const clampPercent = (value: number): number => Math.max(0, Math.min(value, 100))

const buildFillUnits = (runPercent: number, totalUnits: number): number =>
  Math.round((clampPercent(runPercent) / 100) * totalUnits)

const buildFillBar = (totalUnits: number): string => '█'.repeat(Math.max(0, totalUnits))

export const CurrentIntervalChart = ({
  runAmount,
  walkAmount,
  runPercent,
}: CurrentIntervalChartProps): JSX.Element => {
  const [chartWidth, setChartWidth] = useState(0)
  const [blockCharWidth, setBlockCharWidth] = useState(0)

  const handleChartLayout = useCallback((event: LayoutEvent): void => {
    if (event.detail.width > 0) {
      setChartWidth(event.detail.width)
    }
  }, [])

  const handleRulerLayout = useCallback((event: LayoutEvent): void => {
    if (event.detail.width > 0) {
      setBlockCharWidth(event.detail.width / 10)
    }
  }, [])

  const estimatedUnits =
    chartWidth > 0 && blockCharWidth > 0
      ? Math.max(42, Math.floor(chartWidth / blockCharWidth) + 10)
      : 42
  const runUnits = buildFillUnits(runPercent, estimatedUnits)
  const bar = buildFillBar(estimatedUnits)

  return (
    <view className='currentIntervalChart' bindlayout={handleChartLayout}>
      <view className='currentIntervalChart__ruler' bindlayout={handleRulerLayout}>
        <text className='currentIntervalChart__measure'>██████████</text>
      </view>
      <view className='currentIntervalChart__header'>
        <text className='currentIntervalChart__label currentIntervalChart__label--run'>Run</text>
        <text className='currentIntervalChart__label currentIntervalChart__label--walk'>Walk</text>
      </view>
      <view className='currentIntervalChart__barLine'>
        <text className='currentIntervalChart__bar currentIntervalChart__bar--run'>
          {bar.slice(0, runUnits)}
        </text>
        <text className='currentIntervalChart__bar currentIntervalChart__bar--walk'>
          {bar.slice(runUnits)}
        </text>
      </view>
      <view className='currentIntervalChart__footer'>
        <text className='currentIntervalChart__amount currentIntervalChart__amount--run'>
          {runAmount}
        </text>
        {walkAmount ? (
          <text className='currentIntervalChart__amount currentIntervalChart__amount--walk'>
            {walkAmount}
          </text>
        ) : null}
      </view>
    </view>
  )
}
