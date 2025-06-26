'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const partners = [
  {
    id: 1,
    name: 'The Mulia Resort',
    category: 'Luxury Hotels',
    logo: '/images/partners/mulia-resort.png',
    description: 'World-class luxury resort in Nusa Dua',
    rating: 5,
    partnership: 'Preferred Partner',
    website: 'https://www.themulia.com',
  },
  {
    id: 2,
    name: 'Hanging Gardens of Bali',
    category: 'Boutique Hotels',
    logo: '/images/partners/hanging-gardens.png',
    description: 'Iconic infinity pool resort in Ubud',
    rating: 5,
    partnership: 'Exclusive Partner',
    website: 'https://www.hanginggardensofbali.com',
  },
  {
    id: 3,
    name: 'Garuda Indonesia',
    category: 'Airlines',
    logo: '/images/partners/garuda-indonesia.png',
    description: 'National airline of Indonesia',
    rating: 4,
    partnership: 'Official Partner',
    website: 'https://www.garuda-indonesia.com',
  },
  {
    id: 4,
    name: 'Singapore Airlines',
    category: 'Airlines',
    logo: '/images/partners/singapore-airlines.png',
    description: 'Premium international airline',
    rating: 5,
    partnership: 'Preferred Partner',
    website: 'https://www.singaporeair.com',
  },
  {
    id: 5,
    name: 'Bali Safari',
    category: 'Attractions',
    logo: '/images/partners/bali-safari.png',
    description: 'Wildlife conservation and education park',
    rating: 4,
    partnership: 'Official Partner',
    website: 'https://www.balisafari.com',
  },
  {
    id: 6,
    name: 'Ayung River Rafting',
    category: 'Adventure',
    logo: '/images/partners/ayung-rafting.png',
    description: 'Premier white water rafting experience',
    rating: 5,
    partnership: 'Exclusive Partner',
    website: 'https://www.ayungrafting.com',
  },
  {
    id: 7,
    name: 'Bali Swing',
    category: 'Adventure',
    logo: '/images/partners/bali-swing.png',
    description: 'Iconic jungle swing experience',
    rating: 4,
    partnership: 'Preferred Partner',
    website: 'https://www.baliswing.com',
  },
  {
    id: 8,
    name: 'Spa at The Legian',
    category: 'Wellness',
    logo: '/images/partners/legian-spa.png',
    description: 'Luxury spa and wellness center',
    rating: 5,
    partnership: 'Exclusive Partner',
    website: 'https://www.thelegiansemin yak.com',
  },
  {
    id: 9,
    name: 'Bali Cooking Class',
    category: 'Cultural',
    logo: '/images/partners/cooking-class.png',
    description: 'Authentic Balinese cooking experiences',
    rating: 5,
    partnership: 'Official Partner',
    website: 'https://www.balicookingclass.com',
  },
  {
    id: 10,
    name: 'Mount Batur Trekking',
    category: 'Adventure',
    logo: '/images/partners/mount-batur.png',
    description: 'Sunrise volcano trekking specialist',
    rating: 4,
    partnership: 'Preferred Partner',
    website: 'https://www.mountbaturtrekking.com',
  },
  {
    id: 11,
    name: 'Bali Transport Service',
    category: 'Transportation',
    logo: '/images/partners/transport-service.png',
    description: 'Professional driver and vehicle services',
    rating: 4,
    partnership: 'Official Partner',
    website: 'https://www.balitransport.com',
  },
  {
    id: 12,
    name: 'Bali Photography Tours',
    category: 'Photography',
    logo: '/images/partners/photo-tours.png',
    description: 'Professional photography experiences',
    rating: 5,
    partnership: 'Exclusive Partner',
    website: 'https://www.baliphotographytours.com',
  },
]

const categories = [
  { id: 'all', label: 'All Partners' },
  { id: 'Luxury Hotels', label: 'Hotels' },
  { id: 'Airlines', label: 'Airlines' },
  { id: 'Adventure', label: 'Adventure' },
  { id: 'Attractions', label: 'Attractions' },
  { id: 'Wellness', label: 'Wellness' },
  { id: 'Cultural', label: 'Cultural' },
  { id: 'Transportation', label: 'Transport' },
]

const certifications = [
  {
    name: 'IATA Certified',
    logo: '/images/certifications/iata.png',
    description: 'International Air Transport Association',
  },
  {
    name: 'PATA Member',
    logo: '/images/certifications/pata.png',
    description: 'Pacific Asia Travel Association',
  },
  {
    name: 'ASITA Member',
    logo: '/images/certifications/asita.png',
    description: 'Association of Indonesian Tours & Travel Agencies',
  },
  {
    name: 'TripAdvisor Excellence',
    logo: '/images/certifications/tripadvisor.png',
    description: 'Certificate of Excellence 2024',
  },
]

