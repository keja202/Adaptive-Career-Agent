import { useEffect, useState } from 'react'

export default function AnimatedNumber({ value, durationMs = 600 }) {
  const target = Number(value)
  const [display, setDisplay] = useState(Number.isFinite(target) ? 0 : value)

  useEffect(() => {
    if (!Number.isFinite(target)) {
      setDisplay(value)
      return
    }

    const start = performance.now()
    const from = 0

    const tick = (t) => {
      const p = Math.min(1, (t - start) / durationMs)
      setDisplay(from + (target - from) * p)
      if (p < 1) requestAnimationFrame(tick)
    }

    const raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs, value])

  if (!Number.isFinite(target)) return <>{display}</>
  return <>{display.toFixed(1)}</>
}
