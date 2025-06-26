'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Star, 
  Quote, 
  ChevronLeft, 
  ChevronRight,
  Play,
  MapPin,
  Calendar,
  Users
} from 'lucide-react'
import { cn } from '@/lib/utils'

const testimonials = [
  {
    id: 1,
    name: 'Sarah Johnson',
    location: 'New York, USA',
    avatar: '/images/avatars/sarah.jpg',
    rating: 5,
    package: 'Bali Cultural Discovery',
    duration: '7 days',
    groupSize: '2 people',
    date: 'March 2024',
    comment: 'Absolutely incredible experience! The attention to detail and local knowledge made our Bali trip unforgettable. Our guide was passionate and showed us hidden gems we never would have discovered on our own.',
    fullReview: 'From the moment we landed in Bali, everything was perfectly organized. The cultural immersion was authentic and respectful, and we learned so much about Balinese traditions. The temple visits were spiritual and moving, and the cooking class was a highlight. Highly recommend Bali DMC!',
    images: ['/images/testimonials/sarah-1.jpg', '/images/testimonials/sarah-2.jpg'],
    videoUrl: '/videos/testimonials/sarah.mp4',
    verified: true,
  },
  {
    id: 2,
    name: 'Michael Chen',
    location: 'Singapore',
    avatar: '/images/avatars/michael.jpg',
    rating: 5,
    package: 'Bali Adventure Explorer',
    duration: '5 days',
    groupSize: '4 people',
    date: 'February 2024',
    comment: 'Professional service from start to finish. The adventure activities were thrilling yet safe, and our guide was knowledgeable about both the activities and local culture.',
    fullReview: 'The Mount Batur sunrise hike was breathtaking, and the white water rafting was an adrenaline rush! Safety was clearly a priority, and all equipment was top-notch. The team was flexible when weather affected our plans and provided great alternatives.',
    images: ['/images/testimonials/michael-1.jpg', '/images/testimonials/michael-2.jpg'],
    videoUrl: null,
    verified: true,
  },
  {
    id: 3,
    name: 'Emma Wilson',
    location: 'London, UK',
    avatar: '/images/avatars/emma.jpg',
    rating: 5,
    package: 'Bali Luxury Retreat',
    duration: '6 days',
    groupSize: '2 people',
    date: 'January 2024',
    comment: 'The luxury package exceeded all expectations. Every detail was perfect and the service was world-class. The spa treatments and fine dining experiences were exceptional.',
    fullReview: 'This was our honeymoon trip and it was absolutely perfect. The resort was stunning, the private villa was luxurious, and the personal butler service made us feel like royalty. The sunset dinner on the beach was magical and will be a memory we treasure forever.',
    images: ['/images/testimonials/emma-1.jpg', '/images/testimonials/emma-2.jpg'],
    videoUrl: '/videos/testimonials/emma.mp4',
    verified: true,
  },
  {
    id: 4,
    name: 'David Rodriguez',
    location: 'Madrid, Spain',
    avatar: '/images/avatars/david.jpg',
    rating: 5,
    package: 'Bali Family Adventure',
    duration: '8 days',
    groupSize: '6 people',
    date: 'December 2023',
    comment: 'Perfect family vacation! The kids loved every moment, and the activities were perfectly suited for different age groups. Our guide was amazing with children.',
    fullReview: 'Traveling with kids can be challenging, but Bali DMC made it seamless. The elephant park visit was educational and ethical, the cooking class engaged the whole family, and the cultural performances were captivating for all ages. Highly recommended for families!',
    images: ['/images/testimonials/david-1.jpg', '/images/testimonials/david-2.jpg'],
    videoUrl: null,
    verified: true,
  },
  {
    id: 5,
    name: 'Lisa Thompson',
    location: 'Sydney, Australia',
    avatar: '/images/avatars/lisa.jpg',
    rating: 5,
    package: 'Bali Wellness Journey',
    duration: '10 days',
    groupSize: '1 person',
    date: 'November 2023',
    comment: 'A transformative wellness experience. The yoga sessions, meditation, and spa treatments helped me reconnect with myself. The healthy cuisine was delicious and nourishing.',
    fullReview: 'I came to Bali feeling burned out and left feeling completely rejuvenated. The wellness program was comprehensive and the instructors were world-class. The accommodation was peaceful and the daily schedule was perfectly balanced between activity and relaxation.',
    images: ['/images/testimonials/lisa-1.jpg', '/images/testimonials/lisa-2.jpg'],
    videoUrl: '/videos/testimonials/lisa.mp4',
    verified: true,
  },
  {
    id: 6,
    name: 'James Park',
    location: 'Seoul, South Korea',
    avatar: '/images/avatars/james.jpg',
    rating: 5,
    package: 'Bali Beach Paradise',
    duration: '4 days',
    groupSize: '3 people',
    date: 'October 2023',
    comment: 'Amazing beach experience with perfect weather and stunning locations. The water sports were exciting and the sunset dinners were romantic and memorable.',
    fullReview: 'The beaches were pristine and the water activities were well-organized. Snorkeling at the coral reefs was incredible, and the surf lessons were fun even for beginners. The beachside dining experiences were exceptional with fresh seafood and beautiful sunset views.',
    images: ['/images/testimonials/james-1.jpg', '/images/testimonials/james-2.jpg'],
    videoUrl: null,
    verified: true,
  },
]

