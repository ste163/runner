import { useCallback, useState } from '@lynx-js/react'
import * as router from 'sparkling-navigation'
import { BottomNav } from '../BottomNav/index.js'
import { PageContext, type CurrentPage } from '../../domain/currentPage.js'

interface AppLayoutProps {
  children: JSX.Element
  initialPage: CurrentPage
}

const buildPageScheme = (bundle: string, title: string): string => {
  return (
    `hybrid://lynxview_page?bundle=${bundle}` +
    '&container_bg_color=%23000000' +
    '&force_theme_style=dark' +
    '&hide_nav_bar=1' +
    '&nav_bar_color=%23000000' +
    '&screen_orientation=portrait' +
    `&title=${encodeURIComponent(title)}` +
    '&trans_status_bar=0'
  )
}

const homeScheme = buildPageScheme('home.lynx.bundle', 'Home')
const workoutScheme = buildPageScheme('workout.lynx.bundle', 'Workout')

export const AppLayout = ({ children, initialPage }: AppLayoutProps): JSX.Element => {
  const [activeTab, setActiveTab] = useState<'home' | 'workout'>(
    initialPage === 'home' ? 'home' : 'workout'
  )
  const [currentPage] = useState<CurrentPage>(initialPage)

  const handleHome = useCallback((): void => {
    setActiveTab('home')
    router.open({ scheme: homeScheme }, () => undefined)
  }, [])

  const handleWorkout = useCallback((): void => {
    setActiveTab('workout')
    router.open({ scheme: workoutScheme }, () => undefined)
  }, [])

  const shouldShowNav = currentPage !== 'activeWorkout'

  return (
    <PageContext.Provider value={{ page: currentPage, setPage: () => {} }}>
      <view style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {children}
        {shouldShowNav && (
          <BottomNav activeTab={activeTab} onHome={handleHome} onWorkout={handleWorkout} />
        )}
      </view>
    </PageContext.Provider>
  )
}
