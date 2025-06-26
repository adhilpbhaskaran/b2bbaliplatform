import { NextRequest, NextResponse } from 'next/server'
import { requireAgent } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const CreateRoomSchema = z.object({
  name: z.string().min(1),
  type: z.string(),
  capacity: z.number().min(1),
  basePrice: z.number().min(0),
  description: z.string().optional(),
  amenities: z.array(z.string()),
  images: z.array(z.string())
})

const UpdateRoomSchema = CreateRoomSchema.partial()

// Get hotel rooms
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAgent()
    
    const hotelId = params.id
    
    const rooms = await db.hotelRoom.findMany({
      where: {
        hotelId,
        isActive: true
      },
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            location: true
          }
        },
        seasonalRates: {
          where: { isActive: true },
          orderBy: { startDate: 'asc' }
        }
      },
      orderBy: { basePrice: 'asc' }
    })
    
    return NextResponse.json({
      success: true,
      data: rooms
    })
    
  } catch (error) {
    console.error('Error fetching hotel rooms:', error)
    return NextResponse.json(
      { error: 'Failed to fetch hotel rooms' },
      { status: 500 }
    )
  }
}

// Create new room (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAgent()
    
    // Check if user is admin
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }
    
    const hotelId = params.id
    const body = await request.json()
    const validatedData = CreateRoomSchema.parse(body)
    
    // Verify hotel exists
    const hotel = await db.hotel.findUnique({
      where: { id: hotelId }
    })
    
    if (!hotel) {
      return NextResponse.json(
        { error: 'Hotel not found' },
        { status: 404 }
      )
    }
    
    const room = await db.hotelRoom.create({
      data: {
        ...validatedData,
        hotelId
      },
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            location: true
          }
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      data: room
    })
    
  } catch (error) {
    console.error('Error creating hotel room:', error)
    
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
      { error: 'Failed to create hotel room' },
      { status: 500 }
    )
  }
}