import { createContext, useContext } from '@lynx-js/react'

export type CurrentPage = 'home' | 'workout' | 'activeWorkout' | 'onboarding' | 'graphs'

interface PageContextType {
  page: CurrentPage
  setPage: (page: CurrentPage) => void
}

export const PageContext = createContext<PageContextType | null>(null)

export const useCurrentPage = (): PageContextType => {
  const context = useContext(PageContext)
  if (!context) {
    throw new Error('useCurrentPage must be used within PageProvider')
  }
  return context
}
