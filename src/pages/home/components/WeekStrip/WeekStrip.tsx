import { useCallback, useRef, useState, type ReactElement } from '@lynx-js/react'
import type { NodesRef, ScrollEndEvent } from '@lynx-js/types'

import './WeekStrip.css'
import { Pressable } from '@/components/Pressable/index.js'
import type { WeekDayView, WeekView } from '@/domain/weekView.js'
import { themeColors } from '@/theme.js'

const CENTER_PAGE_INDEX = 1
const NAV_BUTTON_SIZE = 20
const SNAP_EPSILON_PX = 4

type WeekStripProps = {
  pages: WeekView[]
}

const buildChevronIconContent = (direction: 'back' | 'forward'): string =>
  `<svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" ` +
  `fill="none" stroke="${themeColors.iconMuted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
  (direction === 'back' ? `<path d="M15 18l-6-6 6-6"/>` : `<path d="M9 6l6 6-6 6"/>`) +
  `</svg>`

const buildDayClassName = (day: WeekDayView): string =>
  `weekStrip__day weekStrip__day--${day.state}${day.isToday ? ' weekStrip__day--today' : ''}`

export const WeekStrip = ({ pages }: WeekStripProps): ReactElement => {
  const pagerRef = useRef<NodesRef | null>(null)
  const [activePage, setActivePage] = useState(CENTER_PAGE_INDEX)
  const activeWeek = pages[activePage]
  const canGoBack = activePage > 0 && (activeWeek?.canGoBack ?? false)
  const canGoForward = activePage < pages.length - 1 && (activeWeek?.canGoForward ?? false)

  const scrollToPage = useCallback((targetPage: number, smooth: boolean): void => {
    try {
      pagerRef.current
        ?.invoke({
          method: 'scrollTo',
          params: { index: targetPage, offset: 0, smooth },
        })
        .exec()
    } catch {
      // Pager unavailable (e.g. test environment); the state change stands.
    }
  }, [])

  const handleScrollEnd = useCallback(
    (event: ScrollEndEvent): void => {
      if (pages.length === 0 || event.detail.scrollWidth === 0) return

      const pageWidth = event.detail.scrollWidth / pages.length
      const nearestPage = Math.min(
        Math.max(Math.round(event.detail.scrollLeft / pageWidth), 0),
        pages.length - 1
      )

      setActivePage(nearestPage)

      if (Math.abs(event.detail.scrollLeft - nearestPage * pageWidth) <= SNAP_EPSILON_PX) return

      scrollToPage(nearestPage, true)
    },
    [pages.length, scrollToPage]
  )

  const navigateToPage = useCallback(
    (targetPage: number): void => {
      setActivePage(targetPage)
      scrollToPage(targetPage, true)
    },
    [scrollToPage]
  )

  const handleNavigateBack = useCallback((): void => {
    if (canGoBack) navigateToPage(activePage - 1)
  }, [canGoBack, navigateToPage, activePage])

  const handleNavigateForward = useCallback((): void => {
    if (canGoForward) navigateToPage(activePage + 1)
  }, [canGoForward, navigateToPage, activePage])

  return (
    <view className='weekStrip'>
      {canGoBack ? (
        <Pressable className='weekStrip__nav' testId='week-strip-back' onTap={handleNavigateBack}>
          <svg
            content={buildChevronIconContent('back')}
            style={{ width: `${NAV_BUTTON_SIZE}px`, height: `${NAV_BUTTON_SIZE}px` }}
          />
        </Pressable>
      ) : (
        <view className='weekStrip__nav weekStrip__nav--empty' />
      )}
      <scroll-view
        ref={pagerRef}
        className='weekStrip__pager'
        data-testid='week-strip-pager'
        scroll-orientation='horizontal'
        scroll-bar-enable={false}
        initial-scroll-to-index={CENTER_PAGE_INDEX}
        bindscrollend={handleScrollEnd}
      >
        {pages.map((week, pageIndex) => (
          <view className='weekStrip__page' flatten={false} key={`week-page-${pageIndex}`}>
            {week.days.map((day) => (
              <view
                key={day.key}
                data-testid={`week-day-${pageIndex}-${day.key}-${day.state}`}
                className={buildDayClassName(day)}
              >
                <text className='weekStrip__label'>{day.label}</text>
              </view>
            ))}
          </view>
        ))}
      </scroll-view>
      {canGoForward ? (
        <Pressable
          className='weekStrip__nav'
          testId='week-strip-forward'
          onTap={handleNavigateForward}
        >
          <svg
            content={buildChevronIconContent('forward')}
            style={{ width: `${NAV_BUTTON_SIZE}px`, height: `${NAV_BUTTON_SIZE}px` }}
          />
        </Pressable>
      ) : (
        <view className='weekStrip__nav weekStrip__nav--empty' />
      )}
    </view>
  )
}
