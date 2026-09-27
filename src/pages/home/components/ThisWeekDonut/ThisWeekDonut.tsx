import type { ReactElement } from '@lynx-js/react'

import './ThisWeekDonut.css'

type ThisWeekDonutProps = {
  completedCount: number
  totalCount: number
  detail?: string
}

const RADIUS = 50
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const TRACK_COLOR = '#1b231c'
const ARC_COLOR = '#2dd35f'
const STROKE_WIDTH = 12

const clampCount = (value: number, totalCount: number): number =>
  Math.max(0, Math.min(value, totalCount))

const buildSvgContent = (completedCount: number, totalCount: number): string => {
  const safeTotal = Math.max(totalCount, 1)
  const fraction = clampCount(completedCount, safeTotal) / safeTotal
  const arcLength = (CIRCUMFERENCE * fraction).toFixed(2)
  const gapLength = CIRCUMFERENCE.toFixed(2)

  return (
    `<svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">` +
    `<circle cx="60" cy="60" r="${RADIUS}" fill="none" stroke="${TRACK_COLOR}" ` +
    `stroke-width="${STROKE_WIDTH}"/>` +
    `<circle cx="60" cy="60" r="${RADIUS}" fill="none" stroke="${ARC_COLOR}" ` +
    `stroke-width="${STROKE_WIDTH}" stroke-linecap="round" ` +
    `stroke-dasharray="${arcLength} ${gapLength}" transform="rotate(-90 60 60)"/>` +
    `</svg>`
  )
}

export const ThisWeekDonut = ({
  completedCount,
  totalCount,
  detail,
}: ThisWeekDonutProps): ReactElement => {
  const countLabel = `${completedCount}/${totalCount}`

  return (
    <view className='thisWeekDonut'>
      <text className='thisWeekDonut__label'>This Week</text>
      <view className='thisWeekDonut__ring'>
        <svg
          content={buildSvgContent(completedCount, totalCount)}
          style={{ width: '120px', height: '120px' }}
        />
        <view className='thisWeekDonut__center'>
          <text className='thisWeekDonut__count'>{countLabel}</text>
        </view>
      </view>
      {detail ? <text className='thisWeekDonut__detail'>{detail}</text> : null}
    </view>
  )
}
