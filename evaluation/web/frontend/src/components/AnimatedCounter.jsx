import { useState, useEffect, useRef } from 'react'

function AnimatedCounter({
  value,
  duration = 400,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
  formatNumber = true
}) {
  const [displayValue, setDisplayValue] = useState(value)
  const previousValueRef = useRef(value)
  const animationRef = useRef(null)

  useEffect(() => {
    const previousValue = previousValueRef.current
    const difference = value - previousValue

    if (difference === 0) return

    const startTime = performance.now()

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease-out cubic for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3)

      const current = previousValue + difference * easeOut
      setDisplayValue(current)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setDisplayValue(value)
        previousValueRef.current = value
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [value, duration])

  const formattedValue = formatNumber
    ? displayValue.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      })
    : displayValue.toFixed(decimals)

  return (
    <span className={`animated-counter ${className}`}>
      {prefix}{formattedValue}{suffix}
    </span>
  )
}

export default AnimatedCounter
