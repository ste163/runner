import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from '@lynx-js/react'

import './DonutGraph.css'
import { buildDonutGraphSvgContent } from './donutSvg.js'

export interface DonutGraphProps {
  size: number
  radius: number
  strokeWidth: number
  fraction: number
  trackColor: string
  arcColor: string
  animated?: boolean
  durationMs?: number
  fillContainer?: boolean
  className?: string
  testId?: string
  children?: ReactNode
}

const ANIMATION_FRAME_MS = 8
const ANIMATION_DURATION_MS = 1000

const easeInOutQuad = (progress: number): number =>
  progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress

export const DonutGraph = ({
  size,
  radius,
  strokeWidth,
  fraction,
  trackColor,
  arcColor,
  animated = false,
  durationMs = ANIMATION_DURATION_MS,
  fillContainer = false,
  className,
  testId,
  children,
}: DonutGraphProps): ReactElement => {
  const [displayedFraction, setDisplayedFraction] = useState(fraction)
  const displayedFractionRef = useRef(fraction)
  const targetFractionRef = useRef(fraction)
  const animationStartedAtRef = useRef(0)
  const animationFromRef = useRef(fraction)
  const animationFrameRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopAnimation = useCallback((): void => {
    if (animationFrameRef.current !== null) {
      clearInterval(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  const applyFraction = useCallback((nextFraction: number): void => {
    displayedFractionRef.current = nextFraction
    setDisplayedFraction(nextFraction)
  }, [])

  useEffect(() => {
    return () => stopAnimation()
  }, [stopAnimation])

  useEffect(() => {
    targetFractionRef.current = fraction

    if (!animated || Math.abs(fraction - displayedFractionRef.current) < 0.001) {
      stopAnimation()
      applyFraction(fraction)
      return
    }

    animationFromRef.current = displayedFractionRef.current
    animationStartedAtRef.current = Date.now()
    stopAnimation()

    animationFrameRef.current = setInterval(() => {
      const elapsed = Date.now() - animationStartedAtRef.current
      const progress = Math.min(elapsed / durationMs, 1)
      const delta = targetFractionRef.current - animationFromRef.current
      const nextFraction = easeInOutQuad(progress) * delta + animationFromRef.current

      applyFraction(nextFraction)

      if (progress >= 1) {
        stopAnimation()
        applyFraction(targetFractionRef.current)
      }
    }, ANIMATION_FRAME_MS)
  }, [animated, applyFraction, durationMs, fraction, stopAnimation])

  const graphStyle = fillContainer
    ? { width: '100%', height: '100%' }
    : { width: `${size}px`, height: `${size}px` }
  const ringClassName =
    className === undefined ? 'donutGraph__ring' : `donutGraph__ring ${className}`

  return (
    <view className={ringClassName} style={graphStyle} data-testid={testId}>
      <svg
        content={buildDonutGraphSvgContent({
          size,
          radius,
          strokeWidth,
          fraction: displayedFraction,
          trackColor,
          arcColor,
        })}
        style={graphStyle}
      />
      {children === undefined ? null : <view className='donutGraph__center'>{children}</view>}
    </view>
  )
}
