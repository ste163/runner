import type { ReactElement } from '@lynx-js/react'

import './ThisWeekDonut.css'

type ThisWeekDonutProps = {
  completedCount: number
  totalCount: number
  subtitle: string
}

const RADIUS = 36
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const TRACK_COLOR = '#1b231c'
const ARC_COLOR = '#2dd35f'
const STROKE_WIDTH = 10

const clampCount = (value: number, totalCount: number): number =>
  Math.max(0, Math.min(value, totalCount))

const buildSvgContent = (completedCount: number, totalCount: number): string => {
  const safeTotal = Math.max(totalCount, 1)
  const fraction = clampCount(completedCount, safeTotal) / safeTotal
  const arcLength = (CIRCUMFERENCE * fraction).toFixed(2)
  const gapLength = CIRCUMFERENCE.toFixed(2)

  return (
    `<svg width="88" height="88" viewBox="0 0 88 88" xmlns="http://www.w3.org/2000/svg">` +
    `<circle cx="44" cy="44" r="${RADIUS}" fill="none" stroke="${TRACK_COLOR}" ` +
    `stroke-width="${STROKE_WIDTH}"/>` +
    `<circle cx="44" cy="44" r="${RADIUS}" fill="none" stroke="${ARC_COLOR}" ` +
    `stroke-width="${STROKE_WIDTH}" stroke-linecap="round" ` +
    `stroke-dasharray="${arcLength} ${gapLength}" transform="rotate(-90 44 44)"/>` +
    `</svg>`
  )
}

export const ThisWeekDonut = ({
  completedCount,
  totalCount,
  subtitle,
}: ThisWeekDonutProps): ReactElement => {
  const countLabel = `${completedCount}/${totalCount}`

  return (
    <view className='thisWeekDonut'>
      <view className='thisWeekDonut__text'>
        <text className='thisWeekDonut__label'>This Week</text>
        <text className='thisWeekDonut__detail'>{subtitle}</text>
      </view>
      <view className='thisWeekDonut__ring'>
        <svg
          content={buildSvgContent(completedCount, totalCount)}
          style={{ width: '88px', height: '88px' }}
        />
        <view className='thisWeekDonut__center'>
          <text className='thisWeekDonut__count'>{countLabel}</text>
        </view>
      </view>
    </view>
  )
}
