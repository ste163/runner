import './BottomNav.css'

type BottomNavTab = 'home' | 'workout' | 'settings'

interface BottomNavProps {
  activeTab: BottomNavTab
  onHome?: () => void
  onWorkout?: () => void
  onSettings?: () => void
}

type BottomNavItem = {
  key: BottomNavTab
  label: string
  action?: () => void
}

const buildTabClassName = (isActive: boolean, isInteractive: boolean): string =>
  `bottomNav__item${isActive ? ' bottomNav__item--active' : ''}${!isActive && !isInteractive ? ' bottomNav__item--inactive' : ''}`

const buildTextClassName = (isActive: boolean): string =>
  `bottomNav__text${isActive ? ' bottomNav__text--active' : ''}`

export const BottomNav = ({
  activeTab,
  onHome,
  onWorkout,
  onSettings,
}: BottomNavProps): JSX.Element => {
  const items: BottomNavItem[] = [
    { key: 'home', label: 'Home', ...(onHome ? { action: onHome } : {}) },
    { key: 'workout', label: 'Workout', ...(onWorkout ? { action: onWorkout } : {}) },
    { key: 'settings', label: 'Settings', ...(onSettings ? { action: onSettings } : {}) },
  ]

  return (
    <view className='bottomNav'>
      <view className='bottomNav__surface'>
        {items.map((item) => {
          const isActive = item.key === activeTab
          const isInteractive = item.action !== undefined

          return (
            <view
              key={item.key}
              className={buildTabClassName(isActive, isInteractive)}
              {...(item.action ? { bindtap: item.action } : {})}
            >
              <text className={buildTextClassName(isActive)}>{item.label}</text>
            </view>
          )
        })}
      </view>
    </view>
  )
}
