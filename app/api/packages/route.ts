import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withAuth, withAdmin, handleApiError, getPaginationParams, formatPaginatedResponse } from '@/lib/auth/middleware'

const createPackageSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1),
  category: z.enum(['CULTURAL', 'ADVENTURE', 'BEACH', 'LUXURY', 'BUDGET', 'FAMILY', 'HONEYMOON', 'SPIRITUAL']),
  duration: z.number().min(1).max(30),
  basePrice: z.number().positive(),
  maxPax: z.number().min(1).max(50),
  highlights: z.array(z.string()).optional(),
  inclusions: z.array(z.string()).optional(),
  exclusions: z.array(z.string()).optional(),
  itinerary: z.array(z.object({
    day: z.number(),
    title: z.string(),
    description: z.string(),
    activities: z.array(z.string()).optional(),
    meals: z.array(z.string()).optional(),
    accommodation: z.string().optional()
  })).optional(),
  images: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
  difficulty: z.enum(['EASY', 'MODERATE', 'CHALLENGING']).optional(),
  ageRestriction: z.object({
    minAge: z.number().optional(),
    maxAge: z.number().optional()
  }).optional()
})

const updatePackageSchema = createPackageSchema.partial()

// GET /api/packages - List packages with filters
export async function GET(req: NextRequest) {
  try {
    const { page, limit, skip } = getPaginationParams(req)
    const url = new URL(req.url)
    
    const category = url.searchParams.get('category')
    const minPrice = url.searchParams.get('minPrice')
    const maxPrice = url.searchParams.get('maxPrice')
    const duration = url.searchParams.get('duration')
    const maxPax = url.searchParams.get('maxPax')
    const search = url.searchParams.get('search')
    const isActive = url.searchParams.get('isActive')
    const tags = url.searchParams.get('tags')?.split(',')
    const difficulty = url.searchParams.get('difficulty')
    const sortBy = url.searchParams.get('sortBy') || 'createdAt'
    const sortOrder = url.searchParams.get('sortOrder') || 'desc'
    
    const where: any = {}
    
    // Apply filters
    if (category) where.category = category
    if (isActive !== null) where.isActive = isActive === 'true'
    if (difficulty) where.difficulty = difficulty
    
    if (minPrice || maxPrice) {
      where.basePrice = {}
      if (minPrice) where.basePrice.gte = parseFloat(minPrice)
      if (maxPrice) where.basePrice.lte = parseFloat(maxPrice)
    }
    
    if (duration) {
      const durationNum = parseInt(duration)
      where.duration = durationNum
    }
    
    if (maxPax) {
      where.maxPax = { gte: parseInt(maxPax) }
    }
    
    if (tags && tags.length > 0) {
      where.tags = {
        hasSome: tags
      }
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { highlights: { hasSome: [search] } },
        { tags: { hasSome: [search] } }
      ]
    }
    
    // Build orderBy
    const orderBy: any = {}
    if (sortBy === 'price') {
      orderBy.basePrice = sortOrder
    } else if (sortBy === 'duration') {
      orderBy.duration = sortOrder
    } else if (sortBy === 'name') {
      orderBy.name = sortOrder
    } else {
      orderBy.createdAt = sortOrder
    }
    
    const [packages, total] = await Promise.all([
      prisma.package.findMany({
        where,
        include: {
          seasonalRates: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
          },
          _count: {
            select: {
              quotes: true,
              bookings: true
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.package.count({ where })
    ])
    
    return NextResponse.json(
      formatPaginatedResponse(packages, total, page, limit)
    )
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/packages - Create new package (Admin only)
export async function POST(req: NextRequest) {
  return withAdmin(async (authenticatedReq) => {
    try {
      const body = await req.json()
      const data = createPackageSchema.parse(body)
      
      const package_ = await prisma.package.create({
        data: {
          ...data,
          createdBy: authenticatedReq.user!.adminId!
        },
        include: {
          seasonalRates: true,
          _count: {
            select: {
              quotes: true,
              bookings: true
            }
          }
        }
      })
      
      return NextResponse.json(package_, { status: 201 })
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}