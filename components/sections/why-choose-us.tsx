'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { 
  Shield, 
  Award, 
  Users, 
  Clock, 
  Heart, 
  MapPin,
  Star,
  CheckCircle,
  Headphones,
  Globe
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const features = [
  {
    icon: Shield,
    title: 'Trusted & Secure',
    description: 'Licensed tour operator with comprehensive insurance coverage and safety protocols.',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    stats: '100% Secure',
  },
  {
    icon: Award,
    title: 'Award Winning',
    description: 'Recognized excellence in tourism with multiple industry awards and certifications.',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
    stats: '25+ Awards',
  },
  {
    icon: Users,
    title: 'Expert Local Guides',
    description: 'Passionate local experts who bring Bali\'s culture and history to life.',
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950/20',
    stats: '50+ Guides',
  },
  {
    icon: Clock,
    title: '24/7 Support',
    description: 'Round-the-clock customer support to ensure your peace of mind throughout your journey.',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    stats: 'Always Available',
  },
  {
    icon: Heart,
    title: 'Personalized Experience',
    description: 'Customized itineraries tailored to your preferences and travel style.',
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950/20',
    stats: 'Custom Tours',
  },
  {
    icon: Globe,
    title: 'Sustainable Tourism',
    description: 'Committed to responsible travel that benefits local communities and environment.',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
    stats: 'Eco-Friendly',
  },
]

const testimonials = [
  {
    name: 'Sarah Johnson',
    location: 'New York, USA',
    rating: 5,
    comment: 'Absolutely incredible experience! The attention to detail and local knowledge made our Bali trip unforgettable.',
    avatar: '/images/avatars/sarah.jpg',
    package: 'Cultural Discovery',
  },
  {
    name: 'Michael Chen',
    location: 'Singapore',
    rating: 5,
    comment: 'Professional service from start to finish. Our guide was amazing and showed us hidden gems we never would have found.',
    avatar: '/images/avatars/michael.jpg',
    package: 'Adventure Explorer',
  },
  {
    name: 'Emma Wilson',
    location: 'London, UK',
    rating: 5,
    comment: 'The luxury package exceeded all expectations. Every detail was perfect and the service was world-class.',
    avatar: '/images/avatars/emma.jpg',
    package: 'Luxury Retreat',
  },
]

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const Icon = feature.icon

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), index * 100)
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <Card
      ref={ref}
      className={cn(
        'group relative overflow-hidden border-0 bg-transparent transition-all duration-500 hover:shadow-lg',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      )}
    >
      <CardContent className={cn('p-6 rounded-2xl transition-all duration-300', feature.bgColor)}>
        <div className="mb-4 flex items-center justify-between">
          <div className={cn('rounded-xl p-3', feature.bgColor)}>
            <Icon className={cn('h-8 w-8', feature.color)} />
          </div>
          <span className={cn('text-sm font-semibold', feature.color)}>
            {feature.stats}
          </span>
        </div>
        
        <h3 className="mb-3 text-xl font-bold text-foreground">
          {feature.title}
        </h3>
        
        <p className="text-muted-foreground leading-relaxed">
          {feature.description}
        </p>
        
        {/* Decorative element */}
        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br from-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </CardContent>
    </Card>
  )
}

function TestimonialCard({ testimonial, index }: { testimonial: typeof testimonials[0]; index: number }) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), index * 150)
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <Card
      ref={ref}
      className={cn(
        'transition-all duration-500 hover:shadow-lg',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      )}
    >
      <CardContent className="p-6">
        <div className="mb-4 flex items-center gap-1">
          {[...Array(testimonial.rating)].map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          ))}
        </div>
        
        <blockquote className="mb-4 text-muted-foreground italic leading-relaxed">
          "{testimonial.comment}"
        </blockquote>
        
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-full bg-muted">
            <Image
              src={testimonial.avatar}
              alt={testimonial.name}
              fill
              className="object-cover"
            />
          </div>
          <div>
            <div className="font-semibold text-foreground">{testimonial.name}</div>
            <div className="text-sm text-muted-foreground">{testimonial.location}</div>
            <div className="text-xs text-primary">{testimonial.package}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function WhyChooseUs() {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
            Why Choose Bali DMC?
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            We\'re not just a tour operator – we\'re your gateway to authentic Bali experiences.
            Here\'s what sets us apart from the rest.
          </p>
        </div>

        {/* Features Grid */}
        <div className="mb-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>

        {/* Testimonials Section */}
        <div className="mb-12">
          <div className="mb-8 text-center">
            <h3 className="mb-4 text-2xl font-bold text-foreground md:text-3xl">
              What Our Travelers Say
            </h3>
            <p className="text-muted-foreground">
              Don\'t just take our word for it – hear from our satisfied customers
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <TestimonialCard key={testimonial.name} testimonial={testimonial} index={index} />
            ))}
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-secondary/10 p-8">
          <div className="grid gap-6 md:grid-cols-4">
            <div className="text-center">
              <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-500" />
              <div className="font-semibold">Licensed Operator</div>
              <div className="text-sm text-muted-foreground">Fully certified & insured</div>
            </div>
            <div className="text-center">
              <Headphones className="mx-auto mb-2 h-8 w-8 text-blue-500" />
              <div className="font-semibold">24/7 Support</div>
              <div className="text-sm text-muted-foreground">Always here to help</div>
            </div>
            <div className="text-center">
              <Shield className="mx-auto mb-2 h-8 w-8 text-purple-500" />
              <div className="font-semibold">Safe & Secure</div>
              <div className="text-sm text-muted-foreground">Your safety is our priority</div>
            </div>
            <div className="text-center">
              <Award className="mx-auto mb-2 h-8 w-8 text-yellow-500" />
              <div className="font-semibold">Award Winning</div>
              <div className="text-sm text-muted-foreground">Industry recognized</div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Button size="lg" className="bg-primary hover:bg-primary/90">
            Start Your Bali Adventure
          </Button>
        </div>
      </div>
    </section>
  )
}