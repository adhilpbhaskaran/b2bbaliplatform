import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withAuth, withAdmin, handleApiError } from '@/lib/auth/middleware'

const updatePackageSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  category: z.enum(['CULTURAL', 'ADVENTURE', 'BEACH', 'LUXURY', 'BUDGET', 'FAMILY', 'HONEYMOON', 'SPIRITUAL']).optional(),
  duration: z.number().min(1).max(30).optional(),
  basePrice: z.number().positive().optional(),
  maxPax: z.number().min(1).max(50).optional(),
  highlights: z.array(z.string()).optional(),
  inclusions: z.array(z.string()).optional(),
  exclusions: z.array(z.string()).optional(),
  itinerary: z.array(z.object({
    day: z.number(),
    title: z.string(),
    description: z.string(),
    activities: z.array(z.string()).optional(),
    meals: z.array(z.string()).optional(),
    accommodation: z.string().optional()
  })).optional(),
  images: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  difficulty: z.enum(['EASY', 'MODERATE', 'CHALLENGING']).optional(),
  ageRestriction: z.object({
    minAge: z.number().optional(),
    maxAge: z.number().optional()
  }).optional()
})

// GET /api/packages/[id] - Get single package
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const url = new URL(req.url)
    const includeInactive = url.searchParams.get('includeInactive') === 'true'
    
    const where: any = { id: params.id }
    if (!includeInactive) {
      where.isActive = true
    }
    
    const package_ = await prisma.package.findUnique({
      where,
      include: {
        seasonalRates: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' }
        },
        quotes: {
          select: {
            id: true,
            status: true,
            totalPrice: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        bookings: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
            startDate: true,
            endDate: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        _count: {
          select: {
            quotes: true,
            bookings: true
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
    
    // Calculate package statistics
    const stats = {
      totalQuotes: package_._count.quotes,
      totalBookings: package_._count.bookings,
      averagePrice: package_.quotes.length > 0 
        ? package_.quotes.reduce((sum, q) => sum + parseFloat(q.totalPrice.toString()), 0) / package_.quotes.length
        : parseFloat(package_.basePrice.toString()),
      conversionRate: package_._count.quotes > 0 
        ? (package_._count.bookings / package_._count.quotes) * 100
        : 0
    }
    
    return NextResponse.json({
      ...package_,
      stats
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// PUT /api/packages/[id] - Update package (Admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAdmin(async (authenticatedReq) => {
    try {
      const body = await req.json()
      const data = updatePackageSchema.parse(body)
      
      // Check if package exists
      const existingPackage = await prisma.package.findUnique({
        where: { id: params.id }
      })
      
      if (!existingPackage) {
        return NextResponse.json(
          { error: 'Package not found' },
          { status: 404 }
        )
      }
      
      const updatedPackage = await prisma.package.update({
        where: { id: params.id },
        data: {
          ...data,
          updatedAt: new Date()
        },
        include: {
          seasonalRates: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
          },
          _count: {
            select: {
              quotes: true,
              bookings: true
            }
          }
        }
      })
      
      return NextResponse.json(updatedPackage)
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}

// DELETE /api/packages/[id] - Delete package (Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAdmin(async (authenticatedReq) => {
    try {
      // Check if package exists
      const package_ = await prisma.package.findUnique({
        where: { id: params.id },
        include: {
          quotes: true,
          bookings: true
        }
      })
      
      if (!package_) {
        return NextResponse.json(
          { error: 'Package not found' },
          { status: 404 }
        )
      }
      
      // Check if package has active bookings
      const activeBookings = package_.bookings.filter(
        booking => !['CANCELLED', 'COMPLETED'].includes(booking.status)
      )
      
      if (activeBookings.length > 0) {
        return NextResponse.json(
          { error: 'Cannot delete package with active bookings' },
          { status: 400 }
        )
      }
      
      // Soft delete by setting isActive to false instead of hard delete
      const url = new URL(req.url)
      const hardDelete = url.searchParams.get('hard') === 'true'
      
      if (hardDelete) {
        // Hard delete - only if no quotes or bookings exist
        if (package_.quotes.length > 0 || package_.bookings.length > 0) {
          return NextResponse.json(
            { error: 'Cannot permanently delete package with existing quotes or bookings' },
            { status: 400 }
          )
        }
        
        await prisma.package.delete({
          where: { id: params.id }
        })
        
        return NextResponse.json(
          { message: 'Package permanently deleted' },
          { status: 200 }
        )
      } else {
        // Soft delete
        await prisma.package.update({
          where: { id: params.id },
          data: {
            isActive: false,
            updatedAt: new Date()
          }
        })
        
        return NextResponse.json(
          { message: 'Package deactivated successfully' },
          { status: 200 }
        )
      }
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}