function PartnerCard({ partner, index }: { partner: typeof partners[0]; index: number }) {
  const [isVisible, setIsVisible] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), index * 50)
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  const getPartnershipColor = (partnership: string) => {
    switch (partnership) {
      case 'Exclusive Partner':
        return 'bg-purple-500'
      case 'Preferred Partner':
        return 'bg-blue-500'
      case 'Official Partner':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <Card
      ref={ref}
      className={cn(
        'group overflow-hidden transition-all duration-500 hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-white/10',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      )}
    >
      <CardContent className="p-6">
        {/* Logo */}
        <div className="mb-4 flex h-16 items-center justify-center">
          <div className="relative h-12 w-full">
            <Image
              src={partner.logo}
              alt={partner.name}
              fill
              className={cn(
                'object-contain transition-all duration-300 group-hover:scale-110',
                imageLoaded ? 'opacity-100' : 'opacity-0'
              )}
              onLoad={() => setImageLoaded(true)}
            />
            {!imageLoaded && (
              <div className="absolute inset-0 bg-muted animate-pulse rounded" />
            )}
          </div>
        </div>

        {/* Partner Info */}
        <div className="text-center">
          <h3 className="mb-2 font-semibold text-foreground line-clamp-1">
            {partner.name}
          </h3>
          
          <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
            {partner.description}
          </p>
          
          <div className="mb-3 flex items-center justify-center gap-2">
            <Badge variant="outline" className="text-xs">
              {partner.category}
            </Badge>
            <Badge 
              className={cn('text-white text-xs border-0', getPartnershipColor(partner.partnership))}
            >
              {partner.partnership}
            </Badge>
          </div>
          
          {/* Rating */}
          <div className="flex items-center justify-center gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-2 w-2 rounded-full',
                  i < partner.rating ? 'bg-yellow-400' : 'bg-muted'
                )}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CertificationCard({ certification, index }: { certification: typeof certifications[0]; index: number }) {
  const [isVisible, setIsVisible] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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
    <div
      ref={ref}
      className={cn(
        'text-center transition-all duration-500',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      )}
    >
      <div className="mb-3 flex h-16 items-center justify-center">
        <div className="relative h-12 w-24">
          <Image
            src={certification.logo}
            alt={certification.name}
            fill
            className={cn(
              'object-contain transition-opacity duration-300',
              imageLoaded ? 'opacity-100' : 'opacity-0'
            )}
            onLoad={() => setImageLoaded(true)}
          />
          {!imageLoaded && (
            <div className="absolute inset-0 bg-muted animate-pulse rounded" />
          )}
        </div>
      </div>
      <h4 className="mb-1 font-semibold text-sm">{certification.name}</h4>
      <p className="text-xs text-muted-foreground">{certification.description}</p>
    </div>
  )
}

export function Partners() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [currentIndex, setCurrentIndex] = useState(0)

  const filteredPartners = selectedCategory === 'all' 
    ? partners 
    : partners.filter(partner => partner.category === selectedCategory)

  // Auto-scroll for partner logos
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % Math.max(1, filteredPartners.length - 5))
    }, 3000)

    return () => clearInterval(interval)
  }, [filteredPartners.length])

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
            Our Trusted Partners
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            We collaborate with the best hotels, airlines, and activity providers 
            to ensure you have an exceptional Bali experience.
          </p>
        </div>

        {/* Category Filter */}
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-all',
                selectedCategory === category.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {category.label}
            </button>
          ))}
        </div>

        {/* Partners Grid */}
        <div className="mb-16 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredPartners.map((partner, index) => (
            <PartnerCard key={partner.id} partner={partner} index={index} />
          ))}
        </div>

        {/* Certifications */}
        <div className="mb-12">
          <div className="mb-8 text-center">
            <h3 className="mb-4 text-2xl font-bold text-foreground">
              Certifications & Memberships
            </h3>
            <p className="text-muted-foreground">
              Our industry certifications ensure the highest standards of service and professionalism
            </p>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
            {certifications.map((certification, index) => (
              <CertificationCard key={certification.name} certification={certification} index={index} />
            ))}
          </div>
        </div>

        {/* Partnership Benefits */}
        <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-secondary/10 p-8">
          <div className="text-center mb-6">
            <h3 className="mb-4 text-2xl font-bold text-foreground">
              Partnership Benefits
            </h3>
            <p className="text-muted-foreground">
              Our strong partnerships mean better experiences and value for you
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-3">
            <div className="text-center">
              <div className="mb-3 text-3xl font-bold text-primary">25%</div>
              <div className="font-semibold mb-1">Average Savings</div>
              <div className="text-sm text-muted-foreground">Exclusive partner rates</div>
            </div>
            <div className="text-center">
              <div className="mb-3 text-3xl font-bold text-primary">50+</div>
              <div className="font-semibold mb-1">Trusted Partners</div>
              <div className="text-sm text-muted-foreground">Carefully selected providers</div>
            </div>
            <div className="text-center">
              <div className="mb-3 text-3xl font-bold text-primary">100%</div>
              <div className="font-semibold mb-1">Quality Guaranteed</div>
              <div className="text-sm text-muted-foreground">Vetted and verified partners</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}