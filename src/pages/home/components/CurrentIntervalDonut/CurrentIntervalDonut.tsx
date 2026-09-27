import type { ReactElement } from '@lynx-js/react'

import './CurrentIntervalDonut.css'

type CurrentIntervalDonutProps = {
  runLabel: string
  walkLabel: string
  runPercent: number
}

const RADIUS = 112
const CENTER = 130
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const TRACK_COLOR = '#1b231c'
const RUN_COLOR = '#2dd35f'
const WALK_COLOR = '#f59e0b'
const STROKE_WIDTH = 24

const clampPercent = (value: number): number => Math.max(0, Math.min(value, 100))

const buildSvgContent = (runPercent: number): string => {
  const safePercent = clampPercent(runPercent)
  const runLength = ((CIRCUMFERENCE * safePercent) / 100).toFixed(2)
  const walkLength = ((CIRCUMFERENCE * (100 - safePercent)) / 100).toFixed(2)
  const gapLength = CIRCUMFERENCE.toFixed(2)
  const walkRotation = -90 + (safePercent / 100) * 360

  const runArc =
    safePercent > 0
      ? `<circle cx="${CENTER}" cy="${CENTER}" r="${RADIUS}" fill="none" stroke="${RUN_COLOR}" ` +
        `stroke-width="${STROKE_WIDTH}" stroke-linecap="round" ` +
        `stroke-dasharray="${runLength} ${gapLength}" transform="rotate(-90 ${CENTER} ${CENTER})"/>`
      : ''

  const walkArc =
    safePercent < 100
      ? `<circle cx="${CENTER}" cy="${CENTER}" r="${RADIUS}" fill="none" stroke="${WALK_COLOR}" ` +
        `stroke-width="${STROKE_WIDTH}" stroke-linecap="round" ` +
        `stroke-dasharray="${walkLength} ${gapLength}" ` +
        `transform="rotate(${walkRotation} ${CENTER} ${CENTER})"/>`
      : ''

  return (
    `<svg width="260" height="260" viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg">` +
    `<circle cx="${CENTER}" cy="${CENTER}" r="${RADIUS}" fill="none" stroke="${TRACK_COLOR}" ` +
    `stroke-width="${STROKE_WIDTH}"/>` +
    runArc +
    walkArc +
    `</svg>`
  )
}

export const CurrentIntervalDonut = ({
  runLabel,
  walkLabel,
  runPercent,
}: CurrentIntervalDonutProps): ReactElement => (
  <view className='currentIntervalDonut'>
    <view className='currentIntervalDonut__ring'>
      <svg content={buildSvgContent(runPercent)} style={{ width: '260px', height: '260px' }} />
      <view className='currentIntervalDonut__center'>
        <text className='currentIntervalDonut__runLabel'>{runLabel}</text>
        <text className='currentIntervalDonut__walkLabel'>{walkLabel}</text>
      </view>
    </view>
  </view>
)
