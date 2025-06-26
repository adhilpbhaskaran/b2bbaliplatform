import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withAuth, withAgent, withAdmin, handleApiError } from '@/lib/auth/middleware'
import { whatsappAutomation } from '@/lib/whatsapp/automation'

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

// GET /api/bookings/[id] - Get single booking
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (authenticatedReq) => {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: params.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              createdAt: true
            }
          },
          quote: {
            include: {
              package: {
                include: {
                  seasonalRates: {
                    where: { isActive: true },
                    orderBy: { createdAt: 'desc' }
                  }
                }
              },
              agent: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  tierLevel: true
                }
              }
            }
          },
          payments: {
            orderBy: { createdAt: 'desc' }
          }
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
      
      // Calculate payment summary
      const paymentSummary = {
        totalPaid: booking.payments
          .filter(p => p.status === 'COMPLETED')
          .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0),
        totalPending: booking.payments
          .filter(p => p.status === 'PENDING')
          .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0),
        totalRefunded: booking.payments
          .filter(p => p.status === 'REFUNDED')
          .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0),
        remainingBalance: parseFloat(booking.totalAmount.toString()) - booking.payments
          .filter(p => p.status === 'COMPLETED')
          .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0)
      }
      
      return NextResponse.json({
        ...booking,
        paymentSummary
      })
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}

