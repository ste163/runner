import { describe, expect, it } from 'vitest'

import {
  addCalendarDays,
  countDaysBetween,
  isSameLocalDay,
  startOfLocalDay,
} from '@/domain/calendar.js'

describe('calendar', () => {
  it('starts the local day at midnight', () => {
    const midnight = startOfLocalDay(new Date(2024, 0, 1, 18, 30, 45))

    expect(midnight.getFullYear()).toBe(2024)
    expect(midnight.getMonth()).toBe(0)
    expect(midnight.getDate()).toBe(1)
    expect(midnight.getHours()).toBe(0)
    expect(midnight.getMinutes()).toBe(0)
  })

  it('adds calendar days across month boundaries', () => {
    const shifted = addCalendarDays(new Date(2024, 0, 29), 4)

    expect(shifted.getMonth()).toBe(1)
    expect(shifted.getDate()).toBe(2)
  })

  it('counts calendar days between two days', () => {
    expect(countDaysBetween(new Date(2024, 0, 1), new Date(2024, 0, 1))).toBe(0)
    expect(countDaysBetween(new Date(2024, 0, 1), new Date(2024, 0, 5))).toBe(4)
  })

  it('counts days across a month boundary', () => {
    expect(countDaysBetween(new Date(2024, 0, 30), new Date(2024, 1, 3))).toBe(4)
  })

  it('compares local days', () => {
    expect(isSameLocalDay(new Date(2024, 0, 1, 6), new Date(2024, 0, 1, 23))).toBe(true)
    expect(isSameLocalDay(new Date(2024, 0, 1, 6), new Date(2024, 0, 2, 6))).toBe(false)
  })
})
