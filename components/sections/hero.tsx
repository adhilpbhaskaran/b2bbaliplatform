'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Play, Star, MapPin, Calendar, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const heroSlides = [
  {
    id: 1,
    image: '/images/hero/bali-temple.jpg',
    title: 'Discover the Magic of Bali',
    subtitle: 'Unforgettable Adventures Await',
    description: 'Experience the perfect blend of culture, nature, and luxury with our expertly crafted Bali tours.',
    cta: 'Explore Packages',
    ctaLink: '/packages',
    stats: [
      { icon: Star, value: '4.9', label: 'Rating' },
      { icon: Users, value: '10K+', label: 'Happy Travelers' },
      { icon: MapPin, value: '50+', label: 'Destinations' },
    ],
  },
  {
    id: 2,
    image: '/images/hero/bali-beach.jpg',
    title: 'Paradise Found',
    subtitle: 'Pristine Beaches & Crystal Waters',
    description: 'Relax on world-class beaches and dive into crystal-clear waters in the most beautiful island paradise.',
    cta: 'Beach Packages',
    ctaLink: '/packages?category=beach',
    stats: [
      { icon: Calendar, value: '365', label: 'Days of Sun' },
      { icon: MapPin, value: '20+', label: 'Beach Locations' },
      { icon: Star, value: '5.0', label: 'Beach Rating' },
    ],
  },
  {
    id: 3,
    image: '/images/hero/bali-culture.jpg',
    title: 'Cultural Immersion',
    subtitle: 'Ancient Traditions & Modern Luxury',
    description: 'Immerse yourself in Bali\'s rich cultural heritage while enjoying world-class accommodations and services.',
    cta: 'Cultural Tours',
    ctaLink: '/packages?category=culture',
    stats: [
      { icon: MapPin, value: '100+', label: 'Temples' },
      { icon: Users, value: '1000+', label: 'Years of Culture' },
      { icon: Star, value: '4.8', label: 'Cultural Rating' },
    ],
  },
]

export function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  useEffect(() => {
    if (!isAutoPlaying) return

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length)
    }, 6000)

    return () => clearInterval(interval)
  }, [isAutoPlaying])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length)
    setIsAutoPlaying(false)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)
    setIsAutoPlaying(false)
  }

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
    setIsAutoPlaying(false)
  }

  const currentSlideData = heroSlides[currentSlide]

  return (
    <section className="relative h-screen overflow-hidden">
      {/* Background Images */}
      <div className="absolute inset-0">
        {heroSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={cn(
              'absolute inset-0 transition-opacity duration-1000',
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            )}
          >
            <Image
              src={slide.image}
              alt={slide.title}
              fill
              className="object-cover"
              priority={index === 0}
            />
            <div className="absolute inset-0 bg-black/40" />
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full items-center">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            <div className="mb-6 overflow-hidden">
              <h1 className="text-5xl font-bold text-white md:text-7xl lg:text-8xl">
                <span className="block animate-slide-up">
                  {currentSlideData.title}
                </span>
              </h1>
            </div>
            
            <div className="mb-4 overflow-hidden">
              <h2 className="text-xl font-medium text-white/90 md:text-2xl lg:text-3xl">
                <span className="block animate-slide-up animation-delay-200">
                  {currentSlideData.subtitle}
                </span>
              </h2>
            </div>
            
            <div className="mb-8 overflow-hidden">
              <p className="max-w-2xl text-lg text-white/80 md:text-xl">
                <span className="block animate-slide-up animation-delay-400">
                  {currentSlideData.description}
                </span>
              </p>
            </div>

            {/* Stats */}
            <div className="mb-8 flex flex-wrap gap-6">
              {currentSlideData.stats.map((stat, index) => {
                const Icon = stat.icon
                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 animate-slide-up"
                    style={{ animationDelay: `${600 + index * 100}ms` }}
                  >
                    <Icon className="h-5 w-5 text-yellow-400" />
                    <span className="text-2xl font-bold text-white">{stat.value}</span>
                    <span className="text-white/70">{stat.label}</span>
                  </div>
                )
              })}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="animate-slide-up bg-yellow-500 text-black hover:bg-yellow-400 animation-delay-800"
              >
                <Link href={currentSlideData.ctaLink}>
                  {currentSlideData.cta}
                </Link>
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="animate-slide-up border-white text-white hover:bg-white hover:text-black animation-delay-900"
                onClick={() => {
                  // Add video modal functionality here
                  console.log('Play video')
                }}
              >
                <Play className="mr-2 h-4 w-4" />
                Watch Video
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {heroSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={cn(
              'h-2 w-8 rounded-full transition-all duration-300',
              index === currentSlide
                ? 'bg-yellow-400'
                : 'bg-white/50 hover:bg-white/70'
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Arrow Navigation */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/20 p-2 text-white transition-all hover:bg-black/40 md:left-8"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/20 p-2 text-white transition-all hover:bg-black/40 md:right-8"
        aria-label="Next slide"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Auto-play indicator */}
      <div className="absolute right-4 top-4 z-20 md:right-8">
        <button
          onClick={() => setIsAutoPlaying(!isAutoPlaying)}
          className={cn(
            'rounded-full p-2 text-white transition-all',
            isAutoPlaying ? 'bg-yellow-500/20' : 'bg-black/20 hover:bg-black/40'
          )}
          aria-label={isAutoPlaying ? 'Pause slideshow' : 'Play slideshow'}
        >
          <Play className={cn('h-4 w-4', isAutoPlaying && 'animate-pulse')} />
        </button>
      </div>
    </section>
  )
}