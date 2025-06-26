import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withAuth, withAgent, withAdmin, handleApiError, getPaginationParams, formatPaginatedResponse } from '@/lib/auth/middleware'
import { whatsappAutomation } from '@/lib/whatsapp/automation'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

const createPaymentSchema = z.object({
  bookingId: z.string().uuid(),
  amount: z.number().positive(),
  paymentMethod: z.enum(['STRIPE', 'RAZORPAY', 'BANK_TRANSFER', 'CASH']),
  currency: z.string().default('USD'),
  description: z.string().optional(),
  metadata: z.record(z.string()).optional(),
  // Stripe specific
  paymentMethodId: z.string().optional(),
  // Bank transfer specific
  bankDetails: z.object({
    accountName: z.string(),
    accountNumber: z.string(),
    bankName: z.string(),
    routingNumber: z.string().optional()
  }).optional(),
  // Cash specific
  receivedBy: z.string().optional(),
  receiptNumber: z.string().optional()
})

const updatePaymentSchema = z.object({
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED']).optional(),
  amount: z.number().positive().optional(),
  description: z.string().optional(),
  metadata: z.record(z.string()).optional(),
  adminNotes: z.string().optional(),
  receiptNumber: z.string().optional(),
  refundReason: z.string().optional()
})

// GET /api/payments - List payments with filters
export async function GET(req: NextRequest) {
  return withAuth(async (authenticatedReq) => {
    try {
      const { page, limit, skip } = getPaginationParams(req)
      const url = new URL(req.url)
      
      const status = url.searchParams.get('status')
      const paymentMethod = url.searchParams.get('paymentMethod')
      const bookingId = url.searchParams.get('bookingId')
      const userId = url.searchParams.get('userId')
      const agentId = url.searchParams.get('agentId')
      const startDate = url.searchParams.get('startDate')
      const endDate = url.searchParams.get('endDate')
      const search = url.searchParams.get('search')
      const sortBy = url.searchParams.get('sortBy') || 'createdAt'
      const sortOrder = url.searchParams.get('sortOrder') || 'desc'
      
      const where: any = {}
      
      // Role-based filtering
      if (authenticatedReq.user?.role === 'CUSTOMER') {
        where.booking = {
          userId: authenticatedReq.user.id
        }
      } else if (authenticatedReq.user?.role === 'AGENT' && !authenticatedReq.user.adminId) {
        where.booking = {
          quote: {
            agentId: authenticatedReq.user.agentId
          }
        }
      }
      
      // Apply filters
      if (status) where.status = status
      if (paymentMethod) where.paymentMethod = paymentMethod
      if (bookingId) where.bookingId = bookingId
      
      if (userId) {
        where.booking = { ...where.booking, userId }
      }
      
      if (agentId) {
        where.booking = {
          ...where.booking,
          quote: { agentId }
        }
      }
      
      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) where.createdAt.gte = new Date(startDate)
        if (endDate) where.createdAt.lte = new Date(endDate)
      }
      
      if (search) {
        where.OR = [
          { transactionId: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { receiptNumber: { contains: search, mode: 'insensitive' } },
          { booking: { bookingNumber: { contains: search, mode: 'insensitive' } } },
          { booking: { user: { name: { contains: search, mode: 'insensitive' } } } },
          { booking: { user: { email: { contains: search, mode: 'insensitive' } } } }
        ]
      }
      
      // Build orderBy
      const orderBy: any = {}
      if (sortBy === 'amount') {
        orderBy.amount = sortOrder
      } else if (sortBy === 'status') {
        orderBy.status = sortOrder
      } else if (sortBy === 'paymentMethod') {
        orderBy.paymentMethod = sortOrder
      } else {
        orderBy.createdAt = sortOrder
      }
      
      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where,
          include: {
            booking: {
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
                        category: true
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
                }
              }
            }
          },
          orderBy,
          skip,
          take: limit
        }),
        prisma.payment.count({ where })
      ])
      
      return NextResponse.json(
        formatPaginatedResponse(payments, total, page, limit)
      )
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}

