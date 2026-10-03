import type { ReactElement } from '@lynx-js/react'

import './BottomNav.css'
import { Pressable } from '../Pressable/index.js'
import { themeColors } from '../../theme.js'

type BottomNavTab = 'home' | 'workout' | 'data'

const ICON_STROKE_WIDTH = 1.8

// Keep in sync with .bottomNav__item padding-top (0.625rem) and
// .bottomNav__icon size (2.5rem) in BottomNav.css at the 16.8px root font-size.
// Pressable uses these to place the touch fill inside the icon circle.
const NAV_ICON_SIZE_PX = 42
const NAV_ICON_TOP_PX = 10.5

const buildSvgOpen = (color: string): string =>
  `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" ` +
  `fill="none" stroke="${color}" stroke-width="${ICON_STROKE_WIDTH}" ` +
  `stroke-linecap="round" stroke-linejoin="round">`

const buildHomeIconContent = (color: string): string =>
  buildSvgOpen(color) +
  `<path d="M3 10 L12 3 L21 10 V19 A2 2 0 0 1 19 21 H5 A2 2 0 0 1 3 19 Z"/>` +
  `<path d="M9 21 V13 H15 V21"/>` +
  `</svg>`

const buildWorkoutIconContent = (color: string): string =>
  buildSvgOpen(color) +
  `<path d="m15 10.42 4.8-5.07"/>` +
  `<path d="M19 18h3"/>` +
  `<path d="M9.5 22 21.414 9.415A2 2 0 0 0 21.2 6.4l-5.61-4.208A1 1 0 0 0 14 3v2a2 2 0 0 1-1.394 1.906L8.677 8.053A1 1 0 0 0 8 9c-.155 6.393-2.082 9-4 9a2 2 0 0 0 0 4h14"/>` +
  `</svg>`

const buildDataIconContent = (color: string): string =>
  buildSvgOpen(color) +
  `<path d="M3 3v16a2 2 0 0 0 2 2h16"/>` +
  `<path d="m19 9-5 5-4-4-3 3"/>` +
  `</svg>`

interface BottomNavItem {
  key: BottomNavTab
  label: string
  icon: (color: string) => string
  action?: () => void
}

const buildTabClassName = (isActive: boolean): string =>
  `bottomNav__item${isActive ? ' bottomNav__item--active' : ''}`

interface BottomNavProps {
  activeTab: BottomNavTab
  onHome?: () => void
  onWorkout?: () => void
  onData?: () => void
}

export const BottomNav = ({
  activeTab,
  onHome,
  onWorkout,
  onData,
}: BottomNavProps): ReactElement => {
  const items: BottomNavItem[] = [
    {
      key: 'home',
      label: 'Home',
      icon: buildHomeIconContent,
      ...(onHome ? { action: onHome } : {}),
    },
    {
      key: 'workout',
      label: 'Workout',
      icon: buildWorkoutIconContent,
      ...(onWorkout ? { action: onWorkout } : {}),
    },
    {
      key: 'data',
      label: 'Data',
      icon: buildDataIconContent,
      ...(onData ? { action: onData } : {}),
    },
  ]

  return (
    <view className='bottomNav'>
      <view className='bottomNav__surface'>
        {items.map((item) => {
          const isActive = item.key === activeTab
          const iconColor = isActive ? themeColors.run : themeColors.iconMuted

          return (
            <Pressable
              key={item.key}
              className={buildTabClassName(isActive)}
              testId={`bottomNav-${item.key}`}
              rippleColor={themeColors.runMuted}
              rippleTarget={{
                top: NAV_ICON_TOP_PX,
                width: NAV_ICON_SIZE_PX,
                height: NAV_ICON_SIZE_PX,
                centeredHorizontally: true,
              }}
              ripplePersist={isActive}
              {...(item.action ? { onTap: item.action } : {})}
            >
              <view className='bottomNav__icon'>
                <svg content={item.icon(iconColor)} style={{ width: '24px', height: '24px' }} />
              </view>
              <text className='bottomNav__label'>{item.label}</text>
            </Pressable>
          )
        })}
      </view>
    </view>
  )
}
