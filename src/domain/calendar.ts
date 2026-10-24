export const startOfLocalDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate())

export const addCalendarDays = (date: Date, days: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)

export const isSameLocalDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

export const isBeforeLocalDay = (a: Date, b: Date): boolean =>
  a.getFullYear() < b.getFullYear() ||
  (a.getFullYear() === b.getFullYear() &&
    (a.getMonth() < b.getMonth() || (a.getMonth() === b.getMonth() && a.getDate() < b.getDate())))

export const countDaysBetween = (startDay: Date, endDay: Date): number => {
  let count = 0
  let cursor = startDay

  while (isBeforeLocalDay(cursor, endDay)) {
    count += 1
    cursor = addCalendarDays(cursor, 1)
  }

  return count
}
