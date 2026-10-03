import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from '@lynx-js/react'
import type { NodesRef, SelectorQuery, TouchEvent } from '@lynx-js/types'

import './Pressable.css'

// Keep in sync with the animation durations in Pressable.css.
const RIPPLE_DURATION_MS = 350
const FILL_SETTLE_DELAY_MS = 160

interface RippleData {
  id: number
  left: number
  top: number
  diameter: number
}

interface HostBounds {
  left: number
  top: number
  width: number
  height: number
}

interface RippleTarget {
  top: number
  width: number
  height: number
  centeredHorizontally: boolean
}

type FillPhase = 'growing' | 'settled' | 'fading'

interface FillData {
  phase: FillPhase
  originX: number
  originY: number
  animationKey: number
}

const buildRippleDiameter = (width: number, height: number): number =>
  2 * Math.sqrt(width * width + height * height)

const buildTouchRipple = (bounds: HostBounds, x: number, y: number): Omit<RippleData, 'id'> => {
  const diameter = buildRippleDiameter(bounds.width, bounds.height)
  return {
    left: x - bounds.left - diameter / 2,
    top: y - bounds.top - diameter / 2,
    diameter,
  }
}

const clampToCircle = (
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  radius: number
): { x: number; y: number } => {
  const dx = x - centerX
  const dy = y - centerY
  const distance = Math.hypot(dx, dy)
  if (distance <= radius) return { x, y }
  const scale = radius / distance
  return { x: centerX + dx * scale, y: centerY + dy * scale }
}

const measureHostBounds = (uid: number, callback: (bounds: HostBounds) => void): void => {
  const selectorQuery = lynx.createSelectorQuery() as SelectorQuery & {
    selectUniqueID: (uniqueId: number) => NodesRef
  }

  selectorQuery
    .selectUniqueID(uid)
    .invoke({
      method: 'boundingClientRect',
      success: (result: HostBounds) => {
        callback(result)
      },
    })
    .exec()
}

