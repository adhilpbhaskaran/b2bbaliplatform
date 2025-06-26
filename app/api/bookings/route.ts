import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withAuth, withAgent, withAdmin, handleApiError, getPaginationParams, formatPaginatedResponse } from '@/lib/auth/middleware'
import { whatsappAutomation } from '@/lib/whatsapp/automation'

const createBookingSchema = z.object({
  quoteId: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  totalPax: z.number().min(1).max(50),
  specialRequests: z.string().optional(),
  emergencyContact: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    relationship: z.string().min(1)
  }),
  travelers: z.array(z.object({
    name: z.string().min(1),
    age: z.number().min(0).max(120),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
    nationality: z.string().min(1),
    passportNumber: z.string().optional(),
    passportExpiry: z.string().datetime().optional(),
    dietaryRestrictions: z.string().optional(),
    medicalConditions: z.string().optional()
  })),
  paymentMethod: z.enum(['STRIPE', 'RAZORPAY', 'BANK_TRANSFER', 'CASH']).optional()
})

const updateBookingSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  totalPax: z.number().min(1).max(50).optional(),
  specialRequests: z.string().optional(),
  emergencyContact: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    relationship: z.string().min(1)
  }).optional(),
  travelers: z.array(z.object({
    name: z.string().min(1),
    age: z.number().min(0).max(120),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
    nationality: z.string().min(1),
    passportNumber: z.string().optional(),
    passportExpiry: z.string().datetime().optional(),
    dietaryRestrictions: z.string().optional(),
    medicalConditions: z.string().optional()
  })).optional(),
  adminNotes: z.string().optional()
})

// GET /api/bookings - List bookings with filters
export async function GET(req: NextRequest) {
  return withAuth(async (authenticatedReq) => {
    try {
      const { page, limit, skip } = getPaginationParams(req)
      const url = new URL(req.url)
      
      const status = url.searchParams.get('status')
      const agentId = url.searchParams.get('agentId')
      const userId = url.searchParams.get('userId')
      const packageId = url.searchParams.get('packageId')
      const startDate = url.searchParams.get('startDate')
      const endDate = url.searchParams.get('endDate')
      const search = url.searchParams.get('search')
      const sortBy = url.searchParams.get('sortBy') || 'createdAt'
      const sortOrder = url.searchParams.get('sortOrder') || 'desc'
      
      const where: any = {}
      
      // Role-based filtering
      if (authenticatedReq.user?.role === 'CUSTOMER') {
        where.userId = authenticatedReq.user.id
      } else if (authenticatedReq.user?.role === 'AGENT' && !authenticatedReq.user.adminId) {
        where.quote = {
          agentId: authenticatedReq.user.agentId
        }
      }
      
      // Apply filters
      if (status) where.status = status
      if (agentId) {
        where.quote = { ...where.quote, agentId }
      }
      if (userId) where.userId = userId
      if (packageId) {
        where.quote = { ...where.quote, packageId }
      }
      
      if (startDate || endDate) {
        where.startDate = {}
        if (startDate) where.startDate.gte = new Date(startDate)
        if (endDate) where.startDate.lte = new Date(endDate)
      }
      
      if (search) {
        where.OR = [
          { bookingNumber: { contains: search, mode: 'insensitive' } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { quote: { package: { name: { contains: search, mode: 'insensitive' } } } },
          { specialRequests: { contains: search, mode: 'insensitive' } }
        ]
      }
      
      // Build orderBy
      const orderBy: any = {}
      if (sortBy === 'startDate') {
        orderBy.startDate = sortOrder
      } else if (sortBy === 'totalAmount') {
        orderBy.totalAmount = sortOrder
      } else if (sortBy === 'status') {
        orderBy.status = sortOrder
      } else {
        orderBy.createdAt = sortOrder
      }
      
      const [bookings, total] = await Promise.all([
        prisma.booking.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            },
            quote: {
              include: {
                package: {
                  select: {
                    id: true,
                    name: true,
                    category: true,
                    duration: true,
                    images: true
                  }
                },
                agent: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            },
            payments: {
              select: {
                id: true,
                amount: true,
                status: true,
                paymentMethod: true,
                createdAt: true
              },
              orderBy: { createdAt: 'desc' }
            }
          },
          orderBy,
          skip,
          take: limit
        }),
        prisma.booking.count({ where })
      ])
      
      return NextResponse.json(
        formatPaginatedResponse(bookings, total, page, limit)
      )
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}

// POST /api/bookings - Create new booking
export async function POST(req: NextRequest) {
  return withAuth(async (authenticatedReq) => {
    try {
      const body = await req.json()
      const data = createBookingSchema.parse(body)
      
      // Verify quote exists and belongs to user (if customer)
      const quote = await prisma.quote.findUnique({
        where: { id: data.quoteId },
        include: {
          package: true,
          user: true,
          agent: true
        }
      })
      
      if (!quote) {
        return NextResponse.json(
          { error: 'Quote not found' },
          { status: 404 }
        )
      }
      
      // Check permissions
      if (authenticatedReq.user?.role === 'CUSTOMER' && quote.userId !== authenticatedReq.user.id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
      
      if (quote.status !== 'ACCEPTED') {
        return NextResponse.json(
          { error: 'Quote must be accepted before booking' },
          { status: 400 }
        )
      }
      
      // Validate dates
      const startDate = new Date(data.startDate)
      const endDate = new Date(data.endDate)
      
      if (startDate >= endDate) {
        return NextResponse.json(
          { error: 'End date must be after start date' },
          { status: 400 }
        )
      }
      
      if (startDate < new Date()) {
        return NextResponse.json(
          { error: 'Start date cannot be in the past' },
          { status: 400 }
        )
      }
      
      // Validate travelers count
      if (data.travelers.length !== data.totalPax) {
        return NextResponse.json(
          { error: 'Number of travelers must match total pax' },
          { status: 400 }
        )
      }
      
      // Generate booking number
      const bookingNumber = `BDM${Date.now().toString().slice(-8)}`
      
      // Create booking
      const booking = await prisma.booking.create({
        data: {
          bookingNumber,
          userId: quote.userId,
          quoteId: data.quoteId,
          startDate,
          endDate,
          totalPax: data.totalPax,
          totalAmount: quote.totalPrice,
          specialRequests: data.specialRequests,
          emergencyContact: data.emergencyContact,
          travelers: data.travelers,
          status: 'PENDING'
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          quote: {
            include: {
              package: true,
              agent: true
            }
          }
        }
      })
      
      // Update quote status
      await prisma.quote.update({
        where: { id: data.quoteId },
        data: { status: 'BOOKED' }
      })
      
      // Send WhatsApp confirmation
      try {
        await whatsappAutomation.sendBookingConfirmation(
          booking.user.phone || '',
          {
            bookingNumber: booking.bookingNumber,
            packageName: booking.quote.package.name,
            startDate: booking.startDate.toDateString(),
            totalAmount: booking.totalAmount.toString(),
            customerName: booking.user.name || ''
          }
        )
      } catch (whatsappError) {
        console.error('WhatsApp notification failed:', whatsappError)
        // Don't fail the booking creation if WhatsApp fails
      }
      
      return NextResponse.json(booking, { status: 201 })
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}