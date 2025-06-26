import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withAuth, withAgent, withAdmin, handleApiError } from '@/lib/auth/middleware'
import { whatsappAutomation } from '@/lib/whatsapp/automation'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
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

const refundPaymentSchema = z.object({
  amount: z.number().positive().optional(), // Partial refund amount
  reason: z.string().min(1),
  refundMethod: z.enum(['ORIGINAL', 'BANK_TRANSFER', 'CASH']).default('ORIGINAL')
})

// GET /api/payments/[id] - Get single payment
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (authenticatedReq) => {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: params.id },
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
                      category: true,
                      duration: true
                    }
                  },
                  agent: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      phone: true
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
            }
          }
        }
      })
      
      if (!payment) {
        return NextResponse.json(
          { error: 'Payment not found' },
          { status: 404 }
        )
      }
      
      // Check permissions
      if (authenticatedReq.user?.role === 'CUSTOMER' && 
          payment.booking.userId !== authenticatedReq.user.id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
      
      if (authenticatedReq.user?.role === 'AGENT' && 
          !authenticatedReq.user.adminId && 
          payment.booking.quote.agentId !== authenticatedReq.user.agentId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
      
      // Get Stripe payment details if applicable
      let stripeDetails = null
      if (payment.paymentMethod === 'STRIPE' && payment.stripePaymentIntentId) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(
            payment.stripePaymentIntentId
          )
          stripeDetails = {
            status: paymentIntent.status,
            clientSecret: paymentIntent.client_secret,
            charges: paymentIntent.charges.data.map(charge => ({
              id: charge.id,
              amount: charge.amount / 100,
              currency: charge.currency,
              status: charge.status,
              receiptUrl: charge.receipt_url,
              createdAt: new Date(charge.created * 1000)
            }))
          }
        } catch (stripeError) {
          console.error('Failed to fetch Stripe details:', stripeError)
        }
      }
      
      // Calculate payment summary for the booking
      const paymentSummary = {
        totalAmount: parseFloat(payment.booking.totalAmount.toString()),
        totalPaid: payment.booking.payments
          .filter(p => p.status === 'COMPLETED')
          .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0),
        totalPending: payment.booking.payments
          .filter(p => p.status === 'PENDING')
          .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0),
        totalRefunded: payment.booking.payments
          .filter(p => p.status === 'REFUNDED')
          .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0)
      }
      
      paymentSummary.remainingBalance = paymentSummary.totalAmount - paymentSummary.totalPaid
      
      return NextResponse.json({
        ...payment,
        stripeDetails,
        paymentSummary
      })
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}