export const Pressable = (props: {
  onTap?: () => void
  className?: string
  testId?: string
  rippleColor?: string
  rippleTarget?: RippleTarget
  ripplePersist?: boolean
  children?: ReactNode
}): ReactElement => {
  const [ripples, setRipples] = useState<RippleData[]>([])
  const [fill, setFill] = useState<FillData | null>(null)
  const nextRippleIdRef = useRef(0)
  const nextAnimationKeyRef = useRef(0)
  const persistRef = useRef(false)

  const handleTap = useCallback(
    (event: TouchEvent): void => {
      if (props.rippleTarget === undefined) {
        const uid = event?.currentTarget?.uid

        if (typeof uid === 'number') {
          try {
            measureHostBounds(uid, (bounds) => {
              const ripple = buildTouchRipple(bounds, event.detail.x, event.detail.y)
              const rippleId = nextRippleIdRef.current
              nextRippleIdRef.current += 1

              setRipples((currentRipples) => [...currentRipples, { id: rippleId, ...ripple }])

              setTimeout(() => {
                setRipples((currentRipples) =>
                  currentRipples.filter((currentRipple) => currentRipple.id !== rippleId)
                )
              }, RIPPLE_DURATION_MS)
            })
          } catch {
            // Host measurement unavailable; skip the ripple and keep the tap.
          }
        }
      }

      props.onTap?.()
    },
    [props.onTap, props.rippleTarget]
  )

  const handleTouchStart = useCallback(
    (event: TouchEvent): void => {
      const target = props.rippleTarget
      if (target === undefined) return

      const animationKey = nextAnimationKeyRef.current
      nextAnimationKeyRef.current += 1

      setFill({
        phase: 'growing',
        originX: target.width / 2,
        originY: target.height / 2,
        animationKey,
      })

      const uid = event?.currentTarget?.uid
      if (typeof uid !== 'number') return

      try {
        measureHostBounds(uid, (bounds) => {
          const clipLeft = target.centeredHorizontally ? (bounds.width - target.width) / 2 : 0
          const origin = clampToCircle(
            event.detail.x - bounds.left - clipLeft,
            event.detail.y - bounds.top - target.top,
            target.width / 2,
            target.height / 2,
            target.width / 2
          )

          setFill((currentFill) =>
            currentFill !== null &&
            currentFill.phase === 'growing' &&
            currentFill.animationKey === animationKey
              ? { ...currentFill, originX: origin.x, originY: origin.y }
              : currentFill
          )
        })
      } catch {
        // Host measurement unavailable; keep the centered origin.
      }
    },
    [props.rippleTarget]
  )

  const handleTouchEnd = useCallback((): void => {
    if (props.rippleTarget === undefined) return
    if (props.ripplePersist === true) return

    setTimeout(() => {
      setFill((currentFill) =>
        currentFill !== null && currentFill.phase === 'growing' && persistRef.current !== true
          ? { ...currentFill, phase: 'fading' }
          : currentFill
      )
    }, FILL_SETTLE_DELAY_MS)
  }, [props.ripplePersist, props.rippleTarget])

  const handleTouchCancel = useCallback((): void => {
    if (props.rippleTarget === undefined) return
    setFill((currentFill) =>
      currentFill === null
        ? currentFill
        : { ...currentFill, phase: props.ripplePersist === true ? 'settled' : 'fading' }
    )
  }, [props.ripplePersist, props.rippleTarget])

  useEffect(() => {
    const target = props.rippleTarget
    if (target === undefined) return
    persistRef.current = props.ripplePersist === true

    if (props.ripplePersist === true) {
      setFill((currentFill) => {
        if (currentFill === null) {
          const animationKey = nextAnimationKeyRef.current
          nextAnimationKeyRef.current += 1
          return {
            phase: 'growing',
            originX: target.width / 2,
            originY: target.height / 2,
            animationKey,
          }
        }
        if (currentFill.phase === 'fading') return { ...currentFill, phase: 'settled' }
        return currentFill
      })
      return
    }

    setFill((currentFill) =>
      currentFill !== null && currentFill.phase !== 'fading'
        ? { ...currentFill, phase: 'fading' }
        : currentFill
    )
  }, [props.ripplePersist, props.rippleTarget])

  return (
    <view
      className={props.className ?? ''}
      data-testid={props.testId}
      bindtap={handleTap}
      bindtouchstart={handleTouchStart}
      bindtouchend={handleTouchEnd}
      bindtouchcancel={handleTouchCancel}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {props.rippleTarget !== undefined && fill !== null ? (
        <view
          className='pressable__fill-clip'
          style={{
            left: props.rippleTarget.centeredHorizontally ? '50%' : '0px',
            ...(props.rippleTarget.centeredHorizontally
              ? { marginLeft: `${-(props.rippleTarget.width / 2)}px` }
              : {}),
            top: `${props.rippleTarget.top}px`,
            width: `${props.rippleTarget.width}px`,
            height: `${props.rippleTarget.height}px`,
          }}
        >
          <view
            key={fill.animationKey}
            className={`pressable__fill pressable__fill--${fill.phase}`}
            style={{
              left: `${fill.originX - props.rippleTarget.width}px`,
              top: `${fill.originY - props.rippleTarget.height}px`,
              width: `${props.rippleTarget.width * 2}px`,
              height: `${props.rippleTarget.height * 2}px`,
              ...(props.rippleColor === undefined ? {} : { backgroundColor: props.rippleColor }),
            }}
          />
        </view>
      ) : null}
      {props.children}
      {ripples.map((ripple) => (
        <view
          key={ripple.id}
          className='pressable__ripple'
          style={{
            left: `${ripple.left}px`,
            top: `${ripple.top}px`,
            width: `${ripple.diameter}px`,
            height: `${ripple.diameter}px`,
          }}
        />
      ))}
    </view>
  )
}
