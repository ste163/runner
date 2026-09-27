import type { ReactElement } from '@lynx-js/react'

type SvgDonutProps = {
  progress: number
}

const RADIUS = 50
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const TRACK_COLOR = '#1b231c'
const ARC_COLOR = '#2dd35f'
const STROKE_WIDTH = 12

const clampProgress = (value: number): number => Math.max(0, Math.min(value, 1))

const buildSvgContent = (progress: number): string => {
  const arcLength = (CIRCUMFERENCE * clampProgress(progress)).toFixed(2)
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

export const SvgDonut = ({ progress }: SvgDonutProps): ReactElement => (
  <svg content={buildSvgContent(progress)} style={{ width: '120px', height: '120px' }} />
)
