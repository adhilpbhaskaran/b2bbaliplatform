'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { 
  Star, 
  Clock, 
  Users, 
  MapPin, 
  Heart, 
  Calendar,
  ArrowRight,
  Filter,
  ChevronDown
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

const categories = [
  { id: 'all', label: 'All Packages' },
  { id: 'cultural', label: 'Cultural' },
  { id: 'adventure', label: 'Adventure' },
  { id: 'luxury', label: 'Luxury' },
  { id: 'beach', label: 'Beach' },
  { id: 'wellness', label: 'Wellness' },
]

const featuredPackages = [
  {
    id: 1,
    title: 'Bali Cultural Discovery',
    description: 'Immerse yourself in Bali\'s rich cultural heritage with temple visits, traditional ceremonies, and local artisan workshops.',
    image: '/images/packages/cultural-discovery.jpg',
    price: 299,
    originalPrice: 399,
    duration: '3 Days',
    groupSize: '2-8 People',
    rating: 4.9,
    reviewCount: 127,
    category: 'cultural',
    highlights: ['Tanah Lot Temple', 'Traditional Dance', 'Artisan Village', 'Local Cuisine'],
    badge: 'Best Seller',
    badgeColor: 'bg-green-500',
    location: 'Ubud & Surroundings',
    difficulty: 'Easy',
    includes: ['Transportation', 'Guide', 'Entrance Fees', 'Lunch'],
  },
  {
    id: 2,
    title: 'Bali Adventure Explorer',
    description: 'Experience the thrill of Bali\'s natural wonders with volcano hiking, white water rafting, and jungle trekking.',
    image: '/images/packages/adventure-explorer.jpg',
    price: 449,
    originalPrice: null,
    duration: '4 Days',
    groupSize: '4-12 People',
    rating: 4.8,
    reviewCount: 89,
    category: 'adventure',
    highlights: ['Mount Batur Sunrise', 'Ayung River Rafting', 'Sekumpul Waterfall', 'ATV Ride'],
    badge: 'Adventure',
    badgeColor: 'bg-orange-500',
    location: 'Multiple Locations',
    difficulty: 'Moderate',
    includes: ['Equipment', 'Safety Gear', 'Professional Guide', 'Meals'],
  },
  {
    id: 3,
    title: 'Bali Luxury Retreat',
    description: 'Indulge in the ultimate luxury experience with premium accommodations, spa treatments, and private tours.',
    image: '/images/packages/luxury-retreat.jpg',
    price: 899,
    originalPrice: 1199,
    duration: '5 Days',
    groupSize: '2-6 People',
    rating: 5.0,
    reviewCount: 45,
    category: 'luxury',
    highlights: ['5-Star Resort', 'Private Villa', 'Spa Treatments', 'Fine Dining'],
    badge: 'Luxury',
    badgeColor: 'bg-purple-500',
    location: 'Seminyak & Nusa Dua',
    difficulty: 'Easy',
    includes: ['Luxury Accommodation', 'Private Transport', 'Personal Butler', 'All Meals'],
  },
  {
    id: 4,
    title: 'Bali Beach Paradise',
    description: 'Relax on pristine beaches, enjoy water sports, and witness stunning sunsets at Bali\'s most beautiful coastal areas.',
    image: '/images/packages/beach-paradise.jpg',
    price: 349,
    originalPrice: null,
    duration: '3 Days',
    groupSize: '2-10 People',
    rating: 4.7,
    reviewCount: 156,
    category: 'beach',
    highlights: ['Kuta Beach', 'Uluwatu Cliff', 'Sunset Dinner', 'Water Sports'],
    badge: 'Popular',
    badgeColor: 'bg-blue-500',
    location: 'South Bali',
    difficulty: 'Easy',
    includes: ['Beach Access', 'Equipment Rental', 'Sunset Dinner', 'Transport'],
  },
  {
    id: 5,
    title: 'Bali Wellness Journey',
    description: 'Rejuvenate your mind, body, and soul with yoga sessions, meditation, spa treatments, and healthy cuisine.',
    image: '/images/packages/wellness-journey.jpg',
    price: 549,
    originalPrice: 649,
    duration: '4 Days',
    groupSize: '2-8 People',
    rating: 4.9,
    reviewCount: 73,
    category: 'wellness',
    highlights: ['Daily Yoga', 'Meditation Sessions', 'Spa Treatments', 'Healthy Meals'],
    badge: 'Wellness',
    badgeColor: 'bg-emerald-500',
    location: 'Ubud',
    difficulty: 'Easy',
    includes: ['Yoga Classes', 'Spa Access', 'Healthy Meals', 'Wellness Guide'],
  },
  {
    id: 6,
    title: 'Bali Family Adventure',
    description: 'Perfect for families with children, featuring kid-friendly activities, educational tours, and safe adventures.',
    image: '/images/packages/family-adventure.jpg',
    price: 399,
    originalPrice: null,
    duration: '4 Days',
    groupSize: '4-12 People',
    rating: 4.8,
    reviewCount: 92,
    category: 'adventure',
    highlights: ['Elephant Park', 'Rice Terrace Walk', 'Cooking Class', 'Cultural Show'],
    badge: 'Family Friendly',
    badgeColor: 'bg-pink-500',
    location: 'Central Bali',
    difficulty: 'Easy',
    includes: ['Family Guide', 'Child Safety', 'Educational Materials', 'All Meals'],
  },
]