// PUT /api/payments/[id] - Update payment
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (authenticatedReq) => {
    try {
      const body = await req.json()
      const data = updatePaymentSchema.parse(body)
      
      // Get existing payment
      const existingPayment = await prisma.payment.findUnique({
        where: { id: params.id },
        include: {
          booking: {
            include: {
              user: true,
              quote: {
                include: {
                  agent: true
                }
              }
            }
          }
        }
      })
      
      if (!existingPayment) {
        return NextResponse.json(
          { error: 'Payment not found' },
          { status: 404 }
        )
      }
      
      // Check permissions
      const isCustomer = authenticatedReq.user?.role === 'CUSTOMER'
      const isAgent = authenticatedReq.user?.role === 'AGENT'
      const isAdmin = authenticatedReq.user?.role === 'ADMIN'
      
      if (isCustomer) {
        return NextResponse.json(
          { error: 'Customers cannot update payments' },
          { status: 403 }
        )
      }
      
      if (isAgent && 
          !authenticatedReq.user?.adminId && 
          existingPayment.booking.quote.agentId !== authenticatedReq.user.agentId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
      
      // Validate status transitions
      if (data.status && data.status !== existingPayment.status) {
        const validTransitions: Record<string, string[]> = {
          'PENDING': ['COMPLETED', 'FAILED', 'CANCELLED'],
          'COMPLETED': ['REFUNDED'], // Can only refund completed payments
          'FAILED': ['PENDING'], // Can retry failed payments
          'CANCELLED': [], // Cannot transition from cancelled
          'REFUNDED': [] // Cannot transition from refunded
        }
        
        if (!validTransitions[existingPayment.status]?.includes(data.status)) {
          return NextResponse.json(
            { error: `Invalid status transition from ${existingPayment.status} to ${data.status}` },
            { status: 400 }
          )
        }
        
        // Special handling for Stripe payments
        if (existingPayment.paymentMethod === 'STRIPE' && 
            existingPayment.stripePaymentIntentId && 
            data.status === 'COMPLETED') {
          try {
            // Confirm the payment intent if not already confirmed
            const paymentIntent = await stripe.paymentIntents.retrieve(
              existingPayment.stripePaymentIntentId
            )
            
            if (paymentIntent.status !== 'succeeded') {
              return NextResponse.json(
                { error: 'Cannot mark Stripe payment as completed - payment not succeeded in Stripe' },
                { status: 400 }
              )
            }
          } catch (stripeError) {
            console.error('Stripe verification failed:', stripeError)
            return NextResponse.json(
              { error: 'Failed to verify Stripe payment status' },
              { status: 400 }
            )
          }
        }
      }
      
      const updateData: any = {
        ...data,
        updatedAt: new Date()
      }
      
      const updatedPayment = await prisma.payment.update({
        where: { id: params.id },
        data: updateData,
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
      
      // Send WhatsApp notifications for status changes
      if (data.status && data.status !== existingPayment.status) {
        try {
          const phone = updatedPayment.booking.user.phone
          if (phone) {
            if (data.status === 'COMPLETED') {
              await whatsappAutomation.sendMessage(
                phone,
                `✅ Payment confirmed! Amount: ${updatedPayment.currency} ${updatedPayment.amount}\nBooking: ${updatedPayment.booking.bookingNumber}\nThank you for your payment!`
              )
            } else if (data.status === 'FAILED') {
              await whatsappAutomation.sendMessage(
                phone,
                `❌ Payment failed for booking ${updatedPayment.booking.bookingNumber}. Please try again or contact us for assistance.`
              )
            } else if (data.status === 'REFUNDED') {
              await whatsappAutomation.sendMessage(
                phone,
                `💰 Refund processed for booking ${updatedPayment.booking.bookingNumber}. Amount: ${updatedPayment.currency} ${updatedPayment.amount}. Please allow 3-5 business days for the refund to appear.`
              )
            }
          }
        } catch (whatsappError) {
          console.error('WhatsApp notification failed:', whatsappError)
        }
      }
      
      return NextResponse.json(updatedPayment)
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}

// DELETE /api/payments/[id] - Cancel/Refund payment
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAgent(async (authenticatedReq) => {
    try {
      const url = new URL(req.url)
      const action = url.searchParams.get('action') || 'cancel' // 'cancel' or 'refund'
      
      const payment = await prisma.payment.findUnique({
        where: { id: params.id },
        include: {
          booking: {
            include: {
              user: true,
              quote: {
                include: {
                  agent: true
                }
              }
            }
          }
        }
      })
      
      if (!payment) {
        return NextResponse.json(
          { error: 'Payment not found' },
          { status: 404 }
        )
      }
      
      // Check permissions
      if (authenticatedReq.user?.role === 'AGENT' && 
          !authenticatedReq.user.adminId && 
          payment.booking.quote.agentId !== authenticatedReq.user.agentId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
      
      if (action === 'refund') {
        // Handle refund
        if (payment.status !== 'COMPLETED') {
          return NextResponse.json(
            { error: 'Can only refund completed payments' },
            { status: 400 }
          )
        }
        
        const body = await req.json()
        const refundData = refundPaymentSchema.parse(body)
        
        const refundAmount = refundData.amount || parseFloat(payment.amount.toString())
        
        if (refundAmount > parseFloat(payment.amount.toString())) {
          return NextResponse.json(
            { error: 'Refund amount cannot exceed payment amount' },
            { status: 400 }
          )
        }
        
        let refundResult: any = {}
        
        // Handle Stripe refunds
        if (payment.paymentMethod === 'STRIPE' && payment.stripePaymentIntentId) {
          try {
            const refund = await stripe.refunds.create({
              payment_intent: payment.stripePaymentIntentId,
              amount: Math.round(refundAmount * 100), // Convert to cents
              reason: 'requested_by_customer',
              metadata: {
                bookingId: payment.booking.id,
                originalPaymentId: payment.id,
                refundReason: refundData.reason
              }
            })
            
            refundResult.stripeRefundId = refund.id
            refundResult.stripeStatus = refund.status
          } catch (stripeError: any) {
            return NextResponse.json(
              { error: `Stripe refund failed: ${stripeError.message}` },
              { status: 400 }
            )
          }
        }
        
        // Update payment status
        const updatedPayment = await prisma.payment.update({
          where: { id: params.id },
          data: {
            status: 'REFUNDED',
            refundReason: refundData.reason,
            metadata: {
              ...payment.metadata,
              refundAmount,
              refundMethod: refundData.refundMethod,
              refundedAt: new Date().toISOString(),
              ...refundResult
            },
            updatedAt: new Date()
          }
        })
        
        // Send WhatsApp notification
        try {
          const phone = payment.booking.user.phone
          if (phone) {
            await whatsappAutomation.sendMessage(
              phone,
              `💰 Refund processed for booking ${payment.booking.bookingNumber}\nAmount: ${payment.currency} ${refundAmount}\nReason: ${refundData.reason}\nPlease allow 3-5 business days for the refund to appear.`
            )
          }
        } catch (whatsappError) {
          console.error('WhatsApp notification failed:', whatsappError)
        }
        
        return NextResponse.json({
          message: 'Payment refunded successfully',
          payment: updatedPayment,
          refundAmount
        })
      } else {
        // Handle cancellation
        if (!['PENDING', 'FAILED'].includes(payment.status)) {
          return NextResponse.json(
            { error: 'Can only cancel pending or failed payments' },
            { status: 400 }
          )
        }
        
        // Cancel Stripe payment intent if applicable
        if (payment.paymentMethod === 'STRIPE' && payment.stripePaymentIntentId) {
          try {
            await stripe.paymentIntents.cancel(payment.stripePaymentIntentId)
          } catch (stripeError) {
            console.error('Failed to cancel Stripe payment intent:', stripeError)
            // Continue with local cancellation even if Stripe fails
          }
        }
        
        const cancelledPayment = await prisma.payment.update({
          where: { id: params.id },
          data: {
            status: 'CANCELLED',
            updatedAt: new Date()
          }
        })
        
        return NextResponse.json({
          message: 'Payment cancelled successfully',
          payment: cancelledPayment
        })
      }
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}