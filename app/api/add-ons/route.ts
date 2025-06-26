import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

// Validation schemas
const CreateAddonSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  price: z.number().positive('Price must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  isActive: z.boolean().default(true),
  maxQuantity: z.number().positive().optional(),
  availableLocations: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  images: z.array(z.string()).optional()
})

const GetAddonsSchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1),
  limit: z.string().transform(val => Math.min(parseInt(val) || 20, 100)),
  search: z.string().optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  minPrice: z.string().transform(val => val ? parseFloat(val) : undefined).optional(),
  maxPrice: z.string().transform(val => val ? parseFloat(val) : undefined).optional(),
  isActive: z.string().transform(val => val === 'true' ? true : val === 'false' ? false : undefined).optional(),
  sortBy: z.enum(['name', 'price', 'category', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  options: z.string().optional() // For getting filter options
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    
    const validatedParams = GetAddonsSchema.parse(params)
    const { 
      page, 
      limit, 
      search, 
      category, 
      location, 
      minPrice, 
      maxPrice, 
      isActive,
      sortBy, 
      sortOrder,
      options
    } = validatedParams

    // If requesting filter options
    if (options === 'true') {
      const [categories, locations] = await Promise.all([
        db.addOn.findMany({
          select: { category: true },
          distinct: ['category'],
          where: { isActive: true }
        }),
        db.addOn.findMany({
          select: { availableLocations: true },
          where: { 
            isActive: true,
            availableLocations: { not: null }
          }
        })
      ])

      const uniqueLocations = [...new Set(
        locations.flatMap(addon => addon.availableLocations || [])
      )]

      return NextResponse.json({
        success: true,
        data: {
          categories: categories.map(c => c.category),
          locations: uniqueLocations
        }
      })
    }

    // Build where clause
    const where: any = {}
    
    if (isActive !== undefined) {
      where.isActive = isActive
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    if (category) {
      where.category = category
    }
    
    if (location) {
      where.availableLocations = {
        has: location
      }
    }
    
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {}
      if (minPrice !== undefined) where.price.gte = minPrice
      if (maxPrice !== undefined) where.price.lte = maxPrice
    }

    // Get total count
    const total = await db.addOn.count({ where })

    // Get addons with pagination
    const addons = await db.addOn.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        price: true,
        unit: true,
        isActive: true,
        maxQuantity: true,
        availableLocations: true,
        requirements: true,
        images: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        addons,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching add-ons:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = CreateAddonSchema.parse(body)

    const addon = await db.addOn.create({
      data: {
        ...validatedData,
        createdBy: session.user.id
      },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        price: true,
        unit: true,
        isActive: true,
        maxQuantity: true,
        availableLocations: true,
        requirements: true,
        images: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      success: true,
      data: addon,
      message: 'Add-on created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating add-on:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get distinct categories and locations for filter options
    const [categories, locations] = await Promise.all([
      db.addOn.findMany({
        select: { category: true },
        distinct: ['category'],
        where: { isActive: true }
      }),
      db.addOn.findMany({
        select: { availableLocations: true },
        where: { 
          isActive: true,
          availableLocations: { not: null }
        }
      })
    ])

    const uniqueLocations = [...new Set(
      locations.flatMap(addon => addon.availableLocations || [])
    )]

    return NextResponse.json({
      success: true,
      data: {
        categories: categories.map(c => c.category),
        locations: uniqueLocations
      }
    })

  } catch (error) {
    console.error('Error fetching add-on options:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}