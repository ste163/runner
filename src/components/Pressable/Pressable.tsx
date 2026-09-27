import { useCallback, useRef, useState, type ReactElement, type ReactNode } from '@lynx-js/react'
import type { NodesRef, SelectorQuery, TouchEvent } from '@lynx-js/types'

import './Pressable.css'

// Keep in sync with the animation duration in Pressable.css.
const RIPPLE_DURATION_MS = 350

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

const buildRippleDiameter = (width: number, height: number): number =>
  2 * Math.sqrt(width * width + height * height)

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
  children?: ReactNode
}): ReactElement => {
  const [ripples, setRipples] = useState<RippleData[]>([])
  const nextRippleIdRef = useRef(0)

  const handleTap = useCallback(
    (event: TouchEvent): void => {
      const uid = event?.currentTarget?.uid

      if (typeof uid === 'number') {
        try {
          measureHostBounds(uid, (bounds) => {
            const diameter = buildRippleDiameter(bounds.width, bounds.height)
            const rippleId = nextRippleIdRef.current
            nextRippleIdRef.current += 1

            setRipples((currentRipples) => [
              ...currentRipples,
              {
                id: rippleId,
                left: event.detail.x - bounds.left - diameter / 2,
                top: event.detail.y - bounds.top - diameter / 2,
                diameter,
              },
            ])

            setTimeout(() => {
              setRipples((currentRipples) =>
                currentRipples.filter((ripple) => ripple.id !== rippleId)
              )
            }, RIPPLE_DURATION_MS)
          })
        } catch {
          // Host measurement unavailable; skip the ripple and keep the tap.
        }
      }

      props.onTap?.()
    },
    [props.onTap]
  )

  return (
    <view
      className={props.className ?? ''}
      data-testid={props.testId}
      bindtap={handleTap}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
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
