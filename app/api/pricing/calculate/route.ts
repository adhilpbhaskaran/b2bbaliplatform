import { NextRequest, NextResponse } from 'next/server'
import { requireAgent } from '@/lib/auth'
import { calculateItemPrice, PricingContext } from '@/lib/pricing/itemized-pricing'
import { db } from '@/lib/db'
import { z } from 'zod'

const CalculatePricingSchema = z.object({
  itemType: z.string(),
  itemId: z.string(),
  date: z.string().datetime(),
  pax: z.number().min(1).default(1),
  nights: z.number().optional(),
  markupType: z.enum(['percentage', 'fixed']).optional(),
  markupValue: z.number().optional()
})

const BulkCalculatePricingSchema = z.object({
  items: z.array(CalculatePricingSchema),
  agentTier: z.string().optional()
})

// Calculate pricing for a single item
export async function POST(request: NextRequest) {
  try {
    const user = await requireAgent()
    const body = await request.json()
    
    // Check if it's bulk calculation
    if (body.items && Array.isArray(body.items)) {
      return handleBulkCalculation(body, user)
    }
    
    // Single item calculation
    const validatedData = CalculatePricingSchema.parse(body)
    
    // Get agent info for tier-based pricing
    const agent = await db.agent.findUnique({
      where: { userId: user.id }
    })
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent profile not found' },
        { status: 404 }
      )
    }
    
    const context: PricingContext = {
      date: new Date(validatedData.date),
      pax: validatedData.pax,
      nights: validatedData.nights,
      agentTier: agent.tier,
      markupType: validatedData.markupType,
      markupValue: validatedData.markupValue
    }
    
    const pricing = await calculateItemPrice(
      validatedData.itemType,
      validatedData.itemId,
      context
    )
    
    // Get item details for context
    const itemDetails = await getItemDetails(
      validatedData.itemType,
      validatedData.itemId
    )
    
    return NextResponse.json({
      success: true,
      data: {
        pricing,
        item: itemDetails,
        context: {
          date: validatedData.date,
          pax: validatedData.pax,
          nights: validatedData.nights,
          agentTier: agent.tier
        }
      }
    })
    
  } catch (error) {
    console.error('Error calculating pricing:', error)
    
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
      { error: 'Failed to calculate pricing' },
      { status: 500 }
    )
  }
}

// Handle bulk pricing calculation
async function handleBulkCalculation(body: any, user: any) {
  const validatedData = BulkCalculatePricingSchema.parse(body)
  
  // Get agent info
  const agent = await db.agent.findUnique({
    where: { userId: user.id }
  })
  
  if (!agent) {
    return NextResponse.json(
      { error: 'Agent profile not found' },
      { status: 404 }
    )
  }
  
  const results = []
  
  for (const item of validatedData.items) {
    try {
      const context: PricingContext = {
        date: new Date(item.date),
        pax: item.pax,
        nights: item.nights,
        agentTier: validatedData.agentTier || agent.tier,
        markupType: item.markupType,
        markupValue: item.markupValue
      }
      
      const pricing = await calculateItemPrice(
        item.itemType,
        item.itemId,
        context
      )
      
      const itemDetails = await getItemDetails(item.itemType, item.itemId)
      
      results.push({
        success: true,
        itemType: item.itemType,
        itemId: item.itemId,
        pricing,
        item: itemDetails
      })
      
    } catch (error) {
      results.push({
        success: false,
        itemType: item.itemType,
        itemId: item.itemId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
  
  // Calculate total if all items succeeded
  const successfulItems = results.filter(r => r.success)
  let total = null
  
  if (successfulItems.length === results.length) {
    const subtotal = successfulItems.reduce(
      (sum, item) => sum + (item.pricing?.finalPrice || 0), 
      0
    )
    
    // Apply agent tier discount
    const tierDiscounts: Record<string, number> = {
      BRONZE: 0.05,
      SILVER: 0.10,
      GOLD: 0.15,
      PLATINUM: 0.20
    }
    
    const discount = tierDiscounts[agent.tier] || 0
    const discountedPrice = subtotal * (1 - discount)
    
    total = {
      subtotal,
      agentDiscount: subtotal - discountedPrice,
      total: discountedPrice,
      agentTier: agent.tier
    }
  }
  
  return NextResponse.json({
    success: true,
    data: {
      items: results,
      total
    }
  })
}

// Get item details based on type
async function getItemDetails(itemType: string, itemId: string) {
  switch (itemType.toLowerCase()) {
    case 'hotel':
      return await db.hotel.findUnique({
        where: { id: itemId },
        select: {
          id: true,
          name: true,
          category: true,
          location: true,
          images: true
        }
      })
    
    case 'hotel_room':
      return await db.hotelRoom.findUnique({
        where: { id: itemId },
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
    
    case 'activity':
    case 'bookable_activity':
      return await db.bookableActivity.findUnique({
        where: { id: itemId },
        select: {
          id: true,
          name: true,
          category: true,
          type: true,
          location: true,
          duration: true,
          images: true,
          highlights: true
        }
      })
    
    case 'addon':
    case 'add_on':
      return await db.addOn.findUnique({
        where: { id: itemId },
        select: {
          id: true,
          name: true,
          category: true,
          location: true,
          images: true
        }
      })
    
    default:
      return null
  }
}

// Get seasonal rates for a date range
export async function GET(request: NextRequest) {
  try {
    await requireAgent()
    
    const { searchParams } = new URL(request.url)
    const itemType = searchParams.get('itemType')
    const itemId = searchParams.get('itemId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    if (!itemType || !itemId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }
    
    let seasonalRates = []
    
    if (itemType === 'hotel_room') {
      seasonalRates = await db.hotelSeasonalRate.findMany({
        where: {
          roomId: itemId,
          isActive: true,
          OR: [
            {
              startDate: {
                lte: new Date(endDate)
              },
              endDate: {
                gte: new Date(startDate)
              }
            }
          ]
        },
        orderBy: { startDate: 'asc' }
      })
    } else if (itemType === 'activity' || itemType === 'bookable_activity') {
      seasonalRates = await db.activitySeasonalRate.findMany({
        where: {
          activityId: itemId,
          isActive: true,
          OR: [
            {
              startDate: {
                lte: new Date(endDate)
              },
              endDate: {
                gte: new Date(startDate)
              }
            }
          ]
        },
        orderBy: { startDate: 'asc' }
      })
    }
    
    return NextResponse.json({
      success: true,
      data: seasonalRates
    })
    
  } catch (error) {
    console.error('Error fetching seasonal rates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch seasonal rates' },
      { status: 500 }
    )
  }
}