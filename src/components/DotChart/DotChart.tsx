import './DotChart.css'

type DotChartColor = 'primary' | 'secondary' | 'tertiary'

type DotChartProps = {
  label: string
  amountValue: string
  completedCount: number
  totalCount: number
  color: DotChartColor
}

const colorClasses = {
  primary: 'dotChart__dotGlyph--primary',
  secondary: 'dotChart__dotGlyph--secondary',
  tertiary: 'dotChart__dotGlyph--tertiary',
} as const

const clampCount = (value: number, totalCount: number): number =>
  Math.max(0, Math.min(value, totalCount))

const buildDotStates = (completedCount: number, totalCount: number): boolean[] =>
  Array.from({ length: totalCount }, (_, index) => index < clampCount(completedCount, totalCount))

export const DotChart = ({
  amountValue,
  color,
  completedCount,
  label,
  totalCount,
}: DotChartProps): JSX.Element => {
  const dotStates = buildDotStates(completedCount, totalCount)

  return (
    <view className='dotChart'>
      <view className='dotChart__header'>
        <text className='dotChart__label'>{label}</text>
        <text className='dotChart__value'>{amountValue}</text>
      </view>
      <view className='dotChart__dotLine'>
        {dotStates.map((isFilled, index) => (
          <view key={`dot-${index}`} className='dotChart__dot'>
            <text
              className={`dotChart__dotGlyph ${colorClasses[color]}${isFilled ? '' : ' dotChart__dotGlyph--muted'}`}
            >
              {isFilled ? '●' : '○'}
            </text>
          </view>
        ))}
      </view>
    </view>
  )
}
