import { NextRequest, NextResponse } from 'next/server'
import { requireAgent } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const CreateActivitySchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  category: z.string(),
  type: z.string(),
  basePrice: z.number().min(0),
  duration: z.string().optional(),
  location: z.string().optional(),
  maxPax: z.number().optional(),
  minPax: z.number().min(1).default(1),
  images: z.array(z.string()),
  highlights: z.array(z.string()),
  inclusions: z.array(z.string()),
  exclusions: z.array(z.string()),
  requirements: z.array(z.string())
})

const UpdateActivitySchema = CreateActivitySchema.partial()

// Get all bookable activities
export async function GET(request: NextRequest) {
  try {
    await requireAgent()
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const category = searchParams.get('category')
    const type = searchParams.get('type')
    const location = searchParams.get('location')
    const search = searchParams.get('search')
    const maxPrice = searchParams.get('maxPrice')
    const minPrice = searchParams.get('minPrice')
    
    const skip = (page - 1) * limit
    
    const where: any = {
      isActive: true
    }
    
    if (category) {
      where.category = category
    }
    
    if (type) {
      where.type = type
    }
    
    if (location) {
      where.location = {
        contains: location,
        mode: 'insensitive'
      }
    }
    
    if (minPrice || maxPrice) {
      where.basePrice = {}
      if (minPrice) where.basePrice.gte = parseFloat(minPrice)
      if (maxPrice) where.basePrice.lte = parseFloat(maxPrice)
    }
    
    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          description: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          highlights: {
            hasSome: [search]
          }
        }
      ]
    }
    
    const [activities, total] = await Promise.all([
      db.bookableActivity.findMany({
        where,
        include: {
          seasonalRates: {
            where: { isActive: true },
            orderBy: { startDate: 'asc' }
          }
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit
      }),
      db.bookableActivity.count({ where })
    ])
    
    return NextResponse.json({
      success: true,
      data: {
        activities,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
    
  } catch (error) {
    console.error('Error fetching activities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    )
  }
}

// Create new activity (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await requireAgent()
    
    // Check if user is admin
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    const validatedData = CreateActivitySchema.parse(body)
    
    const activity = await db.bookableActivity.create({
      data: validatedData,
      include: {
        seasonalRates: true
      }
    })
    
    return NextResponse.json({
      success: true,
      data: activity
    })
    
  } catch (error) {
    console.error('Error creating activity:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          details: error.errors
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    )
  }
}

// Get activity categories and types for filtering
export async function OPTIONS(request: NextRequest) {
  try {
    await requireAgent()
    
    const [categories, types] = await Promise.all([
      db.bookableActivity.findMany({
        where: { isActive: true },
        select: { category: true },
        distinct: ['category']
      }),
      db.bookableActivity.findMany({
        where: { isActive: true },
        select: { type: true },
        distinct: ['type']
      })
    ])
    
    return NextResponse.json({
      success: true,
      data: {
        categories: categories.map(c => c.category),
        types: types.map(t => t.type)
      }
    })
    
  } catch (error) {
    console.error('Error fetching activity options:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity options' },
      { status: 500 }
    )
  }
}