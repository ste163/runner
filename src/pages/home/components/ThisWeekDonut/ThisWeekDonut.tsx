import type { ReactElement } from '@lynx-js/react'

import { DonutGraph } from '../../../../components/DonutGraph/index.js'
import './ThisWeekDonut.css'
import { themeColors } from '../../../../theme.js'

type ThisWeekDonutProps = {
  completedCount: number
  totalCount: number
}

export const ThisWeekDonut = ({ completedCount, totalCount }: ThisWeekDonutProps): ReactElement => {
  const countLabel = `${completedCount}/${totalCount}`

  return (
    <DonutGraph
      size={88}
      radius={36}
      strokeWidth={10}
      fraction={totalCount > 0 ? completedCount / totalCount : 0}
      trackColor={themeColors.track}
      arcColor={themeColors.run}
    >
      <view className='thisWeekDonut__center'>
        <text className='thisWeekDonut__count'>{countLabel}</text>
      </view>
    </DonutGraph>
  )
}
