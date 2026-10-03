import type { ReactElement } from '@lynx-js/react'

import { DonutGraph } from '../../../../components/DonutGraph/index.js'
import './CurrentIntervalDonut.css'
import { themeColors } from '../../../../theme.js'

type CurrentIntervalDonutProps = {
  runLabel: string
  walkLabel: string
  runPercent: number
}

export const CurrentIntervalDonut = ({
  runLabel,
  walkLabel,
  runPercent,
}: CurrentIntervalDonutProps): ReactElement => (
  <view className='currentIntervalDonut'>
    <DonutGraph
      size={260}
      radius={112}
      strokeWidth={24}
      fraction={runPercent / 100}
      trackColor={themeColors.walkMuted}
      arcColor={themeColors.run}
      animated
      durationMs={500}
    >
      <view className='currentIntervalDonut__center'>
        <text className='currentIntervalDonut__runLabel'>{runLabel}</text>
        <text className='currentIntervalDonut__walkLabel'>{walkLabel}</text>
      </view>
    </DonutGraph>
  </view>
)
