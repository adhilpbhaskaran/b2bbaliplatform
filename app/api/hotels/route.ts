import { NextRequest, NextResponse } from 'next/server'
import { requireAgent } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const CreateHotelSchema = z.object({
  name: z.string().min(1),
  category: z.string(),
  location: z.string(),
  description: z.string(),
  amenities: z.array(z.string()),
  images: z.array(z.string()),
  priceRange: z.record(z.any())
})

const UpdateHotelSchema = CreateHotelSchema.partial()

// Get all hotels
export async function GET(request: NextRequest) {
  try {
    await requireAgent()
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const category = searchParams.get('category')
    const location = searchParams.get('location')
    const search = searchParams.get('search')
    
    const skip = (page - 1) * limit
    
    const where: any = {
      isActive: true
    }
    
    if (category) {
      where.category = category
    }
    
    if (location) {
      where.location = {
        contains: location,
        mode: 'insensitive'
      }
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
        }
      ]
    }
    
    const [hotels, total] = await Promise.all([
      db.hotel.findMany({
        where,
        include: {
          rooms: {
            where: { isActive: true },
            orderBy: { basePrice: 'asc' }
          }
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit
      }),
      db.hotel.count({ where })
    ])
    
    return NextResponse.json({
      success: true,
      data: {
        hotels,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
    
  } catch (error) {
    console.error('Error fetching hotels:', error)
    return NextResponse.json(
      { error: 'Failed to fetch hotels' },
      { status: 500 }
    )
  }
}

// Create new hotel (admin only)
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
    const validatedData = CreateHotelSchema.parse(body)
    
    const hotel = await db.hotel.create({
      data: validatedData,
      include: {
        rooms: true
      }
    })
    
    return NextResponse.json({
      success: true,
      data: hotel
    })
    
  } catch (error) {
    console.error('Error creating hotel:', error)
    
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
      { error: 'Failed to create hotel' },
      { status: 500 }
    )
  }
}