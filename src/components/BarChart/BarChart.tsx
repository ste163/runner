import { useCallback, useState } from '@lynx-js/react'

import './BarChart.css'

type BarChartColor = 'primary' | 'secondary' | 'tertiary'

type BarChartProps = {
  label: string
  amountValue: string
  fillPercent: number
  color: BarChartColor
}

type LayoutEvent = {
  detail: {
    width: number
  }
}

const barChars = {
  complete: '█',
  empty: '░',
} as const

const colorClasses = {
  primary: 'barChart__bar--primary',
  secondary: 'barChart__bar--secondary',
  tertiary: 'barChart__bar--tertiary',
} as const

const buildBlockBar = (filledUnits: number, totalUnits: number): string =>
  `${barChars.complete.repeat(Math.max(0, filledUnits))}${barChars.empty.repeat(Math.max(0, totalUnits - filledUnits))}`

const clampPercent = (value: number): number => Math.max(0, Math.min(value, 100))

export const BarChart = ({
  amountValue,
  color,
  fillPercent,
  label,
}: BarChartProps): JSX.Element => {
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
      ? Math.max(12, Math.floor(chartWidth / blockCharWidth) - 1)
      : 30
  const filledUnits = Math.round((clampPercent(fillPercent) / 100) * estimatedUnits)
  const bar = buildBlockBar(filledUnits, estimatedUnits)

  return (
    <view className='barChart' bindlayout={handleChartLayout}>
      <view className='barChart__ruler' bindlayout={handleRulerLayout}>
        <text className='barChart__bar barChart__bar--measure'>██████████</text>
      </view>
      <view className='barChart__header'>
        <text className='barChart__label'>{label}</text>
        <text className='barChart__value'>{amountValue}</text>
      </view>
      <view className='barChart__barLine'>
        <text className={`barChart__bar ${colorClasses[color]}`}>{bar.slice(0, filledUnits)}</text>
        <text className='barChart__bar barChart__bar--muted'>{bar.slice(filledUnits)}</text>
      </view>
    </view>
  )
}
