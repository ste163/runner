import './BottomNav.css'

type BottomNavTab = 'home' | 'workout'

interface BottomNavItem {
  key: BottomNavTab
  label: string
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
}

export const BottomNav = ({ activeTab, onHome, onWorkout }: BottomNavProps): JSX.Element => {
  const items: BottomNavItem[] = [
    { key: 'home', label: 'Home', ...(onHome ? { action: onHome } : {}) },
    { key: 'workout', label: 'Workout', ...(onWorkout ? { action: onWorkout } : {}) },
  ]

  return (
    <view className='bottomNav'>
      <view className='bottomNav__surface'>
        {items.map((item) => {
          const isActive = item.key === activeTab

          return (
            <view
              key={item.key}
              className={buildTabClassName(isActive)}
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