// POST /api/payments - Create new payment
export async function POST(req: NextRequest) {
  return withAuth(async (authenticatedReq) => {
    try {
      const body = await req.json()
      const data = createPaymentSchema.parse(body)
      
      // Verify booking exists and user has permission
      const booking = await prisma.booking.findUnique({
        where: { id: data.bookingId },
        include: {
          user: true,
          quote: {
            include: {
              package: true,
              agent: true
            }
          },
          payments: true
        }
      })
      
      if (!booking) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        )
      }
      
      // Check permissions
      if (authenticatedReq.user?.role === 'CUSTOMER' && booking.userId !== authenticatedReq.user.id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
      
      if (authenticatedReq.user?.role === 'AGENT' && 
          !authenticatedReq.user.adminId && 
          booking.quote.agentId !== authenticatedReq.user.agentId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
      
      // Check if booking is in valid state for payment
      if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
        return NextResponse.json(
          { error: 'Cannot process payment for this booking status' },
          { status: 400 }
        )
      }
      
      // Calculate remaining balance
      const totalPaid = booking.payments
        .filter(p => p.status === 'COMPLETED')
        .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0)
      
      const remainingBalance = parseFloat(booking.totalAmount.toString()) - totalPaid
      
      if (data.amount > remainingBalance) {
        return NextResponse.json(
          { error: `Payment amount exceeds remaining balance of ${remainingBalance}` },
          { status: 400 }
        )
      }
      
      let paymentData: any = {
        bookingId: data.bookingId,
        amount: data.amount,
        currency: data.currency,
        paymentMethod: data.paymentMethod,
        description: data.description || `Payment for booking ${booking.bookingNumber}`,
        metadata: data.metadata || {},
        status: 'PENDING'
      }
      
      // Handle different payment methods
      if (data.paymentMethod === 'STRIPE') {
        if (!data.paymentMethodId) {
          return NextResponse.json(
            { error: 'Payment method ID required for Stripe payments' },
            { status: 400 }
          )
        }
        
        try {
          // Create Stripe payment intent
          const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(data.amount * 100), // Convert to cents
            currency: data.currency.toLowerCase(),
            payment_method: data.paymentMethodId,
            confirmation_method: 'manual',
            confirm: true,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/bookings/${booking.id}`,
            metadata: {
              bookingId: booking.id,
              bookingNumber: booking.bookingNumber,
              userId: booking.userId
            }
          })
          
          paymentData.stripePaymentIntentId = paymentIntent.id
          paymentData.transactionId = paymentIntent.id
          
          if (paymentIntent.status === 'succeeded') {
            paymentData.status = 'COMPLETED'
          } else if (paymentIntent.status === 'requires_action') {
            paymentData.status = 'PENDING'
            paymentData.metadata.requiresAction = true
            paymentData.metadata.clientSecret = paymentIntent.client_secret
          }
        } catch (stripeError: any) {
          return NextResponse.json(
            { error: `Stripe payment failed: ${stripeError.message}` },
            { status: 400 }
          )
        }
      } else if (data.paymentMethod === 'BANK_TRANSFER') {
        if (!data.bankDetails) {
          return NextResponse.json(
            { error: 'Bank details required for bank transfer payments' },
            { status: 400 }
          )
        }
        
        paymentData.bankDetails = data.bankDetails
        paymentData.transactionId = `BT${Date.now()}`
        paymentData.status = 'PENDING' // Requires manual verification
      } else if (data.paymentMethod === 'CASH') {
        if (!data.receivedBy) {
          return NextResponse.json(
            { error: 'Received by field required for cash payments' },
            { status: 400 }
          )
        }
        
        paymentData.receivedBy = data.receivedBy
        paymentData.receiptNumber = data.receiptNumber || `CASH${Date.now()}`
        paymentData.transactionId = paymentData.receiptNumber
        paymentData.status = 'COMPLETED' // Cash is immediately completed
      }
      
      // Create payment record
      const payment = await prisma.payment.create({
        data: paymentData,
        include: {
          booking: {
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
          }
        }
      })
      
      // Send WhatsApp notification for successful payments
      if (payment.status === 'COMPLETED') {
        try {
          const phone = payment.booking.user.phone
          if (phone) {
            const newBalance = remainingBalance - data.amount
            await whatsappAutomation.sendMessage(
              phone,
              `✅ Payment received! Amount: ${data.currency} ${data.amount}\nBooking: ${booking.bookingNumber}\nRemaining balance: ${data.currency} ${newBalance.toFixed(2)}`
            )
          }
        } catch (whatsappError) {
          console.error('WhatsApp notification failed:', whatsappError)
        }
      }
      
      return NextResponse.json(payment, { status: 201 })
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}