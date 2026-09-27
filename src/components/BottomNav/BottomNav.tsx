import type { ReactElement } from '@lynx-js/react'

import './BottomNav.css'

type BottomNavTab = 'home' | 'workout' | 'settings'

const ICON_STROKE_WIDTH = 1.8
const ACTIVE_ICON_COLOR = '#0b0f0b'
const INACTIVE_ICON_COLOR = '#b6c5bc'

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

const buildSettingsIconContent = (color: string): string =>
  buildSvgOpen(color) +
  `<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>` +
  `<circle cx="12" cy="12" r="3.2"/>` +
  `</svg>`

interface BottomNavItem {
  key: BottomNavTab
  label: string
  icon: (color: string) => string
  action?: () => void
}

const buildTabClassName = (isActive: boolean): string =>
  `bottomNav__item${isActive ? ' bottomNav__item--active' : ''}`

const buildTextClassName = (isActive: boolean): string =>
  `bottomNav__text${isActive ? ' bottomNav__text--active' : ''}`

interface BottomNavProps {
  activeTab: BottomNavTab
  onHome?: () => void
  onWorkout?: () => void
  onSettings?: () => void
}

export const BottomNav = ({
  activeTab,
  onHome,
  onWorkout,
  onSettings,
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
      key: 'settings',
      label: 'Settings',
      icon: buildSettingsIconContent,
      ...(onSettings ? { action: onSettings } : {}),
    },
  ]

  return (
    <view className='bottomNav'>
      <view className='bottomNav__surface'>
        {items.map((item) => {
          const isActive = item.key === activeTab
          const iconColor = isActive ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR

          return (
            <view
              key={item.key}
              className={buildTabClassName(isActive)}
              {...(item.action ? { bindtap: item.action } : {})}
            >
              <svg content={item.icon(iconColor)} style={{ width: '24px', height: '24px' }} />
              <text className={buildTextClassName(isActive)}>{item.label}</text>
            </view>
          )
        })}
      </view>
    </view>
  )
}
