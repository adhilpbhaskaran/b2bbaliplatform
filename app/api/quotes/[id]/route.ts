import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withAuth, handleApiError } from '@/lib/auth/middleware'
import { generateQuotePDF } from '@/lib/pdf/quote-generator'
import { whatsappAutomation } from '@/lib/whatsapp/automation'

const updateQuoteSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED']).optional(),
  customDescription: z.string().optional(),
  specialRequests: z.string().optional(),
  validUntil: z.string().datetime().optional(),
  notes: z.string().optional(),
  totalPrice: z.number().positive().optional()
})

// GET /api/quotes/[id] - Get single quote
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (authenticatedReq) => {
    try {
      const quote = await prisma.quote.findUnique({
        where: { id: params.id },
        include: {
          package: {
            include: {
              seasonalRates: {
                where: { isActive: true }
              }
            }
          },
          user: true,
          agent: true,
          booking: {
            include: {
              payments: true
            }
          },
          aiConversations: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      })
      
      if (!quote) {
        return NextResponse.json(
          { error: 'Quote not found' },
          { status: 404 }
        )
      }
      
      // Check permissions
      const userRole = authenticatedReq.user?.role
      const userId = authenticatedReq.user?.id
      const agentId = authenticatedReq.user?.agentId
      
      if (userRole === 'CUSTOMER' && quote.userId !== userId) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
      
      if (userRole === 'AGENT' && quote.agentId !== agentId) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
      
      // Update status to VIEWED if customer is viewing
      if (userRole === 'CUSTOMER' && quote.status === 'SENT') {
        await prisma.quote.update({
          where: { id: params.id },
          data: { status: 'VIEWED' }
        })
        quote.status = 'VIEWED'
      }
      
      return NextResponse.json(quote)
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}

// PUT /api/quotes/[id] - Update quote
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (authenticatedReq) => {
    try {
      const body = await req.json()
      const data = updateQuoteSchema.parse(body)
      
      // Get existing quote
      const existingQuote = await prisma.quote.findUnique({
        where: { id: params.id },
        include: {
          user: true,
          agent: true
        }
      })
      
      if (!existingQuote) {
        return NextResponse.json(
          { error: 'Quote not found' },
          { status: 404 }
        )
      }
      
      // Check permissions
      const userRole = authenticatedReq.user?.role
      const agentId = authenticatedReq.user?.agentId
      
      if (userRole === 'AGENT' && existingQuote.agentId !== agentId) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
      
      if (userRole === 'CUSTOMER') {
        // Customers can only update status to ACCEPTED or REJECTED
        const allowedStatuses = ['ACCEPTED', 'REJECTED']
        if (data.status && !allowedStatuses.includes(data.status)) {
          return NextResponse.json(
            { error: 'Invalid status update' },
            { status: 400 }
          )
        }
        
        // Only allow status updates for customers
        const customerData = { status: data.status }
        const updatedQuote = await prisma.quote.update({
          where: { id: params.id },
          data: customerData,
          include: {
            package: true,
            user: true,
            agent: true
          }
        })
        
        // Create booking if accepted
        if (data.status === 'ACCEPTED') {
          const bookingNumber = `B${Date.now().toString().slice(-8)}`
          
          await prisma.booking.create({
            data: {
              bookingNumber,
              quoteId: params.id,
              userId: existingQuote.userId,
              agentId: existingQuote.agentId,
              startDate: existingQuote.startDate,
              endDate: existingQuote.endDate,
              totalPax: existingQuote.totalPax,
              totalAmount: existingQuote.totalPrice,
              status: 'CONFIRMED',
              paymentStatus: 'PENDING'
            }
          })
          
          // Send WhatsApp confirmation
          if (existingQuote.user.phone) {
            await whatsappAutomation.sendBookingConfirmation(params.id)
          }
        }
        
        return NextResponse.json(updatedQuote)
      }
      
      // Agents and admins can update all fields
      const updateData: any = {}
      if (data.status) updateData.status = data.status
      if (data.customDescription) updateData.customDescription = data.customDescription
      if (data.specialRequests) updateData.specialRequests = data.specialRequests
      if (data.validUntil) updateData.validUntil = new Date(data.validUntil)
      if (data.notes) updateData.notes = data.notes
      if (data.totalPrice) updateData.totalPrice = data.totalPrice
      
      const updatedQuote = await prisma.quote.update({
        where: { id: params.id },
        data: updateData,
        include: {
          package: true,
          user: true,
          agent: true,
          booking: true
        }
      })
      
      // Send WhatsApp notification if status changed to SENT
      if (data.status === 'SENT' && existingQuote.status !== 'SENT') {
        if (updatedQuote.user.phone) {
          await whatsappAutomation.sendQuoteFollowUp(params.id)
        }
      }
      
      return NextResponse.json(updatedQuote)
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}

// DELETE /api/quotes/[id] - Delete quote
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (authenticatedReq) => {
    try {
      // Check if quote exists
      const quote = await prisma.quote.findUnique({
        where: { id: params.id },
        include: {
          booking: true
        }
      })
      
      if (!quote) {
        return NextResponse.json(
          { error: 'Quote not found' },
          { status: 404 }
        )
      }
      
      // Check permissions
      const userRole = authenticatedReq.user?.role
      const agentId = authenticatedReq.user?.agentId
      
      if (userRole === 'AGENT' && quote.agentId !== agentId) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
      
      // Prevent deletion if quote has booking
      if (quote.booking) {
        return NextResponse.json(
          { error: 'Cannot delete quote with existing booking' },
          { status: 400 }
        )
      }
      
      // Only allow deletion of DRAFT or REJECTED quotes
      if (!['DRAFT', 'REJECTED', 'EXPIRED'].includes(quote.status)) {
        return NextResponse.json(
          { error: 'Cannot delete quote in current status' },
          { status: 400 }
        )
      }
      
      await prisma.quote.delete({
        where: { id: params.id }
      })
      
      return NextResponse.json(
        { message: 'Quote deleted successfully' },
        { status: 200 }
      )
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}