function PackageCard({ package: pkg }: { package: typeof featuredPackages[0] }) {
  const [isLiked, setIsLiked] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  const discountPercentage = pkg.originalPrice 
    ? Math.round(((pkg.originalPrice - pkg.price) / pkg.originalPrice) * 100)
    : 0

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-white/10">
      <CardHeader className="p-0">
        <div className="relative overflow-hidden">
          <div className="aspect-[4/3] relative">
            <Image
              src={pkg.image}
              alt={pkg.title}
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
          
          {/* Badges */}
          <div className="absolute left-3 top-3 flex flex-col gap-2">
            <Badge className={cn('text-white border-0', pkg.badgeColor)}>
              {pkg.badge}
            </Badge>
            {discountPercentage > 0 && (
              <Badge variant="destructive">
                -{discountPercentage}%
              </Badge>
            )}
          </div>
          
          {/* Like Button */}
          <button
            onClick={() => setIsLiked(!isLiked)}
            className="absolute right-3 top-3 rounded-full bg-white/90 p-2 transition-all hover:bg-white hover:scale-110"
          >
            <Heart 
              className={cn(
                'h-4 w-4 transition-colors',
                isLiked ? 'fill-red-500 text-red-500' : 'text-gray-600'
              )} 
            />
          </button>
          
          {/* Quick Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
            <div className="flex items-center gap-4 text-white text-sm">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {pkg.duration}
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {pkg.groupSize}
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {pkg.location}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{pkg.rating}</span>
            <span className="text-sm text-muted-foreground">({pkg.reviewCount})</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {pkg.difficulty}
          </Badge>
        </div>
        
        <h3 className="mb-2 text-lg font-semibold line-clamp-1">{pkg.title}</h3>
        <p className="mb-3 text-sm text-muted-foreground line-clamp-2">{pkg.description}</p>
        
        {/* Highlights */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {pkg.highlights.slice(0, 3).map((highlight, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {highlight}
              </Badge>
            ))}
            {pkg.highlights.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{pkg.highlights.length - 3} more
              </Badge>
            )}
          </div>
        </div>
        
        {/* Price */}
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary">
            {formatCurrency(pkg.price)}
          </span>
          {pkg.originalPrice && (
            <span className="text-sm text-muted-foreground line-through">
              {formatCurrency(pkg.originalPrice)}
            </span>
          )}
          <span className="text-sm text-muted-foreground">per person</span>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <div className="flex w-full gap-2">
          <Button asChild className="flex-1">
            <Link href={`/packages/${pkg.id}`}>
              View Details
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="icon">
            <Calendar className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

export function FeaturedPackages() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  const filteredPackages = selectedCategory === 'all' 
    ? featuredPackages 
    : featuredPackages.filter(pkg => pkg.category === selectedCategory)

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
            Featured Packages
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Discover our most popular and carefully curated Bali experiences, 
            designed to create unforgettable memories.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Filter by Category</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
              <ChevronDown className={cn(
                'ml-2 h-4 w-4 transition-transform',
                showFilters && 'rotate-180'
              )} />
            </Button>
          </div>
          
          <div className={cn(
            'flex flex-wrap gap-2',
            'md:flex',
            showFilters ? 'flex' : 'hidden'
          )}>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="transition-all"
              >
                {category.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Packages Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPackages.map((pkg) => (
            <PackageCard key={pkg.id} package={pkg} />
          ))}
        </div>

        {/* View All CTA */}
        <div className="mt-12 text-center">
          <Button asChild size="lg">
            <Link href="/packages">
              View All Packages
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}