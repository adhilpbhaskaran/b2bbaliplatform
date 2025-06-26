import { db } from '../db'
import { QuoteStatus, TierLevel } from '@prisma/client'
import {
  calculateItemPrice,
  calculateQuoteTotal,
  PricingContext,
  ItemPricing
} from './itemized-pricing'

export interface QuoteItemInput {
  itemType: string
  itemId: string
  itemName?: string
  description?: string
  quantity?: number
  nights?: number
  pax?: number
  date?: Date
  startDate?: Date
  endDate?: Date
  notes?: string
  customizations?: Record<string, any>
}

export interface QuoteInput {
  agentId: string
  packageId?: string
  clientName: string
  clientEmail: string
  clientPhone?: string
  clientWhatsapp?: string
  duration: number
  startDate?: Date
  endDate?: Date
  paxDetails: Record<string, any>
  markupType?: 'percentage' | 'fixed'
  markupValue?: number
  notes?: string
  internalNotes?: string
  validUntil?: Date
  items?: QuoteItemInput[]
  isItemized?: boolean
}

export interface QuoteResult {
  quote: any
  items: any[]
  pricing: {
    subtotal: number
    agentDiscount: number
    markup: number
    total: number
    commission: number
  }
}

/**
 * Generate unique quote number
 */
export function generateQuoteNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substr(2, 4).toUpperCase()
  return `Q${timestamp}${random}`
}

/**
 * Build itemized quote with individual items
 */
export async function buildItemizedQuote(
  input: QuoteInput
): Promise<QuoteResult> {
  if (!input.items || input.items.length === 0) {
    throw new Error('Items are required for itemized quotes')
  }

  // Get agent info for tier-based pricing
  const agent = await db.agent.findUnique({
    where: { id: input.agentId },
    include: { user: true }
  })

  if (!agent) {
    throw new Error('Agent not found')
  }

  const quoteNumber = generateQuoteNumber()
  const validUntil = input.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

  // Calculate pricing for each item
  const itemPricings: Array<ItemPricing & { input: QuoteItemInput }> = []
  
  for (const item of input.items) {
    const context: PricingContext = {
      date: item.date || item.startDate || input.startDate || new Date(),
      pax: item.pax || 1,
      nights: item.nights,
      agentTier: agent.tier,
      markupType: input.markupType,
      markupValue: input.markupValue
    }

    const pricing = await calculateItemPrice(item.itemType, item.itemId, context)
    itemPricings.push({ ...pricing, input: item })
  }

  // Calculate total pricing
  const totalPricing = calculateQuoteTotal(
    itemPricings.map(p => ({ 
      finalPrice: p.finalPrice, 
      quantity: p.input.quantity 
    })),
    agent.tier,
    input.markupType,
    input.markupValue
  )

  // Calculate commission (10% of markup)
  const commission = totalPricing.markup * 0.1

  // Create quote in database
  const quote = await db.quote.create({
    data: {
      quoteNumber,
      agentId: input.agentId,
      packageId: input.packageId,
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      clientPhone: input.clientPhone,
      clientWhatsapp: input.clientWhatsapp,
      duration: input.duration,
      startDate: input.startDate,
      endDate: input.endDate,
      paxDetails: input.paxDetails,
      hotelOptions: {},
      addOns: {},
      customizations: {},
      markupType: input.markupType || 'percentage',
      markupValue: input.markupValue || 0,
      basePrice: totalPricing.subtotal,
      totalPrice: totalPricing.total,
      agentCommission: commission,
      status: QuoteStatus.DRAFT,
      validUntil,
      notes: input.notes,
      internalNotes: input.internalNotes,
      isItemized: true
    }
  })

  // Create quote items
  const createdItems = []
  for (let i = 0; i < itemPricings.length; i++) {
    const pricing = itemPricings[i]
    const itemInput = pricing.input

    const quoteItem = await db.quoteItem.create({
      data: {
        quoteId: quote.id,
        itemType: itemInput.itemType,
        itemId: itemInput.itemId,
        itemName: itemInput.itemName || `${itemInput.itemType} Item`,
        description: itemInput.description,
        quantity: itemInput.quantity || 1,
        nights: itemInput.nights,
        pax: itemInput.pax || 1,
        unitPrice: pricing.seasonalPrice,
        totalPrice: pricing.finalPrice,
        date: itemInput.date,
        startDate: itemInput.startDate,
        endDate: itemInput.endDate,
        notes: itemInput.notes,
        customizations: itemInput.customizations,
        // Set appropriate foreign keys based on item type
        hotelId: itemInput.itemType === 'hotel' ? itemInput.itemId : undefined,
        hotelRoomId: itemInput.itemType === 'hotel_room' ? itemInput.itemId : undefined,
        activityId: itemInput.itemType === 'activity' ? itemInput.itemId : undefined,
        addonId: itemInput.itemType === 'addon' ? itemInput.itemId : undefined
      }
    })

    createdItems.push(quoteItem)
  }

  return {
    quote,
    items: createdItems,
    pricing: {
      subtotal: totalPricing.subtotal,
      agentDiscount: totalPricing.agentDiscount,
      markup: totalPricing.markup,
      total: totalPricing.total,
      commission
    }
  }
}

/**
 * Build package-based quote (existing functionality)
 */
export async function buildPackageQuote(
  input: QuoteInput
): Promise<QuoteResult> {
  if (!input.packageId) {
    throw new Error('Package ID is required for package-based quotes')
  }

  // Get package and agent info
  const [package_, agent] = await Promise.all([
    db.package.findUnique({
      where: { id: input.packageId },
      include: { seasonalRates: true }
    }),
    db.agent.findUnique({
      where: { id: input.agentId },
      include: { user: true }
    })
  ])

  if (!package_) {
    throw new Error('Package not found')
  }
  if (!agent) {
    throw new Error('Agent not found')
  }

  const quoteNumber = generateQuoteNumber()
  const validUntil = input.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  // Calculate base price
  const totalPax = Object.values(input.paxDetails).reduce((sum: number, count: any) => sum + count, 0)
  const basePrice = Number(package_.basePrice) * totalPax

  // Apply seasonal rates if available
  let totalPrice = basePrice
  if (input.startDate) {
    const seasonalRate = package_.seasonalRates.find(rate => 
      rate.isActive &&
      rate.startDate <= input.startDate! &&
      rate.endDate >= input.startDate!
    )
    
    if (seasonalRate) {
      totalPrice = basePrice * Number(seasonalRate.multiplier)
    }
  }

  // Apply agent tier discount
  const tierDiscounts: Record<TierLevel, number> = {
    BRONZE: 0.05,
    SILVER: 0.10,
    GOLD: 0.15,
    PLATINUM: 0.20
  }
  
  const discount = tierDiscounts[agent.tier] || 0
  totalPrice = totalPrice * (1 - discount)

  // Apply markup
  if (input.markupType && input.markupValue) {
    if (input.markupType === 'percentage') {
      totalPrice = totalPrice * (1 + input.markupValue / 100)
    } else {
      totalPrice = totalPrice + input.markupValue
    }
  }

  const commission = (totalPrice - basePrice) * 0.1

  // Create quote
  const quote = await db.quote.create({
    data: {
      quoteNumber,
      agentId: input.agentId,
      packageId: input.packageId,
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      clientPhone: input.clientPhone,
      clientWhatsapp: input.clientWhatsapp,
      duration: input.duration,
      startDate: input.startDate,
      endDate: input.endDate,
      paxDetails: input.paxDetails,
      hotelOptions: {},
      addOns: {},
      customizations: {},
      markupType: input.markupType || 'percentage',
      markupValue: input.markupValue || 0,
      basePrice,
      totalPrice,
      agentCommission: commission,
      status: QuoteStatus.DRAFT,
      validUntil,
      notes: input.notes,
      internalNotes: input.internalNotes,
      isItemized: false
    }
  })

  return {
    quote,
    items: [],
    pricing: {
      subtotal: basePrice,
      agentDiscount: basePrice - totalPrice + (input.markupValue || 0),
      markup: input.markupValue || 0,
      total: totalPrice,
      commission
    }
  }
}

/**
 * Main quote builder function - handles both itemized and package quotes
 */
export async function buildQuote(input: QuoteInput): Promise<QuoteResult> {
  if (input.isItemized || input.items) {
    return buildItemizedQuote(input)
  } else {
    return buildPackageQuote(input)
  }
}

/**
 * Get quote with all items and pricing details
 */
export async function getQuoteWithItems(quoteId: string) {
  const quote = await db.quote.findUnique({
    where: { id: quoteId },
    include: {
      agent: {
        include: { user: true }
      },
      package: true,
      customer: true,
      items: {
        include: {
          hotel: true,
          hotelRoom: {
            include: { hotel: true }
          },
          activity: true,
          addon: true
        }
      }
    }
  })

  return quote
}

/**
 * Update quote items and recalculate pricing
 */
export async function updateQuoteItems(
  quoteId: string,
  items: QuoteItemInput[]
): Promise<QuoteResult> {
  const quote = await db.quote.findUnique({
    where: { id: quoteId },
    include: { agent: true }
  })

  if (!quote) {
    throw new Error('Quote not found')
  }

  // Delete existing items
  await db.quoteItem.deleteMany({
    where: { quoteId }
  })

  // Recalculate with new items
  const input: QuoteInput = {
    agentId: quote.agentId,
    packageId: quote.packageId,
    clientName: quote.clientName,
    clientEmail: quote.clientEmail,
    clientPhone: quote.clientPhone,
    clientWhatsapp: quote.clientWhatsapp,
    duration: quote.duration,
    startDate: quote.startDate,
    endDate: quote.endDate,
    paxDetails: quote.paxDetails as Record<string, any>,
    markupType: quote.markupType as 'percentage' | 'fixed',
    markupValue: Number(quote.markupValue),
    notes: quote.notes,
    internalNotes: quote.internalNotes,
    validUntil: quote.validUntil,
    items,
    isItemized: true
  }

  const result = await buildItemizedQuote(input)

  // Update quote with new pricing
  await db.quote.update({
    where: { id: quoteId },
    data: {
      basePrice: result.pricing.subtotal,
      totalPrice: result.pricing.total,
      agentCommission: result.pricing.commission
    }
  })

  return result
}