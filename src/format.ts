export const formatClockDuration = (seconds: number): string => {
  const roundedSeconds = Math.max(Math.round(seconds), 0)
  const minutes = Math.floor(roundedSeconds / 60)
  const remainder = roundedSeconds % 60

  return `${minutes}:${String(remainder).padStart(2, '0')}`
}
