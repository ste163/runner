import type { ReactElement } from '@lynx-js/react'

import './WeekStrip.css'
import type { WeekDayView } from '../../../../domain/weekView.js'

type WeekStripProps = {
  days: WeekDayView[]
}

export const WeekStrip = ({ days }: WeekStripProps): ReactElement => (
  <view className='weekStrip'>
    {days.map((day) => (
      <view
        key={day.key}
        data-testid={`week-day-${day.key}-${day.state}`}
        className={`weekStrip__day weekStrip__day--${day.state}${
          day.isToday ? ' weekStrip__day--today' : ''
        }`}
      >
        <text className='weekStrip__label'>{day.label}</text>
      </view>
    ))}
  </view>
)
