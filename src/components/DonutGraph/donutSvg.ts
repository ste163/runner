const clampFraction = (fraction: number): number => Math.max(0, Math.min(fraction, 1))

export const buildDonutGraphSvgContent = ({
  size,
  radius,
  strokeWidth,
  fraction,
  trackColor,
  arcColor,
}: {
  size: number
  radius: number
  strokeWidth: number
  fraction: number
  trackColor: string
  arcColor: string
}): string => {
  const center = size / 2
  const circumference = 2 * Math.PI * radius
  const safeFraction = clampFraction(fraction)
  const dashLength = (circumference * safeFraction).toFixed(2)

  const progressCircle =
    safeFraction <= 0
      ? ''
      : `<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${arcColor}" ` +
        `stroke-width="${strokeWidth}" stroke-linecap="round" ` +
        `stroke-dasharray="${dashLength} ${circumference.toFixed(2)}" ` +
        `transform="rotate(-90 ${center} ${center})"/>`

  return (
    `<svg viewBox="0 0 ${size} ${size}" preserveAspectRatio="xMidYMid meet" ` +
    `xmlns="http://www.w3.org/2000/svg">` +
    `<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${trackColor}" ` +
    `stroke-width="${strokeWidth}"/>` +
    progressCircle +
    `</svg>`
  )
}
