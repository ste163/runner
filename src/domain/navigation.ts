import { createContext, useContext } from '@lynx-js/react'

type NavTab = 'home' | 'workout' | 'onboarding' | 'graphs'

export interface NavigationContextType {
  activeTab: NavTab
  workoutActive: boolean
  setActiveTab: (tab: NavTab) => void
  setWorkoutActive: (active: boolean) => void
}

export const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider')
  }
  return context
}
