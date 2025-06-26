import { NextRequest, NextResponse } from 'next/server'
import { requireAgent } from '@/lib/auth'
import { buildQuote, QuoteInput, getQuoteWithItems } from '@/lib/pricing/quote-builder'
import { db } from '@/lib/db'
import { z } from 'zod'

const QuoteItemSchema = z.object({
  itemType: z.string(),
  itemId: z.string(),
  itemName: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().min(1).default(1),
  nights: z.number().optional(),
  pax: z.number().min(1).default(1),
  date: z.string().datetime().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  customizations: z.record(z.any()).optional()
})

const CreateItemizedQuoteSchema = z.object({
  clientName: z.string().min(1),
  clientEmail: z.string().email(),
  clientPhone: z.string().optional(),
  clientWhatsapp: z.string().optional(),
  duration: z.number().min(1),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  paxDetails: z.record(z.any()),
  markupType: z.enum(['percentage', 'fixed']).default('percentage'),
  markupValue: z.number().min(0).default(0),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  validUntil: z.string().datetime().optional(),
  items: z.array(QuoteItemSchema).min(1)
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAgent()
    const body = await request.json()
    
    // Validate input
    const validatedData = CreateItemizedQuoteSchema.parse(body)
    
    // Get agent record
    const agent = await db.agent.findUnique({
      where: { userId: user.id }
    })
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent profile not found' },
        { status: 404 }
      )
    }
    
    // Prepare quote input
    const quoteInput: QuoteInput = {
      agentId: agent.id,
      clientName: validatedData.clientName,
      clientEmail: validatedData.clientEmail,
      clientPhone: validatedData.clientPhone,
      clientWhatsapp: validatedData.clientWhatsapp,
      duration: validatedData.duration,
      startDate: validatedData.startDate ? new Date(validatedData.startDate) : undefined,
      endDate: validatedData.endDate ? new Date(validatedData.endDate) : undefined,
      paxDetails: validatedData.paxDetails,
      markupType: validatedData.markupType,
      markupValue: validatedData.markupValue,
      notes: validatedData.notes,
      internalNotes: validatedData.internalNotes,
      validUntil: validatedData.validUntil ? new Date(validatedData.validUntil) : undefined,
      items: validatedData.items.map(item => ({
        ...item,
        date: item.date ? new Date(item.date) : undefined,
        startDate: item.startDate ? new Date(item.startDate) : undefined,
        endDate: item.endDate ? new Date(item.endDate) : undefined
      })),
      isItemized: true
    }
    
    // Build the quote
    const result = await buildQuote(quoteInput)
    
    return NextResponse.json({
      success: true,
      data: {
        quote: result.quote,
        items: result.items,
        pricing: result.pricing
      }
    })
    
  } catch (error) {
    console.error('Error creating itemized quote:', error)
    
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
      { error: 'Failed to create itemized quote' },
      { status: 500 }
    )
  }
}

// Get itemized quote with all details
export async function GET(request: NextRequest) {
  try {
    const user = await requireAgent()
    const { searchParams } = new URL(request.url)
    const quoteId = searchParams.get('id')
    
    if (!quoteId) {
      return NextResponse.json(
        { error: 'Quote ID is required' },
        { status: 400 }
      )
    }
    
    const quote = await getQuoteWithItems(quoteId)
    
    if (!quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      )
    }
    
    // Check if user has access to this quote
    const agent = await db.agent.findUnique({
      where: { userId: user.id }
    })
    
    if (!agent || quote.agentId !== agent.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: quote
    })
    
  } catch (error) {
    console.error('Error fetching itemized quote:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quote' },
      { status: 500 }
    )
  }
}