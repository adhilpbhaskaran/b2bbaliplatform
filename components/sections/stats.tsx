'use client'

import { useEffect, useRef, useState } from 'react'
import { Users, MapPin, Star, Award, Calendar, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'

const stats = [
  {
    icon: Users,
    value: 15000,
    suffix: '+',
    label: 'Happy Travelers',
    description: 'Satisfied customers from around the world',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
  },
  {
    icon: MapPin,
    value: 50,
    suffix: '+',
    label: 'Destinations',
    description: 'Unique locations across Bali',
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950/20',
  },
  {
    icon: Star,
    value: 4.9,
    suffix: '/5',
    label: 'Average Rating',
    description: 'Based on verified customer reviews',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
  },
  {
    icon: Award,
    value: 25,
    suffix: '+',
    label: 'Awards Won',
    description: 'Industry recognition and certifications',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20',
  },
  {
    icon: Calendar,
    value: 8,
    suffix: '+',
    label: 'Years Experience',
    description: 'Serving travelers since 2016',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
  },
  {
    icon: Heart,
    value: 98,
    suffix: '%',
    label: 'Satisfaction Rate',
    description: 'Customers who would recommend us',
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950/20',
  },
]

function useCountUp(end: number, duration: number = 2000, start: number = 0) {
  const [count, setCount] = useState(start)
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isVisible) return

    let startTime: number
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      const currentCount = start + (end - start) * easeOutQuart
      
      setCount(currentCount)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  }, [isVisible, end, duration, start])

  return { count, ref }
}

function StatCard({ stat, index }: { stat: typeof stats[0]; index: number }) {
  const { count, ref } = useCountUp(stat.value, 2000 + index * 200)
  const Icon = stat.icon

  const formatValue = (value: number) => {
    if (stat.suffix === '/5') {
      return value.toFixed(1)
    }
    if (stat.suffix === '%') {
      return Math.round(value).toString()
    }
    return Math.round(value).toString()
  }

  return (
    <div
      ref={ref}
      className={cn(
        'group relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-white/5',
        stat.bgColor
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className={cn('mb-2 inline-flex rounded-lg p-2', stat.bgColor)}>
            <Icon className={cn('h-6 w-6', stat.color)} />
          </div>
          
          <div className="mb-1">
            <span className="text-3xl font-bold text-foreground md:text-4xl">
              {formatValue(count)}
            </span>
            <span className={cn('text-2xl font-semibold md:text-3xl', stat.color)}>
              {stat.suffix}
            </span>
          </div>
          
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            {stat.label}
          </h3>
          
          <p className="text-sm text-muted-foreground">
            {stat.description}
          </p>
        </div>
      </div>
      
      {/* Decorative element */}
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </div>
  )
}

export function Stats() {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
            Trusted by Thousands
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Our commitment to excellence has earned us the trust of travelers worldwide.
            Here are the numbers that speak for themselves.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {stats.map((stat, index) => (
            <StatCard key={stat.label} stat={stat} index={index} />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            Join thousands of satisfied travelers and create your own Bali adventure
          </p>
        </div>
      </div>
    </section>
  )
}