// PUT /api/bookings/[id] - Update booking
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (authenticatedReq) => {
    try {
      const body = await req.json()
      const data = updateBookingSchema.parse(body)
      
      // Get existing booking
      const existingBooking = await prisma.booking.findUnique({
        where: { id: params.id },
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
      
      if (!existingBooking) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        )
      }
      
      // Check permissions
      const isCustomer = authenticatedReq.user?.role === 'CUSTOMER'
      const isAgent = authenticatedReq.user?.role === 'AGENT'
      const isAdmin = authenticatedReq.user?.role === 'ADMIN'
      
      if (isCustomer && existingBooking.userId !== authenticatedReq.user.id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
      
      if (isAgent && 
          !authenticatedReq.user?.adminId && 
          existingBooking.quote.agentId !== authenticatedReq.user.agentId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
      
      // Restrict customer updates
      if (isCustomer) {
        // Customers can only update certain fields and only if booking is PENDING
        if (existingBooking.status !== 'PENDING') {
          return NextResponse.json(
            { error: 'Cannot modify confirmed booking' },
            { status: 400 }
          )
        }
        
        // Only allow specific fields for customers
        const allowedFields = ['specialRequests', 'emergencyContact', 'travelers']
        const hasDisallowedFields = Object.keys(data).some(key => !allowedFields.includes(key))
        
        if (hasDisallowedFields) {
          return NextResponse.json(
            { error: 'Customers can only update special requests, emergency contact, and traveler details' },
            { status: 400 }
          )
        }
      }
      
      // Validate status transitions
      if (data.status && data.status !== existingBooking.status) {
        const validTransitions: Record<string, string[]> = {
          'PENDING': ['CONFIRMED', 'CANCELLED'],
          'CONFIRMED': ['COMPLETED', 'CANCELLED'],
          'CANCELLED': [], // Cannot transition from cancelled
          'COMPLETED': [] // Cannot transition from completed
        }
        
        if (!validTransitions[existingBooking.status]?.includes(data.status)) {
          return NextResponse.json(
            { error: `Invalid status transition from ${existingBooking.status} to ${data.status}` },
            { status: 400 }
          )
        }
        
        // Check for pending payments before cancellation
        if (data.status === 'CANCELLED') {
          const pendingPayments = existingBooking.payments.filter(p => p.status === 'PENDING')
          if (pendingPayments.length > 0) {
            return NextResponse.json(
              { error: 'Cannot cancel booking with pending payments' },
              { status: 400 }
            )
          }
        }
      }
      
      // Validate date changes
      if (data.startDate || data.endDate) {
        const startDate = data.startDate ? new Date(data.startDate) : existingBooking.startDate
        const endDate = data.endDate ? new Date(data.endDate) : existingBooking.endDate
        
        if (startDate >= endDate) {
          return NextResponse.json(
            { error: 'End date must be after start date' },
            { status: 400 }
          )
        }
        
        if (startDate < new Date() && existingBooking.status !== 'COMPLETED') {
          return NextResponse.json(
            { error: 'Start date cannot be in the past' },
            { status: 400 }
          )
        }
      }
      
      // Validate travelers if provided
      if (data.travelers && data.totalPax) {
        if (data.travelers.length !== data.totalPax) {
          return NextResponse.json(
            { error: 'Number of travelers must match total pax' },
            { status: 400 }
          )
        }
      }
      
      const updateData: any = {
        ...data,
        updatedAt: new Date()
      }
      
      // Convert date strings to Date objects
      if (data.startDate) updateData.startDate = new Date(data.startDate)
      if (data.endDate) updateData.endDate = new Date(data.endDate)
      
      const updatedBooking = await prisma.booking.update({
        where: { id: params.id },
        data: updateData,
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
          },
          payments: {
            orderBy: { createdAt: 'desc' }
          }
        }
      })
      
      // Send WhatsApp notifications for status changes
      if (data.status && data.status !== existingBooking.status) {
        try {
          const phone = updatedBooking.user.phone
          if (phone) {
            if (data.status === 'CONFIRMED') {
              await whatsappAutomation.sendMessage(
                phone,
                `🎉 Great news! Your booking ${updatedBooking.bookingNumber} for ${updatedBooking.quote.package.name} has been confirmed. We'll be in touch with more details soon!`
              )
            } else if (data.status === 'CANCELLED') {
              await whatsappAutomation.sendMessage(
                phone,
                `We're sorry to inform you that your booking ${updatedBooking.bookingNumber} has been cancelled. Please contact us if you have any questions.`
              )
            } else if (data.status === 'COMPLETED') {
              await whatsappAutomation.sendMessage(
                phone,
                `Thank you for choosing Bali DMC! We hope you enjoyed your ${updatedBooking.quote.package.name} experience. We'd love to hear your feedback!`
              )
            }
          }
        } catch (whatsappError) {
          console.error('WhatsApp notification failed:', whatsappError)
          // Don't fail the update if WhatsApp fails
        }
      }
      
      return NextResponse.json(updatedBooking)
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}

// DELETE /api/bookings/[id] - Cancel/Delete booking
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (authenticatedReq) => {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: params.id },
        include: {
          user: true,
          quote: {
            include: {
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
      const isCustomer = authenticatedReq.user?.role === 'CUSTOMER'
      const isAgent = authenticatedReq.user?.role === 'AGENT'
      const isAdmin = authenticatedReq.user?.role === 'ADMIN'
      
      if (isCustomer && booking.userId !== authenticatedReq.user.id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
      
      if (isAgent && 
          !authenticatedReq.user?.adminId && 
          booking.quote.agentId !== authenticatedReq.user.agentId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
      
      // Check if booking can be cancelled
      if (booking.status === 'COMPLETED') {
        return NextResponse.json(
          { error: 'Cannot cancel completed booking' },
          { status: 400 }
        )
      }
      
      if (booking.status === 'CANCELLED') {
        return NextResponse.json(
          { error: 'Booking is already cancelled' },
          { status: 400 }
        )
      }
      
      // Check for pending payments
      const pendingPayments = booking.payments.filter(p => p.status === 'PENDING')
      if (pendingPayments.length > 0) {
        return NextResponse.json(
          { error: 'Cannot cancel booking with pending payments' },
          { status: 400 }
        )
      }
      
      const url = new URL(req.url)
      const hardDelete = url.searchParams.get('hard') === 'true'
      
      if (hardDelete && !isAdmin) {
        return NextResponse.json(
          { error: 'Only admins can permanently delete bookings' },
          { status: 403 }
        )
      }
      
      if (hardDelete) {
        // Hard delete - only if no payments exist
        if (booking.payments.length > 0) {
          return NextResponse.json(
            { error: 'Cannot permanently delete booking with payment history' },
            { status: 400 }
          )
        }
        
        await prisma.booking.delete({
          where: { id: params.id }
        })
        
        return NextResponse.json(
          { message: 'Booking permanently deleted' },
          { status: 200 }
        )
      } else {
        // Soft delete - update status to cancelled
        const cancelledBooking = await prisma.booking.update({
          where: { id: params.id },
          data: {
            status: 'CANCELLED',
            updatedAt: new Date()
          }
        })
        
        // Send WhatsApp notification
        try {
          const phone = booking.user.phone
          if (phone) {
            await whatsappAutomation.sendMessage(
              phone,
              `Your booking ${booking.bookingNumber} has been cancelled. If you have any questions, please contact us.`
            )
          }
        } catch (whatsappError) {
          console.error('WhatsApp notification failed:', whatsappError)
        }
        
        return NextResponse.json(
          { message: 'Booking cancelled successfully', booking: cancelledBooking },
          { status: 200 }
        )
      }
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}