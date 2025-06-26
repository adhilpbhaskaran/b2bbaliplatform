import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withAdmin, handleApiError, getPagination } from '@/lib/auth/middleware'

const bulkPackageActionSchema = z.object({
  action: z.enum(['activate', 'deactivate', 'delete', 'update_category', 'update_pricing', 'duplicate']),
  packageIds: z.array(z.string().uuid()),
  data: z.object({
    category: z.string().optional(),
    priceAdjustment: z.number().optional(),
    adjustmentType: z.enum(['percentage', 'fixed']).optional(),
    isActive: z.boolean().optional()
  }).optional()
})

const packageImportSchema = z.object({
  packages: z.array(z.object({
    name: z.string().min(1),
    description: z.string(),
    category: z.string(),
    basePrice: z.number().positive(),
    duration: z.number().positive(),
    maxPax: z.number().positive(),
    minPax: z.number().positive().default(1),
    difficulty: z.enum(['EASY', 'MODERATE', 'CHALLENGING', 'EXTREME']).default('EASY'),
    tags: z.array(z.string()).default([]),
    inclusions: z.array(z.string()).default([]),
    exclusions: z.array(z.string()).default([]),
    itinerary: z.array(z.object({
      day: z.number().positive(),
      title: z.string(),
      description: z.string(),
      activities: z.array(z.string()).default([])
    })).default([]),
    images: z.array(z.string()).default([]),
    isActive: z.boolean().default(true)
  }))
})

const packageAnalyticsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  groupBy: z.enum(['category', 'difficulty', 'price_range', 'duration']).default('category'),
  metrics: z.array(z.enum(['bookings', 'revenue', 'conversion', 'popularity'])).default(['bookings', 'revenue'])
})

