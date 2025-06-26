'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  MapPin, 
  Car, 
  Hotel, 
  Plane, 
  Camera, 
  Users,
  Calendar,
  Compass,
  ArrowRight,
  CheckCircle,
  Star,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'

const services = [
  {
    id: 'tours',
    icon: Compass,
    title: 'Guided Tours',
    description: 'Expert-led tours with local insights and cultural immersion experiences.',
    image: '/images/services/guided-tours.jpg',
    features: [
      'Professional local guides',
      'Small group experiences',
      'Cultural immersion',
      'Hidden gem discoveries',
      'Flexible itineraries'
    ],
    pricing: 'From $50/day',
    popular: true,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
  },
  {
    id: 'transport',
    icon: Car,
    title: 'Transportation',
    description: 'Comfortable and reliable transportation solutions for all your travel needs.',
    image: '/images/services/transportation.jpg',
    features: [
      'Private vehicles',
      'Airport transfers',
      'Inter-city travel',
      'Professional drivers',
      'Air-conditioned comfort'
    ],
    pricing: 'From $30/day',
    popular: false,
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950/20',
  },
  {
    id: 'accommodation',
    icon: Hotel,
    title: 'Accommodation',
    description: 'Handpicked hotels and resorts that offer the perfect blend of comfort and authenticity.',
    image: '/images/services/accommodation.jpg',
    features: [
      'Luxury resorts',
      'Boutique hotels',
      'Traditional villas',
      'Best price guarantee',
      'Prime locations'
    ],
    pricing: 'From $80/night',
    popular: true,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20',
  },
  {
    id: 'activities',
    icon: Camera,
    title: 'Activities & Experiences',
    description: 'Unique activities and experiences that showcase the best of Bali\'s culture and nature.',
    image: '/images/services/activities.jpg',
    features: [
      'Adventure activities',
      'Cultural workshops',
      'Wellness experiences',
      'Photography tours',
      'Culinary adventures'
    ],
    pricing: 'From $25/activity',
    popular: false,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
  },
  {
    id: 'group',
    icon: Users,
    title: 'Group Travel',
    description: 'Specialized group travel services for families, friends, and corporate events.',
    image: '/images/services/group-travel.jpg',
    features: [
      'Custom group packages',
      'Team building activities',
      'Group discounts',
      'Dedicated coordinators',
      'Flexible group sizes'
    ],
    pricing: 'Custom pricing',
    popular: false,
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950/20',
  },
  {
    id: 'planning',
    icon: Calendar,
    title: 'Trip Planning',
    description: 'Complete trip planning services from initial consultation to final itinerary.',
    image: '/images/services/trip-planning.jpg',
    features: [
      'Personalized itineraries',
      'Budget planning',
      'Travel consultation',
      'Booking management',
      '24/7 support'
    ],
    pricing: 'Free consultation',
    popular: true,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
  },
]

const processSteps = [
  {
    step: '01',
    title: 'Consultation',
    description: 'Tell us about your dream Bali experience and preferences.',
    icon: Users,
  },
  {
    step: '02',
    title: 'Planning',
    description: 'We create a personalized itinerary tailored to your needs.',
    icon: Calendar,
  },
  {
    step: '03',
    title: 'Booking',
    description: 'Secure your reservations with our easy booking process.',
    icon: CheckCircle,
  },
  {
    step: '04',
    title: 'Experience',
    description: 'Enjoy your unforgettable Bali adventure with our support.',
    icon: Star,
  },
]

function ServiceCard({ service, index }: { service: typeof services[0]; index: number }) {
  const [isVisible, setIsVisible] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const Icon = service.icon

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
        'group overflow-hidden transition-all duration-500 hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-white/10',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      )}
    >
      <CardHeader className="p-0">
        <div className="relative overflow-hidden">
          <div className="aspect-[4/3] relative">
            <Image
              src={service.image}
              alt={service.title}
              fill
              className={cn(
                'object-cover transition-all duration-700 group-hover:scale-110',
                imageLoaded ? 'opacity-100' : 'opacity-0'
              )}
              onLoad={() => setImageLoaded(true)}
            />
            {!imageLoaded && (
              <div className="absolute inset-0 bg-muted animate-pulse" />
            )}
          </div>
          
          {/* Service Badge */}
          <div className="absolute left-3 top-3">
            {service.popular && (
              <Badge className="bg-yellow-500 text-white border-0">
                Popular
              </Badge>
            )}
          </div>
          
          {/* Service Icon */}
          <div className="absolute right-3 top-3">
            <div className={cn('rounded-full p-2 bg-white/90', service.bgColor)}>
              <Icon className={cn('h-5 w-5', service.color)} />
            </div>
          </div>
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="mb-4">
          <CardTitle className="mb-2 text-xl">{service.title}</CardTitle>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {service.description}
          </p>
        </div>
        
        {/* Features */}
        <div className="mb-4">
          <h4 className="mb-2 font-semibold text-sm">What\'s Included:</h4>
          <ul className="space-y-1">
            {service.features.slice(0, 3).map((feature, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                {feature}
              </li>
            ))}
            {service.features.length > 3 && (
              <li className="text-sm text-muted-foreground">
                +{service.features.length - 3} more features
              </li>
            )}
          </ul>
        </div>
        
        {/* Pricing */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-lg font-bold text-primary">{service.pricing}</span>
          <Badge variant="outline" className="text-xs">
            <Clock className="mr-1 h-3 w-3" />
            Quick booking
          </Badge>
        </div>
        
        {/* CTA */}
        <Button asChild className="w-full">
          <Link href={`/services/${service.id}`}>
            Learn More
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function ProcessStep({ step, index }: { step: typeof processSteps[0]; index: number }) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const Icon = step.icon

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), index * 200)
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
    <div
      ref={ref}
      className={cn(
        'relative transition-all duration-500',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      )}
    >
      {/* Connector Line */}
      {index < processSteps.length - 1 && (
        <div className="absolute left-1/2 top-16 h-16 w-px bg-border transform -translate-x-1/2 hidden md:block" />
      )}
      
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Icon className="h-8 w-8" />
        </div>
        
        <div className="mb-2 text-sm font-bold text-primary">
          STEP {step.step}
        </div>
        
        <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
        
        <p className="text-sm text-muted-foreground leading-relaxed">
          {step.description}
        </p>
      </div>
    </div>
  )
}

export function Services() {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
            Our Services
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            From guided tours to luxury accommodations, we provide comprehensive travel services
            to make your Bali experience seamless and unforgettable.
          </p>
        </div>

        {/* Services Grid */}
        <div className="mb-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <ServiceCard key={service.id} service={service} index={index} />
          ))}
        </div>

        {/* Process Section */}
        <div className="mb-16">
          <div className="mb-12 text-center">
            <h3 className="mb-4 text-2xl font-bold text-foreground md:text-3xl">
              How It Works
            </h3>
            <p className="mx-auto max-w-xl text-muted-foreground">
              Our simple 4-step process ensures you get the perfect Bali experience
              tailored to your preferences and budget.
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-4">
            {processSteps.map((step, index) => (
              <ProcessStep key={step.step} step={step} index={index} />
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-secondary/10 p-8 text-center">
          <h3 className="mb-4 text-2xl font-bold text-foreground">
            Ready to Start Planning?
          </h3>
          <p className="mb-6 text-muted-foreground">
            Let our experts create the perfect Bali experience for you.
            Get started with a free consultation today.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg">
              Get Free Consultation
            </Button>
            <Button variant="outline" size="lg">
              View All Services
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}