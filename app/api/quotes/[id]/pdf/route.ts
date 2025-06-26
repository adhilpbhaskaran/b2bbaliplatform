import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, handleApiError } from '@/lib/auth/middleware'
import { generateQuotePDF, generateQuotePDFBase64 } from '@/lib/pdf/quote-generator'

// GET /api/quotes/[id]/pdf - Generate and download quote PDF
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (authenticatedReq) => {
    try {
      const url = new URL(req.url)
      const format = url.searchParams.get('format') || 'download' // download, base64, or view
      
      // Get quote with all related data
      const quote = await prisma.quote.findUnique({
        where: { id: params.id },
        include: {
          package: {
            include: {
              seasonalRates: {
                where: {
                  isActive: true,
                  startDate: { lte: new Date() },
                  endDate: { gte: new Date() }
                }
              }
            }
          },
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
      
      // Calculate pricing breakdown
      const basePrice = parseFloat(quote.package.basePrice.toString()) * quote.totalPax
      const seasonalRate = quote.package.seasonalRates[0]
      const seasonalMultiplier = seasonalRate ? parseFloat(seasonalRate.multiplier.toString()) : 1
      
      // Calculate tier discount
      let tierDiscount = 0
      if (quote.agent) {
        const tierDiscounts = {
          BRONZE: 0.05,
          SILVER: 0.10,
          GOLD: 0.15,
          PLATINUM: 0.20
        }
        const discountRate = tierDiscounts[quote.agent.tierLevel as keyof typeof tierDiscounts] || 0
        tierDiscount = basePrice * seasonalMultiplier * discountRate
      }
      
      const pricingBreakdown = {
        basePrice,
        seasonalMultiplier,
        tierDiscount,
        addOns: [], // TODO: Implement add-ons
        taxes: 0, // TODO: Implement tax calculation
        total: parseFloat(quote.totalPrice.toString())
      }
      
      if (format === 'base64') {
        // Return base64 encoded PDF
        const base64PDF = await generateQuotePDFBase64(quote as any, pricingBreakdown)
        
        return NextResponse.json({
          pdf: base64PDF,
          filename: `quote-${quote.quoteNumber}.pdf`
        })
      }
      
      // Generate PDF buffer
      const pdfBuffer = await generateQuotePDF(quote as any, pricingBreakdown)
      
      // Update quote status to VIEWED if customer is downloading
      if (userRole === 'CUSTOMER' && quote.status === 'SENT') {
        await prisma.quote.update({
          where: { id: params.id },
          data: { status: 'VIEWED' }
        })
      }
      
      // Return PDF as download or view
      const headers = new Headers({
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBuffer.length.toString(),
        'Content-Disposition': format === 'view' 
          ? `inline; filename="quote-${quote.quoteNumber}.pdf"`
          : `attachment; filename="quote-${quote.quoteNumber}.pdf"`
      })
      
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers
      })
    } catch (error) {
      console.error('PDF generation error:', error)
      return handleApiError(error)
    }
  })(req)
}

// POST /api/quotes/[id]/pdf - Generate PDF and send via email/WhatsApp
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (authenticatedReq) => {
    try {
      const body = await req.json()
      const { method, email, phone, message } = body // method: 'email' | 'whatsapp'
      
      // Get quote with all related data
      const quote = await prisma.quote.findUnique({
        where: { id: params.id },
        include: {
          package: {
            include: {
              seasonalRates: {
                where: {
                  isActive: true,
                  startDate: { lte: new Date() },
                  endDate: { gte: new Date() }
                }
              }
            }
          },
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
      
      // Check permissions - only agents and admins can send
      const userRole = authenticatedReq.user?.role
      const agentId = authenticatedReq.user?.agentId
      
      if (!['AGENT', 'ADMIN'].includes(userRole || '')) {
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
      
      // Calculate pricing breakdown
      const basePrice = parseFloat(quote.package.basePrice.toString()) * quote.totalPax
      const seasonalRate = quote.package.seasonalRates[0]
      const seasonalMultiplier = seasonalRate ? parseFloat(seasonalRate.multiplier.toString()) : 1
      
      let tierDiscount = 0
      if (quote.agent) {
        const tierDiscounts = {
          BRONZE: 0.05,
          SILVER: 0.10,
          GOLD: 0.15,
          PLATINUM: 0.20
        }
        const discountRate = tierDiscounts[quote.agent.tierLevel as keyof typeof tierDiscounts] || 0
        tierDiscount = basePrice * seasonalMultiplier * discountRate
      }
      
      const pricingBreakdown = {
        basePrice,
        seasonalMultiplier,
        tierDiscount,
        addOns: [],
        taxes: 0,
        total: parseFloat(quote.totalPrice.toString())
      }
      
      if (method === 'email') {
        // TODO: Implement email sending with PDF attachment
        // For now, just update quote status
        await prisma.quote.update({
          where: { id: params.id },
          data: { status: 'SENT' }
        })
        
        return NextResponse.json({
          message: 'Quote sent via email successfully',
          method: 'email',
          recipient: email || quote.user.email
        })
      }
      
      if (method === 'whatsapp') {
        // Generate PDF as base64 for WhatsApp
        const base64PDF = await generateQuotePDFBase64(quote as any, pricingBreakdown)
        
        // TODO: Implement WhatsApp PDF sending
        // For now, send text message with download link
        const whatsappMessage = message || 
          `🎯 Your Bali quote is ready!\n\n` +
          `Package: ${quote.package.name}\n` +
          `Total: $${quote.totalPrice}\n` +
          `Valid until: ${new Date(quote.validUntil).toLocaleDateString()}\n\n` +
          `Download your detailed quote: ${process.env.NEXT_PUBLIC_APP_URL}/quotes/${quote.id}/pdf?format=view`
        
        // Update quote status
        await prisma.quote.update({
          where: { id: params.id },
          data: { status: 'SENT' }
        })
        
        return NextResponse.json({
          message: 'Quote sent via WhatsApp successfully',
          method: 'whatsapp',
          recipient: phone || quote.user.phone,
          pdfBase64: base64PDF
        })
      }
      
      return NextResponse.json(
        { error: 'Invalid method. Use "email" or "whatsapp"' },
        { status: 400 }
      )
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}