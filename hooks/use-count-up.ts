'use client'

import { useState, useEffect, useRef } from 'react'

interface UseCountUpOptions {
  start?: number
  end: number
  duration?: number
  decimals?: number
  separator?: string
  prefix?: string
  suffix?: string
  enableScrollSpy?: boolean
  scrollSpyDelay?: number
  scrollSpyOnce?: boolean
}

export function useCountUp({
  start = 0,
  end,
  duration = 2000,
  decimals = 0,
  separator = ',',
  prefix = '',
  suffix = '',
  enableScrollSpy = false,
  scrollSpyDelay = 0,
  scrollSpyOnce = true
}: UseCountUpOptions) {
  const [count, setCount] = useState(start)
  const [isVisible, setIsVisible] = useState(!enableScrollSpy)
  const [hasStarted, setHasStarted] = useState(false)
  const elementRef = useRef<HTMLElement>(null)
  const frameRef = useRef<number>()
  const startTimeRef = useRef<number>()

  // Intersection Observer for scroll spy
  useEffect(() => {
    if (!enableScrollSpy || !elementRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && (!scrollSpyOnce || !hasStarted)) {
          setTimeout(() => {
            setIsVisible(true)
          }, scrollSpyDelay)
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(elementRef.current)

    return () => observer.disconnect()
  }, [enableScrollSpy, scrollSpyDelay, scrollSpyOnce, hasStarted])

  // Animation logic
  useEffect(() => {
    if (!isVisible) return

    setHasStarted(true)
    startTimeRef.current = performance.now()

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) return

      const elapsed = currentTime - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const currentCount = start + (end - start) * easeOut

      setCount(currentCount)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      }
    }

    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [isVisible, start, end, duration])

  // Format the count value
  const formatValue = (value: number): string => {
    const fixedValue = value.toFixed(decimals)
    const parts = fixedValue.split('.')
    
    // Add thousand separators
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator)
    
    const formattedValue = parts.join('.')
    return `${prefix}${formattedValue}${suffix}`
  }

  // Reset function
  const reset = () => {
    setCount(start)
    setIsVisible(!enableScrollSpy)
    setHasStarted(false)
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current)
    }
  }

  // Start function (for manual trigger)
  const startAnimation = () => {
    setIsVisible(true)
  }

  return {
    count,
    formattedValue: formatValue(count),
    isAnimating: isVisible && count < end,
    isComplete: count >= end,
    elementRef,
    reset,
    start: startAnimation
  }
}

// Simplified version for basic counting
export function useSimpleCountUp(end: number, duration = 2000) {
  return useCountUp({ end, duration })
}

// Version with scroll spy enabled by default
export function useScrollCountUp(end: number, options?: Partial<UseCountUpOptions>) {
  return useCountUp({
    end,
    enableScrollSpy: true,
    ...options
  })
}