import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create tier configurations
  const tierConfigs = await Promise.all([
    prisma.tierConfig.upsert({
      where: { tier: 'BRONZE' },
      update: {},
      create: {
        tier: 'BRONZE',
        minPax: 0,
        minRevenue: 0,
        discountPercent: 0,
        commissionRate: 5,
        benefits: ['Basic support', 'Standard packages'],
      },
    }),
    prisma.tierConfig.upsert({
      where: { tier: 'SILVER' },
      update: {},
      create: {
        tier: 'SILVER',
        minPax: 50,
        minRevenue: 10000,
        discountPercent: 5,
        commissionRate: 7,
        benefits: ['Priority support', 'Premium packages', '5% discount'],
      },
    }),
    prisma.tierConfig.upsert({
      where: { tier: 'GOLD' },
      update: {},
      create: {
        tier: 'GOLD',
        minPax: 100,
        minRevenue: 25000,
        discountPercent: 10,
        commissionRate: 10,
        benefits: [
          'VIP support',
          'All packages',
          '10% discount',
          'Custom packages',
        ],
      },
    }),
    prisma.tierConfig.upsert({
      where: { tier: 'PLATINUM' },
      update: {},
      create: {
        tier: 'PLATINUM',
        minPax: 200,
        minRevenue: 50000,
        discountPercent: 15,
        commissionRate: 12,
        benefits: [
          'Dedicated account manager',
          'All packages',
          '15% discount',
          'Custom packages',
          'White-label solutions',
        ],
      },
    }),
  ])

  console.log('✅ Tier configurations created')

  // Create sample hotels
  const hotels = await Promise.all([
    prisma.hotel.upsert({
      where: { id: 'hotel-1' },
      update: {},
      create: {
        id: 'hotel-1',
        name: 'The Mulia Resort',
        category: 'Luxury',
        location: 'Nusa Dua',
        description: 'Luxury beachfront resort with world-class amenities',
        amenities: [
          'Private beach',
          'Spa',
          'Multiple restaurants',
          'Pool',
          'Fitness center',
        ],
        images: [
          'https://example.com/mulia-1.jpg',
          'https://example.com/mulia-2.jpg',
        ],
        priceRange: {
          min: 300,
          max: 800,
          currency: 'USD',
        },
      },
    }),
    prisma.hotel.upsert({
      where: { id: 'hotel-2' },
      update: {},
      create: {
        id: 'hotel-2',
        name: 'Ubud Hanging Gardens',
        category: 'Boutique',
        location: 'Ubud',
        description: 'Stunning infinity pools overlooking the jungle',
        amenities: [
          'Infinity pool',
          'Spa',
          'Restaurant',
          'Yoga pavilion',
          'Nature walks',
        ],
        images: [
          'https://example.com/hanging-gardens-1.jpg',
          'https://example.com/hanging-gardens-2.jpg',
        ],
        priceRange: {
          min: 200,
          max: 500,
          currency: 'USD',
        },
      },
    }),
  ])

  console.log('✅ Hotels created')

  // Create sample add-ons
  const addOns = await Promise.all([
    prisma.addOn.upsert({
      where: { id: 'addon-1' },
      update: {},
      create: {
        id: 'addon-1',
        name: 'Volcano Sunrise Trek',
        description: 'Early morning trek to Mount Batur for sunrise viewing',
        category: 'Adventure',
        price: 75,
        duration: '6 hours',
        location: 'Mount Batur',
        images: ['https://example.com/volcano-trek.jpg'],
      },
    }),
    prisma.addOn.upsert({
      where: { id: 'addon-2' },
      update: {},
      create: {
        id: 'addon-2',
        name: 'Traditional Balinese Massage',
        description: 'Relaxing traditional massage with natural oils',
        category: 'Wellness',
        price: 50,
        duration: '90 minutes',
        location: 'Various locations',
        images: ['https://example.com/massage.jpg'],
      },
    }),
    prisma.addOn.upsert({
      where: { id: 'addon-3' },
      update: {},
      create: {
        id: 'addon-3',
        name: 'Cooking Class',
        description: 'Learn to cook authentic Balinese dishes',
        category: 'Cultural',
        price: 60,
        duration: '4 hours',
        location: 'Ubud',
        images: ['https://example.com/cooking-class.jpg'],
      },
    }),
  ])

  console.log('✅ Add-ons created')

  // Create sample packages
  const packages = await Promise.all([
    prisma.package.upsert({
      where: { slug: 'bali-cultural-discovery' },
      update: {},
      create: {
        title: 'Bali Cultural Discovery',
        slug: 'bali-cultural-discovery',
        name: 'Bali Cultural Discovery', // For backward compatibility
        description:
          'Immerse yourself in the rich culture and traditions of Bali with visits to ancient temples, traditional villages, and cultural performances.',
        shortDesc: 'Explore Bali\'s rich cultural heritage and traditions',
        category: 'CULTURAL',
        duration: 5,
        maxPax: 15,
        minPax: 2,
        basePrice: 450,
        images: [
          'https://example.com/cultural-1.jpg',
          'https://example.com/cultural-2.jpg',
          'https://example.com/cultural-3.jpg',
        ],
        highlights: [
          'Visit ancient Besakih Temple',
          'Traditional village tour in Penglipuran',
          'Balinese dance performance',
          'Local artisan workshops',
          'Traditional market visit',
        ],
        inclusions: [
          'Professional English-speaking guide',
          'Air-conditioned transportation',
          'Entrance fees to attractions',
          'Traditional lunch',
          'Bottled water',
        ],
        exclusions: [
          'International flights',
          'Personal expenses',
          'Tips and gratuities',
          'Travel insurance',
        ],
        itinerary: {
          day1: {
            title: 'Arrival and Temple Tour',
            activities: [
              'Airport pickup',
              'Visit Tanah Lot Temple',
              'Sunset viewing',
              'Check-in to hotel',
            ],
          },
          day2: {
            title: 'Cultural Village Experience',
            activities: [
              'Penglipuran Village tour',
              'Traditional bamboo forest walk',
              'Local lunch with village family',
              'Artisan workshop visit',
            ],
          },
          day3: {
            title: 'Ubud Cultural Immersion',
            activities: [
              'Ubud Monkey Forest',
              'Tegallalang Rice Terraces',
              'Traditional market visit',
              'Balinese dance performance',
            ],
          },
          day4: {
            title: 'Temple and Art Tour',
            activities: [
              'Besakih Temple visit',
              'Traditional painting village',
              'Silver jewelry workshop',
              'Local cuisine cooking class',
            ],
          },
          day5: {
            title: 'Departure',
            activities: ['Last-minute shopping', 'Airport transfer'],
          },
        },
        location: 'Bali',
        difficulty: 'EASY',
        isFeatured: true,
        tags: ['culture', 'temples', 'traditional', 'villages', 'art'],
        seoTitle: 'Bali Cultural Discovery Tour - 5 Days Cultural Experience',
        seoDesc:
          'Discover the authentic culture of Bali with our 5-day cultural tour. Visit ancient temples, traditional villages, and experience local arts and crafts.',
        rating: 4.8,
        reviewCount: 127,
        bookingCount: 89,
        popularityScore: 95,
      },
    }),
    prisma.package.upsert({
      where: { slug: 'bali-adventure-explorer' },
      update: {},
      create: {
        title: 'Bali Adventure Explorer',
        slug: 'bali-adventure-explorer',
        name: 'Bali Adventure Explorer',
        description:
          'Experience the thrill of Bali with volcano trekking, white water rafting, and jungle adventures in this action-packed tour.',
        shortDesc: 'Thrilling adventures across Bali\'s natural landscapes',
        category: 'ADVENTURE',
        duration: 6,
        maxPax: 12,
        minPax: 2,
        basePrice: 650,
        images: [
          'https://example.com/adventure-1.jpg',
          'https://example.com/adventure-2.jpg',
          'https://example.com/adventure-3.jpg',
        ],
        highlights: [
          'Mount Batur sunrise trek',
          'White water rafting on Ayung River',
          'ATV quad biking adventure',
          'Sekumpul waterfall hiking',
          'Jungle swing experience',
        ],
        inclusions: [
          'Professional adventure guide',
          'All safety equipment',
          'Transportation',
          'Adventure meals',
          'First aid support',
        ],
        exclusions: [
          'International flights',
          'Personal gear',
          'Travel insurance',
          'Personal expenses',
        ],
        itinerary: {
          day1: {
            title: 'Arrival and Orientation',
            activities: [
              'Airport pickup',
              'Equipment briefing',
              'Welcome dinner',
              'Rest and preparation',
            ],
          },
          day2: {
            title: 'Volcano Adventure',
            activities: [
              'Early morning Mount Batur trek',
              'Sunrise viewing',
              'Hot springs relaxation',
              'Coffee plantation visit',
            ],
          },
          day3: {
            title: 'Water Adventures',
            activities: [
              'White water rafting',
              'Riverside lunch',
              'Sekumpul waterfall hike',
              'Swimming and relaxation',
            ],
          },
          day4: {
            title: 'Jungle Exploration',
            activities: [
              'ATV quad biking',
              'Jungle trekking',
              'Canopy walk',
              'Wildlife spotting',
            ],
          },
          day5: {
            title: 'Extreme Sports',
            activities: [
              'Jungle swing experience',
              'Zip-lining adventure',
              'Rock climbing',
              'Adventure photography',
            ],
          },
          day6: {
            title: 'Departure',
            activities: ['Final breakfast', 'Airport transfer'],
          },
        },
        location: 'Bali',
        difficulty: 'CHALLENGING',
        isFeatured: true,
        tags: ['adventure', 'trekking', 'rafting', 'extreme', 'nature'],
        seoTitle: 'Bali Adventure Tour - 6 Days Extreme Adventure Experience',
        seoDesc:
          'Join our thrilling 6-day Bali adventure tour featuring volcano trekking, white water rafting, and extreme sports activities.',
        rating: 4.9,
        reviewCount: 203,
        bookingCount: 156,
        popularityScore: 98,
      },
    }),
    prisma.package.upsert({
      where: { slug: 'bali-luxury-retreat' },
      update: {},
      create: {
        title: 'Bali Luxury Retreat',
        slug: 'bali-luxury-retreat',
        name: 'Bali Luxury Retreat',
        description:
          'Indulge in the ultimate luxury experience with premium accommodations, private tours, and exclusive access to Bali\'s finest attractions.',
        shortDesc: 'Ultimate luxury experience in Bali\'s finest resorts',
        category: 'LUXURY',
        duration: 7,
        maxPax: 8,
        minPax: 2,
        basePrice: 1200,
        images: [
          'https://example.com/luxury-1.jpg',
          'https://example.com/luxury-2.jpg',
          'https://example.com/luxury-3.jpg',
        ],
        highlights: [
          'Private villa accommodation',
          'Personal butler service',
          'Helicopter tour of Bali',
          'Private yacht charter',
          'Michelin-starred dining',
        ],
        inclusions: [
          'Luxury villa accommodation',
          'Private transportation',
          'Personal concierge',
          'All meals at premium restaurants',
          'Spa treatments',
        ],
        exclusions: [
          'International flights',
          'Personal shopping',
          'Additional spa treatments',
          'Alcoholic beverages',
        ],
        itinerary: {
          day1: {
            title: 'Luxury Arrival',
            activities: [
              'VIP airport transfer',
              'Private villa check-in',
              'Welcome champagne',
              'Sunset dinner at beach club',
            ],
          },
          day2: {
            title: 'Helicopter Adventure',
            activities: [
              'Helicopter tour of Bali',
              'Aerial photography',
              'Exclusive lunch at mountain resort',
              'Private spa session',
            ],
          },
          day3: {
            title: 'Cultural Luxury',
            activities: [
              'Private temple tour',
              'Traditional ceremony participation',
              'Gourmet Balinese cooking class',
              'Cultural performance',
            ],
          },
          day4: {
            title: 'Ocean Adventure',
            activities: [
              'Private yacht charter',
              'Snorkeling in pristine waters',
              'Gourmet lunch on board',
              'Sunset cocktails',
            ],
          },
          day5: {
            title: 'Wellness Day',
            activities: [
              'Full day spa retreat',
              'Yoga and meditation',
              'Healthy gourmet meals',
              'Wellness consultation',
            ],
          },
          day6: {
            title: 'Adventure and Relaxation',
            activities: [
              'Private golf lesson',
              'Luxury shopping tour',
              'Fine dining experience',
              'Private beach access',
            ],
          },
          day7: {
            title: 'Farewell',
            activities: [
              'Final spa treatment',
              'Farewell brunch',
              'VIP airport transfer',
            ],
          },
        },
        location: 'Bali',
        difficulty: 'EASY',
        isFeatured: true,
        tags: ['luxury', 'premium', 'exclusive', 'private', 'wellness'],
        seoTitle: 'Bali Luxury Retreat - 7 Days Ultimate Luxury Experience',
        seoDesc:
          'Experience the ultimate luxury in Bali with our 7-day premium retreat featuring private villas, helicopter tours, and exclusive experiences.',
        rating: 5.0,
        reviewCount: 89,
        bookingCount: 67,
        popularityScore: 92,
      },
    }),
  ])

  console.log('✅ Packages created')

  // Create seasonal rates
  const seasonalRates = await Promise.all([
    // High season rates (July-August, December-January)
    prisma.seasonalRate.upsert({
      where: { id: 'season-1' },
      update: {},
      create: {
        id: 'season-1',
        packageId: packages[0].id,
        seasonType: 'HIGH',
        multiplier: 1.3,
        startDate: new Date('2024-07-01'),
        endDate: new Date('2024-08-31'),
        description: 'High season - Summer holidays',
      },
    }),
    prisma.seasonalRate.upsert({
      where: { id: 'season-2' },
      update: {},
      create: {
        id: 'season-2',
        packageId: packages[0].id,
        seasonType: 'PEAK',
        multiplier: 1.5,
        startDate: new Date('2024-12-20'),
        endDate: new Date('2025-01-10'),
        description: 'Peak season - Christmas and New Year',
      },
    }),
  ])

  console.log('✅ Seasonal rates created')

  // Create default roles and permissions
  const permissions = await Promise.all([
    // User permissions
    prisma.permission.upsert({
      where: { name: 'user:read' },
      update: {},
      create: {
        name: 'user:read',
        description: 'Read user information',
        resource: 'user',
        action: 'read',
      },
    }),
    prisma.permission.upsert({
      where: { name: 'user:update' },
      update: {},
      create: {
        name: 'user:update',
        description: 'Update user information',
        resource: 'user',
        action: 'update',
      },
    }),
    // Booking permissions
    prisma.permission.upsert({
      where: { name: 'booking:create' },
      update: {},
      create: {
        name: 'booking:create',
        description: 'Create bookings',
        resource: 'booking',
        action: 'create',
      },
    }),
    prisma.permission.upsert({
      where: { name: 'booking:read' },
      update: {},
      create: {
        name: 'booking:read',
        description: 'Read bookings',
        resource: 'booking',
        action: 'read',
      },
    }),
    prisma.permission.upsert({
      where: { name: 'booking:update' },
      update: {},
      create: {
        name: 'booking:update',
        description: 'Update bookings',
        resource: 'booking',
        action: 'update',
      },
    }),
    prisma.permission.upsert({
      where: { name: 'booking:delete' },
      update: {},
      create: {
        name: 'booking:delete',
        description: 'Delete bookings',
        resource: 'booking',
        action: 'delete',
      },
    }),
    // Package permissions
    prisma.permission.upsert({
      where: { name: 'package:create' },
      update: {},
      create: {
        name: 'package:create',
        description: 'Create packages',
        resource: 'package',
        action: 'create',
      },
    }),
    prisma.permission.upsert({
      where: { name: 'package:read' },
      update: {},
      create: {
        name: 'package:read',
        description: 'Read packages',
        resource: 'package',
        action: 'read',
      },
    }),
    prisma.permission.upsert({
      where: { name: 'package:update' },
      update: {},
      create: {
        name: 'package:update',
        description: 'Update packages',
        resource: 'package',
        action: 'update',
      },
    }),
    prisma.permission.upsert({
      where: { name: 'package:delete' },
      update: {},
      create: {
        name: 'package:delete',
        description: 'Delete packages',
        resource: 'package',
        action: 'delete',
      },
    }),
    // Admin permissions
    prisma.permission.upsert({
      where: { name: 'admin:users' },
      update: {},
      create: {
        name: 'admin:users',
        description: 'Manage users',
        resource: 'admin',
        action: 'users',
      },
    }),
    prisma.permission.upsert({
      where: { name: 'admin:system' },
      update: {},
      create: {
        name: 'admin:system',
        description: 'System administration',
        resource: 'admin',
        action: 'system',
      },
    }),
  ])

  // Create default roles
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: 'customer' },
      update: {},
      create: {
        name: 'customer',
        description: 'Regular customer role',
        isActive: true,
      },
    }),
    prisma.role.upsert({
      where: { name: 'agent' },
      update: {},
      create: {
        name: 'agent',
        description: 'Travel agent role',
        isActive: true,
      },
    }),
    prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: {
        name: 'admin',
        description: 'Administrator role',
        isActive: true,
      },
    }),
    prisma.role.upsert({
      where: { name: 'super_admin' },
      update: {},
      create: {
        name: 'super_admin',
        description: 'Super administrator role',
        isActive: true,
      },
    }),
  ])

  // Assign permissions to roles
  const rolePermissions = await Promise.all([
    // Customer permissions
    prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: roles[0].id,
          permissionId: permissions.find(p => p.name === 'user:read')!.id,
        },
      },
      update: {},
      create: {
        roleId: roles[0].id,
        permissionId: permissions.find(p => p.name === 'user:read')!.id,
      },
    }),
    prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: roles[0].id,
          permissionId: permissions.find(p => p.name === 'user:update')!.id,
        },
      },
      update: {},
      create: {
        roleId: roles[0].id,
        permissionId: permissions.find(p => p.name === 'user:update')!.id,
      },
    }),
    prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: roles[0].id,
          permissionId: permissions.find(p => p.name === 'booking:create')!.id,
        },
      },
      update: {},
      create: {
        roleId: roles[0].id,
        permissionId: permissions.find(p => p.name === 'booking:create')!.id,
      },
    }),
    // Agent permissions (all customer permissions plus package management)
    ...permissions.filter(p => ['user:read', 'user:update', 'booking:create', 'booking:read', 'booking:update', 'package:read'].includes(p.name))
      .map(permission => 
        prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: roles[1].id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: roles[1].id,
            permissionId: permission.id,
          },
        })
      ),
    // Admin permissions (all permissions except super admin)
    ...permissions.filter(p => !p.name.includes('admin:system'))
      .map(permission => 
        prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: roles[2].id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: roles[2].id,
            permissionId: permission.id,
          },
        })
      ),
    // Super admin permissions (all permissions)
    ...permissions.map(permission => 
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: roles[3].id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: roles[3].id,
          permissionId: permission.id,
        },
      })
    ),
  ])

  console.log('✅ Security roles and permissions created')

  console.log('🎉 Database seeded successfully!')
  console.log(`Created:`)
  console.log(`- ${tierConfigs.length} tier configurations`)
  console.log(`- ${hotels.length} hotels`)
  console.log(`- ${addOns.length} add-ons`)
  console.log(`- ${packages.length} packages`)
  console.log(`- ${seasonalRates.length} seasonal rates`)
}

main()
  .catch(e => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })