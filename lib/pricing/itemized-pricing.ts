import { db } from '../db'
import { SeasonType } from '@prisma/client'

export interface PricingContext {
  date: Date
  pax: number
  nights?: number
  agentTier?: string
  markupType?: 'percentage' | 'fixed'
  markupValue?: number
}

export interface ItemPricing {
  basePrice: number
  seasonalPrice: number
  finalPrice: number
  seasonType: SeasonType
  appliedRate?: number
}

/**
 * Determine the season type for a given date
 */
export function getSeasonForDate(date: Date): SeasonType {
  const month = date.getMonth() + 1 // 1-12
  const day = date.getDate()
  
  // Peak season: December 20 - January 10, July 1 - August 31
  if (
    (month === 12 && day >= 20) ||
    (month === 1 && day <= 10) ||
    (month >= 7 && month <= 8)
  ) {
    return SeasonType.PEAK
  }
  
  // High season: June, September, December 1-19
  if (
    month === 6 ||
    month === 9 ||
    (month === 12 && day < 20)
  ) {
    return SeasonType.HIGH
  }
  
  // Medium season: April, May, October, November
  if (month >= 4 && month <= 5 || month >= 10 && month <= 11) {
    return SeasonType.MEDIUM
  }
  
  // Low season: January 11-31, February, March
  return SeasonType.LOW
}

/**
 * Calculate hotel room price with seasonal rates
 */
export async function calculateHotelRoomPrice(
  roomId: string,
  context: PricingContext
): Promise<ItemPricing> {
  const room = await db.hotelRoom.findUnique({
    where: { id: roomId },
    include: {
      seasonalRates: {
        where: {
          isActive: true,
          startDate: { lte: context.date },
          endDate: { gte: context.date }
        }
      }
    }
  })
  
  if (!room) {
    throw new Error(`Hotel room not found: ${roomId}`)
  }
  
  const basePrice = Number(room.basePrice)
  const seasonType = getSeasonForDate(context.date)
  
  // Find applicable seasonal rate
  const seasonalRate = room.seasonalRates.find(rate => 
    rate.seasonType === seasonType
  )
  
  let seasonalPrice = basePrice
  let appliedRate: number | undefined
  
  if (seasonalRate) {
    if (seasonalRate.fixedPrice) {
      seasonalPrice = Number(seasonalRate.fixedPrice)
    } else {
      appliedRate = Number(seasonalRate.multiplier)
      seasonalPrice = basePrice * appliedRate
    }
  }
  
  // Apply nights multiplier
  const totalPrice = seasonalPrice * (context.nights || 1)
  
  return {
    basePrice,
    seasonalPrice,
    finalPrice: totalPrice,
    seasonType,
    appliedRate
  }
}

/**
 * Calculate bookable activity price with seasonal rates
 */
export async function calculateActivityPrice(
  activityId: string,
  context: PricingContext
): Promise<ItemPricing> {
  const activity = await db.bookableActivity.findUnique({
    where: { id: activityId },
    include: {
      seasonalRates: {
        where: {
          isActive: true,
          startDate: { lte: context.date },
          endDate: { gte: context.date }
        }
      }
    }
  })
  
  if (!activity) {
    throw new Error(`Activity not found: ${activityId}`)
  }
  
  const basePrice = Number(activity.basePrice)
  const seasonType = getSeasonForDate(context.date)
  
  // Find applicable seasonal rate
  const seasonalRate = activity.seasonalRates.find(rate => 
    rate.seasonType === seasonType
  )
  
  let seasonalPrice = basePrice
  let appliedRate: number | undefined
  
  if (seasonalRate) {
    if (seasonalRate.fixedPrice) {
      seasonalPrice = Number(seasonalRate.fixedPrice)
    } else {
      appliedRate = Number(seasonalRate.multiplier)
      seasonalPrice = basePrice * appliedRate
    }
  }
  
  // Apply pax multiplier
  const totalPrice = seasonalPrice * context.pax
  
  return {
    basePrice,
    seasonalPrice,
    finalPrice: totalPrice,
    seasonType,
    appliedRate
  }
}

/**
 * Calculate addon price (no seasonal rates for addons)
 */
export async function calculateAddonPrice(
  addonId: string,
  context: PricingContext
): Promise<ItemPricing> {
  const addon = await db.addOn.findUnique({
    where: { id: addonId }
  })
  
  if (!addon) {
    throw new Error(`Addon not found: ${addonId}`)
  }
  
  const basePrice = Number(addon.price)
  const totalPrice = basePrice * context.pax
  
  return {
    basePrice,
    seasonalPrice: basePrice,
    finalPrice: totalPrice,
    seasonType: getSeasonForDate(context.date)
  }
}

/**
 * Calculate price for any item type
 */
export async function calculateItemPrice(
  itemType: string,
  itemId: string,
  context: PricingContext
): Promise<ItemPricing> {
  switch (itemType.toLowerCase()) {
    case 'hotel':
    case 'hotel_room':
      return calculateHotelRoomPrice(itemId, context)
    
    case 'activity':
    case 'bookable_activity':
      return calculateActivityPrice(itemId, context)
    
    case 'addon':
    case 'add_on':
      return calculateAddonPrice(itemId, context)
    
    default:
      throw new Error(`Unsupported item type: ${itemType}`)
  }
}

/**
 * Apply agent tier discounts
 */
export function applyAgentDiscount(
  price: number,
  agentTier: string
): number {
  const discounts: Record<string, number> = {
    BRONZE: 0.05,   // 5%
    SILVER: 0.10,   // 10%
    GOLD: 0.15,     // 15%
    PLATINUM: 0.20  // 20%
  }
  
  const discount = discounts[agentTier] || 0
  return price * (1 - discount)
}

/**
 * Apply markup to price
 */
export function applyMarkup(
  price: number,
  markupType: 'percentage' | 'fixed',
  markupValue: number
): number {
  if (markupType === 'percentage') {
    return price * (1 + markupValue / 100)
  } else {
    return price + markupValue
  }
}

/**
 * Calculate total quote price from items
 */
export function calculateQuoteTotal(
  items: Array<{
    finalPrice: number
    quantity?: number
  }>,
  agentTier?: string,
  markupType?: 'percentage' | 'fixed',
  markupValue?: number
): {
  subtotal: number
  agentDiscount: number
  markup: number
  total: number
} {
  const subtotal = items.reduce((sum, item) => 
    sum + (item.finalPrice * (item.quantity || 1)), 0
  )
  
  // Apply agent discount
  const discountedPrice = agentTier ? 
    applyAgentDiscount(subtotal, agentTier) : subtotal
  const agentDiscount = subtotal - discountedPrice
  
  // Apply markup
  const finalPrice = (markupType && markupValue) ?
    applyMarkup(discountedPrice, markupType, markupValue) : discountedPrice
  const markup = finalPrice - discountedPrice
  
  return {
    subtotal,
    agentDiscount,
    markup,
    total: finalPrice
  }
}