// GET /api/admin/packages - Advanced package management
export async function GET(req: NextRequest) {
  return withAdmin(async (authenticatedReq) => {
    try {
      const url = new URL(req.url)
      const action = url.searchParams.get('action')
      
      if (action === 'analytics') {
        // Package analytics and performance
        const queryParams = {
          startDate: url.searchParams.get('startDate'),
          endDate: url.searchParams.get('endDate'),
          groupBy: url.searchParams.get('groupBy') || 'category',
          metrics: url.searchParams.get('metrics')?.split(',') || ['bookings', 'revenue']
        }
        
        const data = packageAnalyticsSchema.parse(queryParams)
        
        const endDate = data.endDate ? new Date(data.endDate) : new Date()
        const startDate = data.startDate ? new Date(data.startDate) : (() => {
          const date = new Date(endDate)
          date.setMonth(date.getMonth() - 3) // Last 3 months
          return date
        })()
        
        // Get package performance data
        const [packageStats, topPerformers, categoryStats, conversionRates] = await Promise.all([
          // Overall package statistics
          prisma.package.aggregate({
            where: { isActive: true },
            _count: true,
            _avg: { basePrice: true },
            _min: { basePrice: true },
            _max: { basePrice: true }
          }),
          
          // Top performing packages
          prisma.package.findMany({
            where: { isActive: true },
            include: {
              _count: {
                select: {
                  quotes: {
                    where: {
                      createdAt: { gte: startDate, lte: endDate }
                    }
                  },
                  bookings: {
                    where: {
                      createdAt: { gte: startDate, lte: endDate }
                    }
                  }
                }
              },
              bookings: {
                where: {
                  createdAt: { gte: startDate, lte: endDate },
                  status: 'COMPLETED'
                },
                select: { totalAmount: true }
              }
            },
            orderBy: {
              bookings: {
                _count: 'desc'
              }
            },
            take: 10
          }),
          
          // Category performance
          prisma.package.groupBy({
            by: ['category'],
            where: { isActive: true },
            _count: { category: true },
            _avg: { basePrice: true }
          }),
          
          // Conversion rates by package
          prisma.package.findMany({
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              category: true,
              _count: {
                select: {
                  quotes: {
                    where: {
                      createdAt: { gte: startDate, lte: endDate }
                    }
                  },
                  bookings: {
                    where: {
                      createdAt: { gte: startDate, lte: endDate }
                    }
                  }
                }
              }
            }
          })
        ])
        
        const analytics = {
          period: { startDate, endDate },
          overview: {
            totalPackages: packageStats._count,
            averagePrice: parseFloat(packageStats._avg.basePrice?.toString() || '0'),
            priceRange: {
              min: parseFloat(packageStats._min.basePrice?.toString() || '0'),
              max: parseFloat(packageStats._max.basePrice?.toString() || '0')
            }
          },
          topPerformers: topPerformers.map(pkg => ({
            id: pkg.id,
            name: pkg.name,
            category: pkg.category,
            basePrice: parseFloat(pkg.basePrice.toString()),
            quotes: pkg._count.quotes,
            bookings: pkg._count.bookings,
            revenue: pkg.bookings.reduce((sum, b) => sum + parseFloat(b.totalAmount.toString()), 0),
            conversionRate: pkg._count.quotes > 0 ? (pkg._count.bookings / pkg._count.quotes) * 100 : 0
          })),
          categoryBreakdown: categoryStats.map(cat => ({
            category: cat.category,
            packageCount: cat._count.category,
            averagePrice: parseFloat(cat._avg.basePrice?.toString() || '0')
          })),
          conversionRates: conversionRates.map(pkg => ({
            packageId: pkg.id,
            packageName: pkg.name,
            category: pkg.category,
            quotes: pkg._count.quotes,
            bookings: pkg._count.bookings,
            conversionRate: pkg._count.quotes > 0 ? (pkg._count.bookings / pkg._count.quotes) * 100 : 0
          })).sort((a, b) => b.conversionRate - a.conversionRate)
        }
        
        return NextResponse.json(analytics)
      }
      
      if (action === 'export') {
        // Export packages data
        const format = url.searchParams.get('format') || 'json'
        const category = url.searchParams.get('category')
        const includeStats = url.searchParams.get('includeStats') === 'true'
        
        const packages = await prisma.package.findMany({
          where: category ? { category } : {},
          include: {
            seasonalRates: true,
            ...(includeStats && {
              _count: {
                select: {
                  quotes: true,
                  bookings: true
                }
              },
              bookings: {
                where: { status: 'COMPLETED' },
                select: { totalAmount: true }
              }
            })
          }
        })
        
        const exportData = packages.map(pkg => ({
          id: pkg.id,
          name: pkg.name,
          description: pkg.description,
          category: pkg.category,
          basePrice: parseFloat(pkg.basePrice.toString()),
          duration: pkg.duration,
          maxPax: pkg.maxPax,
          minPax: pkg.minPax,
          difficulty: pkg.difficulty,
          tags: pkg.tags,
          inclusions: pkg.inclusions,
          exclusions: pkg.exclusions,
          itinerary: pkg.itinerary,
          images: pkg.images,
          isActive: pkg.isActive,
          createdAt: pkg.createdAt,
          updatedAt: pkg.updatedAt,
          seasonalRates: pkg.seasonalRates?.map(rate => ({
            season: rate.season,
            multiplier: parseFloat(rate.multiplier.toString()),
            startDate: rate.startDate,
            endDate: rate.endDate
          })),
          ...(includeStats && {
            stats: {
              totalQuotes: (pkg as any)._count?.quotes || 0,
              totalBookings: (pkg as any)._count?.bookings || 0,
              totalRevenue: (pkg as any).bookings?.reduce((sum: number, b: any) => 
                sum + parseFloat(b.totalAmount.toString()), 0) || 0
            }
          })
        }))
        
        if (format === 'csv') {
          // Flatten data for CSV
          const flattenedData = exportData.map(pkg => {
            const { seasonalRates, itinerary, stats, ...basicData } = pkg
            return {
              ...basicData,
              tags: pkg.tags.join(';'),
              inclusions: pkg.inclusions.join(';'),
              exclusions: pkg.exclusions.join(';'),
              seasonalRatesCount: seasonalRates?.length || 0,
              itineraryDays: itinerary?.length || 0,
              ...(stats && {
                totalQuotes: stats.totalQuotes,
                totalBookings: stats.totalBookings,
                totalRevenue: stats.totalRevenue
              })
            }
          })
          
          const headers = Object.keys(flattenedData[0] || {})
          const csvContent = [
            headers.join(','),
            ...flattenedData.map(row => 
              headers.map(header => {
                const value = (row as any)[header]
                return `"${String(value).replace(/"/g, '""')}"`
              }).join(',')
            )
          ].join('\n')
          
          return new NextResponse(csvContent, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="packages-export-${new Date().toISOString().split('T')[0]}.csv"`
            }
          })
        }
        
        return NextResponse.json({
          packages: exportData,
          exportedAt: new Date().toISOString(),
          totalCount: exportData.length
        })
      }
      
      if (action === 'categories') {
        // Get package categories with stats
        const categories = await prisma.package.groupBy({
          by: ['category'],
          where: { isActive: true },
          _count: { category: true },
          _avg: { basePrice: true },
          _min: { basePrice: true },
          _max: { basePrice: true }
        })
        
        return NextResponse.json({
          categories: categories.map(cat => ({
            name: cat.category,
            packageCount: cat._count.category,
            averagePrice: parseFloat(cat._avg.basePrice?.toString() || '0'),
            priceRange: {
              min: parseFloat(cat._min.basePrice?.toString() || '0'),
              max: parseFloat(cat._max.basePrice?.toString() || '0')
            }
          }))
        })
      }
      
      // Regular package listing with advanced filters
      const {
        page = 1,
        limit = 20,
        category,
        difficulty,
        isActive,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        minPrice,
        maxPrice,
        minDuration,
        maxDuration,
        includeStats
      } = Object.fromEntries(url.searchParams.entries())
      
      const { skip, take } = getPagination(parseInt(page), parseInt(limit))
      
      // Build where clause
      const where: any = {}
      
      if (category) where.category = category
      if (difficulty) where.difficulty = difficulty
      if (isActive !== undefined) where.isActive = isActive === 'true'
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
          { tags: { has: search } }
        ]
      }
      if (minPrice || maxPrice) {
        where.basePrice = {}
        if (minPrice) where.basePrice.gte = parseFloat(minPrice)
        if (maxPrice) where.basePrice.lte = parseFloat(maxPrice)
      }
      if (minDuration || maxDuration) {
        where.duration = {}
        if (minDuration) where.duration.gte = parseInt(minDuration)
        if (maxDuration) where.duration.lte = parseInt(maxDuration)
      }
      
      const [packages, totalCount] = await Promise.all([
        prisma.package.findMany({
          where,
          skip,
          take,
          orderBy: { [sortBy]: sortOrder },
          include: {
            seasonalRates: true,
            admin: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            ...(includeStats === 'true' && {
              _count: {
                select: {
                  quotes: true,
                  bookings: true
                }
              }
            })
          }
        }),
        prisma.package.count({ where })
      ])
      
      // Add additional stats if requested
      let packagesWithStats = packages
      if (includeStats === 'true') {
        const packageIds = packages.map(p => p.id)
        const [revenueStats, conversionStats] = await Promise.all([
          prisma.booking.groupBy({
            by: ['quote'],
            where: {
              quote: {
                packageId: { in: packageIds }
              },
              status: 'COMPLETED'
            },
            _sum: { totalAmount: true }
          }),
          prisma.quote.groupBy({
            by: ['packageId'],
            where: {
              packageId: { in: packageIds }
            },
            _count: { packageId: true }
          })
        ])
        
        // Get quote to package mapping
        const quotes = await prisma.quote.findMany({
          where: { packageId: { in: packageIds } },
          select: { id: true, packageId: true }
        })
        
        packagesWithStats = packages.map(pkg => {
          const packageQuotes = quotes.filter(q => q.packageId === pkg.id)
          const packageRevenue = revenueStats
            .filter(r => packageQuotes.some(q => q.id === r.quote))
            .reduce((sum, r) => sum + parseFloat(r._sum.totalAmount?.toString() || '0'), 0)
          
          const quotesCount = conversionStats.find(c => c.packageId === pkg.id)?._count.packageId || 0
          const bookingsCount = (pkg as any)._count?.bookings || 0
          
          return {
            ...pkg,
            stats: {
              totalRevenue: packageRevenue,
              conversionRate: quotesCount > 0 ? (bookingsCount / quotesCount) * 100 : 0,
              averageBookingValue: bookingsCount > 0 ? packageRevenue / bookingsCount : 0
            }
          }
        })
      }
      
      return NextResponse.json({
        packages: packagesWithStats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / parseInt(limit))
        }
      })
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}

// POST /api/admin/packages - Bulk actions and package import
export async function POST(req: NextRequest) {
  return withAdmin(async (authenticatedReq) => {
    try {
      const url = new URL(req.url)
      const action = url.searchParams.get('action')
      const body = await req.json()
      
      if (action === 'bulk') {
        // Bulk package actions
        const data = bulkPackageActionSchema.parse(body)
        
        const results = []
        
        for (const packageId of data.packageIds) {
          try {
            const pkg = await prisma.package.findUnique({
              where: { id: packageId },
              include: {
                _count: {
                  select: {
                    bookings: {
                      where: { status: { in: ['PENDING', 'CONFIRMED'] } }
                    }
                  }
                }
              }
            })
            
            if (!pkg) {
              results.push({ packageId, success: false, error: 'Package not found' })
              continue
            }
            
            switch (data.action) {
              case 'activate':
              case 'deactivate':
                await prisma.package.update({
                  where: { id: packageId },
                  data: { isActive: data.action === 'activate' }
                })
                break
                
              case 'delete':
                if (pkg._count.bookings > 0) {
                  results.push({ 
                    packageId, 
                    success: false, 
                    error: 'Cannot delete package with active bookings' 
                  })
                  continue
                }
                
                await prisma.package.delete({
                  where: { id: packageId }
                })
                break
                
              case 'update_category':
                if (!data.data?.category) {
                  results.push({ packageId, success: false, error: 'Category is required' })
                  continue
                }
                
                await prisma.package.update({
                  where: { id: packageId },
                  data: { category: data.data.category }
                })
                break
                
              case 'update_pricing':
                if (!data.data?.priceAdjustment || !data.data?.adjustmentType) {
                  results.push({ 
                    packageId, 
                    success: false, 
                    error: 'Price adjustment and type are required' 
                  })
                  continue
                }
                
                const currentPrice = parseFloat(pkg.basePrice.toString())
                let newPrice: number
                
                if (data.data.adjustmentType === 'percentage') {
                  newPrice = currentPrice * (1 + data.data.priceAdjustment / 100)
                } else {
                  newPrice = currentPrice + data.data.priceAdjustment
                }
                
                await prisma.package.update({
                  where: { id: packageId },
                  data: { basePrice: newPrice }
                })
                break
                
              case 'duplicate':
                const duplicatedPackage = await prisma.package.create({
                  data: {
                    name: `${pkg.name} (Copy)`,
                    description: pkg.description,
                    category: pkg.category,
                    basePrice: pkg.basePrice,
                    duration: pkg.duration,
                    maxPax: pkg.maxPax,
                    minPax: pkg.minPax,
                    difficulty: pkg.difficulty,
                    tags: pkg.tags,
                    inclusions: pkg.inclusions,
                    exclusions: pkg.exclusions,
                    itinerary: pkg.itinerary,
                    images: pkg.images,
                    isActive: false, // Start as inactive
                    adminId: authenticatedReq.user!.adminId!
                  }
                })
                
                results.push({ 
                  packageId, 
                  success: true, 
                  newPackageId: duplicatedPackage.id 
                })
                continue
            }
            
            results.push({ packageId, success: true })
          } catch (error) {
            results.push({ 
              packageId, 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            })
          }
        }
        
        return NextResponse.json({
          action: data.action,
          results,
          summary: {
            total: data.packageIds.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
          }
        })
      }
      
      if (action === 'import') {
        // Import packages from CSV/JSON
        const data = packageImportSchema.parse(body)
        
        const results = []
        
        for (const packageData of data.packages) {
          try {
            // Check if package already exists
            const existingPackage = await prisma.package.findFirst({
              where: {
                name: packageData.name,
                category: packageData.category
              }
            })
            
            if (existingPackage) {
              results.push({ 
                name: packageData.name, 
                success: false, 
                error: 'Package with same name and category already exists' 
              })
              continue
            }
            
            // Create package
            const newPackage = await prisma.package.create({
              data: {
                ...packageData,
                adminId: authenticatedReq.user!.adminId!
              }
            })
            
            results.push({ 
              name: packageData.name, 
              success: true, 
              packageId: newPackage.id 
            })
          } catch (error) {
            results.push({ 
              name: packageData.name, 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            })
          }
        }
        
        return NextResponse.json({
          results,
          summary: {
            total: data.packages.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
          }
        })
      }
      
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}