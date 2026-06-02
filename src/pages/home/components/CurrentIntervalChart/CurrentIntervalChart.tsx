import './CurrentIntervalChart.css'

type CurrentIntervalChartProps = {
  runAmount: string
  walkAmount?: string
  runPercent: number
}

const clampPercent = (value: number): number => Math.max(0, Math.min(value, 100))

export const CurrentIntervalChart = ({
  runAmount,
  walkAmount,
  runPercent,
}: CurrentIntervalChartProps): JSX.Element => {
  const runBarPercent = clampPercent(runPercent)
  const walkBarPercent = 100 - runBarPercent

  return (
    <view className='currentIntervalChart'>
      <view className='currentIntervalChart__header'>
        <text className='currentIntervalChart__label currentIntervalChart__label--run'>Run</text>
        <text className='currentIntervalChart__label currentIntervalChart__label--walk'>Walk</text>
      </view>
      <view className='currentIntervalChart__barLine'>
        <view className='currentIntervalChart__barTrack'>
          <view
            className='currentIntervalChart__bar currentIntervalChart__bar--run'
            style={{ width: `${runBarPercent}%` }}
          />
          <view
            className='currentIntervalChart__bar currentIntervalChart__bar--walk'
            style={{ width: `${walkBarPercent}%` }}
          />
        </view>
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