function TestimonialCard({ testimonial, isActive }: { testimonial: typeof testimonials[0]; isActive: boolean }) {
  const [showFullReview, setShowFullReview] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  return (
    <Card className={cn(
      'h-full transition-all duration-300',
      isActive ? 'scale-100 opacity-100' : 'scale-95 opacity-70'
    )}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-full bg-muted">
              <Image
                src={testimonial.avatar}
                alt={testimonial.name}
                fill
                className={cn(
                  'object-cover transition-opacity duration-300',
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                )}
                onLoad={() => setImageLoaded(true)}
              />
              {!imageLoaded && (
                <div className="absolute inset-0 bg-muted animate-pulse" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{testimonial.name}</h4>
                {testimonial.verified && (
                  <Badge variant="secondary" className="text-xs">
                    Verified
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {testimonial.location}
              </div>
            </div>
          </div>
          
          {testimonial.videoUrl && (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => {
                // Add video modal functionality here
                console.log('Play video:', testimonial.videoUrl)
              }}
            >
              <Play className="h-3 w-3" />
              Video
            </Button>
          )}
        </div>

        {/* Rating */}
        <div className="mb-4 flex items-center gap-2">
          <div className="flex items-center gap-1">
            {[...Array(testimonial.rating)].map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <span className="text-sm text-muted-foreground">({testimonial.rating}/5)</span>
        </div>

        {/* Package Info */}
        <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {testimonial.duration}
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-3 w-3" />
            {testimonial.groupSize}
          </div>
        </div>
        
        <Badge variant="outline" className="mb-4 text-xs">
          {testimonial.package}
        </Badge>

        {/* Quote */}
        <div className="relative mb-4">
          <Quote className="absolute -left-1 -top-1 h-6 w-6 text-muted-foreground/30" />
          <blockquote className="pl-6 text-muted-foreground italic leading-relaxed">
            "{showFullReview ? testimonial.fullReview : testimonial.comment}"
          </blockquote>
        </div>

        {/* Toggle Full Review */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFullReview(!showFullReview)}
          className="mb-4 h-auto p-0 text-primary hover:bg-transparent"
        >
          {showFullReview ? 'Show less' : 'Read full review'}
        </Button>

        {/* Trip Images */}
        {testimonial.images && testimonial.images.length > 0 && (
          <div className="flex gap-2">
            {testimonial.images.slice(0, 2).map((image, index) => (
              <div key={index} className="relative h-16 w-16 overflow-hidden rounded-lg bg-muted">
                <Image
                  src={image}
                  alt={`${testimonial.name}'s trip photo ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
            {testimonial.images.length > 2 && (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                +{testimonial.images.length - 2}
              </div>
            )}
          </div>
        )}

        {/* Date */}
        <div className="mt-4 text-xs text-muted-foreground">
          Traveled in {testimonial.date}
        </div>
      </CardContent>
    </Card>
  )
}

export function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [visibleCount, setVisibleCount] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)

  // Responsive visible count
  useEffect(() => {
    const updateVisibleCount = () => {
      if (window.innerWidth >= 1024) {
        setVisibleCount(3)
      } else if (window.innerWidth >= 768) {
        setVisibleCount(2)
      } else {
        setVisibleCount(1)
      }
    }

    updateVisibleCount()
    window.addEventListener('resize', updateVisibleCount)
    return () => window.removeEventListener('resize', updateVisibleCount)
  }, [])

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => 
        prev + visibleCount >= testimonials.length ? 0 : prev + 1
      )
    }, 5000)

    return () => clearInterval(interval)
  }, [isAutoPlaying, visibleCount])

  const nextTestimonial = () => {
    setCurrentIndex((prev) => 
      prev + visibleCount >= testimonials.length ? 0 : prev + 1
    )
    setIsAutoPlaying(false)
  }

  const prevTestimonial = () => {
    setCurrentIndex((prev) => 
      prev === 0 ? Math.max(0, testimonials.length - visibleCount) : prev - 1
    )
    setIsAutoPlaying(false)
  }

  const goToTestimonial = (index: number) => {
    setCurrentIndex(index)
    setIsAutoPlaying(false)
  }

  const visibleTestimonials = testimonials.slice(currentIndex, currentIndex + visibleCount)
  if (visibleTestimonials.length < visibleCount && currentIndex > 0) {
    const remaining = visibleCount - visibleTestimonials.length
    visibleTestimonials.push(...testimonials.slice(0, remaining))
  }

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
            What Our Travelers Say
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Don\'t just take our word for it. Here\'s what our satisfied customers 
            have to say about their Bali adventures with us.
          </p>
        </div>

        {/* Testimonials Carousel */}
        <div className="relative" ref={containerRef}>
          <div className="overflow-hidden">
            <div 
              className="flex transition-transform duration-500 ease-in-out"
              style={{ 
                transform: `translateX(-${(currentIndex * 100) / visibleCount}%)`,
                width: `${(testimonials.length * 100) / visibleCount}%`
              }}
            >
              {testimonials.map((testimonial, index) => (
                <div 
                  key={testimonial.id} 
                  className="px-3"
                  style={{ width: `${100 / testimonials.length}%` }}
                >
                  <TestimonialCard 
                    testimonial={testimonial} 
                    isActive={index >= currentIndex && index < currentIndex + visibleCount}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Arrows */}
          <Button
            variant="outline"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-background/80 backdrop-blur-sm"
            onClick={prevTestimonial}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-background/80 backdrop-blur-sm"
            onClick={nextTestimonial}
            disabled={currentIndex + visibleCount >= testimonials.length}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Dots Navigation */}
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: Math.ceil(testimonials.length / visibleCount) }).map((_, index) => (
            <button
              key={index}
              onClick={() => goToTestimonial(index * visibleCount)}
              className={cn(
                'h-2 w-8 rounded-full transition-all duration-300',
                Math.floor(currentIndex / visibleCount) === index
                  ? 'bg-primary'
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              )}
              aria-label={`Go to testimonial group ${index + 1}`}
            />
          ))}
        </div>

        {/* Stats */}
        <div className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">4.9/5</div>
            <div className="text-sm text-muted-foreground">Average Rating</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">500+</div>
            <div className="text-sm text-muted-foreground">Reviews</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">98%</div>
            <div className="text-sm text-muted-foreground">Satisfaction Rate</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">100%</div>
            <div className="text-sm text-muted-foreground">Verified Reviews</div>
          </div>
        </div>
      </div>
    </section>
  )
}