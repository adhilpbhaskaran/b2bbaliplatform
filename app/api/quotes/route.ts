import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withAuth, handleApiError, getPaginationParams, formatPaginatedResponse } from '@/lib/auth/middleware'
import { quoteAssistant } from '@/lib/ai/quote-assistant'
import { generateQuotePDF } from '@/lib/pdf/quote-generator'
import { whatsappAutomation } from '@/lib/whatsapp/automation'

const createQuoteSchema = z.object({
  packageId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  totalPax: z.number().min(1).max(50),
  customDescription: z.string().optional(),
  specialRequests: z.string().optional(),
  customerInfo: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    nationality: z.string().optional()
  }).optional(),
  aiRequirements: z.object({
    budget: z.number().optional(),
    duration: z.number().optional(),
    interests: z.array(z.string()).optional(),
    groupSize: z.number().optional(),
    travelStyle: z.enum(['budget', 'standard', 'luxury']).optional(),
    specialRequests: z.string().optional()
  }).optional()
})

const updateQuoteSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED']).optional(),
  customDescription: z.string().optional(),
  specialRequests: z.string().optional(),
  validUntil: z.string().datetime().optional(),
  notes: z.string().optional()
})

// GET /api/quotes - List quotes with pagination and filters
export async function GET(req: NextRequest) {
  return withAuth(async (authenticatedReq) => {
    try {
      const { page, limit, skip } = getPaginationParams(req)
      const url = new URL(req.url)
      
      const status = url.searchParams.get('status')
      const agentId = url.searchParams.get('agentId')
      const userId = url.searchParams.get('userId')
      const packageId = url.searchParams.get('packageId')
      const search = url.searchParams.get('search')
      
      const where: any = {}
      
      // Role-based filtering
      if (authenticatedReq.user?.role === 'AGENT') {
        where.agentId = authenticatedReq.user.agentId
      } else if (authenticatedReq.user?.role === 'CUSTOMER') {
        where.userId = authenticatedReq.user.id
      }
      
      // Apply filters
      if (status) where.status = status
      if (agentId && authenticatedReq.user?.role === 'ADMIN') where.agentId = agentId
      if (userId && ['ADMIN', 'AGENT'].includes(authenticatedReq.user?.role || '')) where.userId = userId
      if (packageId) where.packageId = packageId
      
      if (search) {
        where.OR = [
          { quoteNumber: { contains: search, mode: 'insensitive' } },
          { user: { firstName: { contains: search, mode: 'insensitive' } } },
          { user: { lastName: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { package: { name: { contains: search, mode: 'insensitive' } } }
        ]
      }
      
      const [quotes, total] = await Promise.all([
        prisma.quote.findMany({
          where,
          include: {
            package: {
              select: {
                id: true,
                name: true,
                category: true,
                duration: true,
                basePrice: true
              }
            },
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true
              }
            },
            agent: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            booking: {
              select: {
                id: true,
                status: true,
                bookingNumber: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.quote.count({ where })
      ])
      
      return NextResponse.json(
        formatPaginatedResponse(quotes, total, page, limit)
      )
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}

// POST /api/quotes - Create new quote
export async function POST(req: NextRequest) {
  return withAuth(async (authenticatedReq) => {
    try {
      const body = await req.json()
      const data = createQuoteSchema.parse(body)
      
      // Get package details
      const package_ = await prisma.package.findUnique({
        where: { id: data.packageId },
        include: {
          seasonalRates: {
            where: {
              isActive: true,
              startDate: { lte: new Date(data.startDate) },
              endDate: { gte: new Date(data.endDate) }
            }
          }
        }
      })
      
      if (!package_) {
        return NextResponse.json(
          { error: 'Package not found' },
          { status: 404 }
        )
      }
      
      // Handle customer creation if needed
      let userId = data.userId
      if (!userId && data.customerInfo) {
        // Check if customer exists
        let customer = await prisma.user.findUnique({
          where: { email: data.customerInfo.email }
        })
        
        if (!customer) {
          // Create new customer
          customer = await prisma.user.create({
            data: {
              firstName: data.customerInfo.firstName,
              lastName: data.customerInfo.lastName,
              email: data.customerInfo.email,
              phone: data.customerInfo.phone,
              nationality: data.customerInfo.nationality,
              role: 'CUSTOMER',
              status: 'ACTIVE',
              source: 'QUOTE_FORM'
            }
          })
        }
        userId = customer.id
      }
      
      if (!userId) {
        return NextResponse.json(
          { error: 'User ID or customer info required' },
          { status: 400 }
        )
      }
      
      // Calculate pricing
      const basePrice = parseFloat(package_.basePrice.toString()) * data.totalPax
      let totalPrice = basePrice
      
      // Apply seasonal rates
      const seasonalRate = package_.seasonalRates[0]
      if (seasonalRate) {
        totalPrice *= parseFloat(seasonalRate.multiplier.toString())
      }
      
      // Apply agent tier discount
      if (authenticatedReq.user?.agentId) {
        const agent = await prisma.agent.findUnique({
          where: { id: authenticatedReq.user.agentId }
        })
        
        if (agent) {
          const tierDiscounts = {
            BRONZE: 0.05,
            SILVER: 0.10,
            GOLD: 0.15,
            PLATINUM: 0.20
          }
          const discount = tierDiscounts[agent.tierLevel as keyof typeof tierDiscounts] || 0
          totalPrice *= (1 - discount)
        }
      }
      
      // Generate quote number
      const quoteNumber = `Q${Date.now().toString().slice(-8)}`
      
      // Generate AI description if requirements provided
      let customDescription = data.customDescription
      if (data.aiRequirements && !customDescription) {
        customDescription = await quoteAssistant.generateQuoteDescription(
          package_,
          data.aiRequirements
        )
      }
      
      // Create quote
      const quote = await prisma.quote.create({
        data: {
          quoteNumber,
          packageId: data.packageId,
          userId,
          agentId: authenticatedReq.user?.agentId,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          totalPax: data.totalPax,
          totalPrice,
          customDescription,
          specialRequests: data.specialRequests,
          status: 'DRAFT',
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          metadata: {
            basePrice,
            seasonalMultiplier: seasonalRate ? parseFloat(seasonalRate.multiplier.toString()) : 1,
            aiGenerated: !!data.aiRequirements
          }
        },
        include: {
          package: true,
          user: true,
          agent: true
        }
      })
      
      // Send WhatsApp notification if user has phone
      if (quote.user.phone) {
        await whatsappAutomation.sendQuoteFollowUp(quote.id)
      }
      
      return NextResponse.json(quote, { status: 201 })
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}