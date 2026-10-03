import { useCallback, useEffect, useRef, useState, type ReactElement } from '@lynx-js/react'

import './CurrentIntervalDonut.css'
import { themeColors } from '../../../../theme.js'

type CurrentIntervalDonutProps = {
  runLabel: string
  walkLabel: string
  runPercent: number
}

const RADIUS = 112
const CENTER = 130
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const STROKE_WIDTH = 24
const ANIMATION_FRAME_MS = 8
const ANIMATION_DURATION_MS = 500

const clampPercent = (value: number): number => Math.max(0, Math.min(value, 100))

const easeInOutQuad = (progress: number): number =>
  progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress

const buildSvgContent = (runPercent: number): string => {
  const safePercent = clampPercent(runPercent)
  const runLength = (CIRCUMFERENCE * safePercent) / 100
  const gapLength = CIRCUMFERENCE.toFixed(2)

  const runArc =
    runLength > 0
      ? `<circle cx="${CENTER}" cy="${CENTER}" r="${RADIUS}" fill="none" stroke="${themeColors.run}" ` +
        `stroke-width="${STROKE_WIDTH}" stroke-linecap="round" ` +
        `stroke-dasharray="${runLength.toFixed(2)} ${gapLength}" transform="rotate(-90 ${CENTER} ${CENTER})"/>`
      : ''

  return (
    `<svg width="260" height="260" viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg">` +
    `<circle cx="${CENTER}" cy="${CENTER}" r="${RADIUS}" fill="none" stroke="${themeColors.walkMuted}" ` +
    `stroke-width="${STROKE_WIDTH}"/>` +
    runArc +
    `</svg>`
  )
}

export const CurrentIntervalDonut = ({
  runLabel,
  walkLabel,
  runPercent,
}: CurrentIntervalDonutProps): ReactElement => {
  const [displayedPercent, setDisplayedPercent] = useState(runPercent)
  const displayedPercentRef = useRef(runPercent)
  const targetPercentRef = useRef(runPercent)
  const animationStartedAtRef = useRef(0)
  const animationFromRef = useRef(runPercent)
  const animationFrameRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopAnimation = useCallback((): void => {
    if (animationFrameRef.current !== null) {
      clearInterval(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  const applyPercent = useCallback((percent: number): void => {
    displayedPercentRef.current = percent
    setDisplayedPercent(percent)
  }, [])

  useEffect(() => {
    return () => stopAnimation()
  }, [stopAnimation])

  useEffect(() => {
    targetPercentRef.current = runPercent

    if (Math.abs(runPercent - displayedPercentRef.current) < 0.01) {
      stopAnimation()
      applyPercent(runPercent)
      return
    }

    animationFromRef.current = displayedPercentRef.current
    animationStartedAtRef.current = Date.now()
    stopAnimation()

    animationFrameRef.current = setInterval(() => {
      const elapsed = Date.now() - animationStartedAtRef.current
      const progress = Math.min(elapsed / ANIMATION_DURATION_MS, 1)
      const delta = targetPercentRef.current - animationFromRef.current
      const nextPercent = easeInOutQuad(progress) * delta + animationFromRef.current

      applyPercent(nextPercent)

      if (progress >= 1) {
        stopAnimation()
        applyPercent(targetPercentRef.current)
      }
    }, ANIMATION_FRAME_MS)
  }, [applyPercent, runPercent, stopAnimation])

  return (
    <view className='currentIntervalDonut'>
      <view className='currentIntervalDonut__ring'>
        <svg
          content={buildSvgContent(displayedPercent)}
          style={{ width: '260px', height: '260px' }}
        />
        <view className='currentIntervalDonut__center'>
          <text className='currentIntervalDonut__runLabel'>{runLabel}</text>
          <text className='currentIntervalDonut__walkLabel'>{walkLabel}</text>
        </view>
      </view>
    </view>
  )
}
