import type { ReactElement } from '@lynx-js/react'

import './ThisWeekDonut.css'
import { themeColors } from '../../../../theme.js'

type ThisWeekDonutProps = {
  completedCount: number
  totalCount: number
}

const RADIUS = 36
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const STROKE_WIDTH = 10

const clampCount = (value: number, totalCount: number): number =>
  Math.max(0, Math.min(value, totalCount))

const buildSvgContent = (completedCount: number, totalCount: number): string => {
  const safeTotal = Math.max(totalCount, 1)
  const fraction = clampCount(completedCount, safeTotal) / safeTotal
  const arcLength = (CIRCUMFERENCE * fraction).toFixed(2)
  const gapLength = CIRCUMFERENCE.toFixed(2)
  const progressCircle =
    fraction <= 0
      ? ''
      : `<circle cx="44" cy="44" r="${RADIUS}" fill="none" stroke="${themeColors.run}" ` +
        `stroke-width="${STROKE_WIDTH}" stroke-linecap="round" ` +
        `stroke-dasharray="${arcLength} ${gapLength}" transform="rotate(-90 44 44)"/>`

  return (
    `<svg width="88" height="88" viewBox="0 0 88 88" xmlns="http://www.w3.org/2000/svg">` +
    `<circle cx="44" cy="44" r="${RADIUS}" fill="none" stroke="${themeColors.track}" ` +
    `stroke-width="${STROKE_WIDTH}"/>` +
    progressCircle +
    `</svg>`
  )
}

export const ThisWeekDonut = ({ completedCount, totalCount }: ThisWeekDonutProps): ReactElement => {
  const countLabel = `${completedCount}/${totalCount}`

  return (
    <view className='thisWeekDonut__ring'>
      <svg
        content={buildSvgContent(completedCount, totalCount)}
        style={{ width: '88px', height: '88px' }}
      />
      <view className='thisWeekDonut__center'>
        <text className='thisWeekDonut__count'>{countLabel}</text>
      </view>
    </view>
  )
}
