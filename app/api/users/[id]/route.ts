import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withAuth, withAdmin, handleApiError } from '@/lib/auth/middleware'
import { clerkClient } from '@clerk/nextjs/server'

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(100).optional(),
  phone: z.string().optional(),
  role: z.enum(['CUSTOMER', 'AGENT', 'ADMIN']).optional(),
  isActive: z.boolean().optional(),
  preferences: z.object({
    currency: z.string().optional(),
    language: z.string().optional(),
    notifications: z.object({
      email: z.boolean().optional(),
      whatsapp: z.boolean().optional(),
      sms: z.boolean().optional()
    }).optional(),
    marketing: z.boolean().optional()
  }).optional()
})

const updateAgentSchema = z.object({
  tierLevel: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']).optional(),
  commission: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
  specializations: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional()
})

const updateAdminSchema = z.object({
  permissions: z.array(z.string()).optional()
})

// GET /api/users/[id] - Get single user
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (authenticatedReq) => {
    try {
      const url = new URL(req.url)
      const includeStats = url.searchParams.get('includeStats') === 'true'
      const includeActivity = url.searchParams.get('includeActivity') === 'true'
      
      // Check permissions - users can view their own profile, admins can view any
      if (authenticatedReq.user?.role !== 'ADMIN' && 
          authenticatedReq.user?.id !== params.id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
      
      const user = await prisma.user.findUnique({
        where: { id: params.id },
        include: {
          agent: true,
          admin: true,
          quotes: includeActivity ? {
            select: {
              id: true,
              status: true,
              totalPrice: true,
              createdAt: true,
              package: {
                select: {
                  name: true,
                  category: true
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
          } : false,
          bookings: includeActivity ? {
            select: {
              id: true,
              bookingNumber: true,
              status: true,
              totalAmount: true,
              startDate: true,
              endDate: true,
              createdAt: true,
              quote: {
                select: {
                  package: {
                    select: {
                      name: true,
                      category: true
                    }
                  }
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
          } : false
        }
      })
      
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
      
      let userWithStats = user
      
      if (includeStats) {
        const stats = {
          totalQuotes: 0,
          totalBookings: 0,
          totalRevenue: 0,
          completedBookings: 0,
          pendingBookings: 0,
          cancelledBookings: 0,
          averageBookingValue: 0,
          lastActivity: null as Date | null,
          joinedDaysAgo: Math.floor(
            (new Date().getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          )
        }
        
        if (user.role === 'CUSTOMER') {
          const [quotes, bookings, payments, bookingStats] = await Promise.all([
            prisma.quote.count({ where: { userId: user.id } }),
            prisma.booking.count({ where: { userId: user.id } }),
            prisma.payment.aggregate({
              where: {
                booking: { userId: user.id },
                status: 'COMPLETED'
              },
              _sum: { amount: true }
            }),
            prisma.booking.groupBy({
              by: ['status'],
              where: { userId: user.id },
              _count: { status: true }
            })
          ])
          
          stats.totalQuotes = quotes
          stats.totalBookings = bookings
          stats.totalRevenue = parseFloat(payments._sum.amount?.toString() || '0')
          stats.averageBookingValue = bookings > 0 ? stats.totalRevenue / bookings : 0
          
          // Process booking stats
          bookingStats.forEach(stat => {
            if (stat.status === 'COMPLETED') stats.completedBookings = stat._count.status
            if (stat.status === 'PENDING') stats.pendingBookings = stat._count.status
            if (stat.status === 'CANCELLED') stats.cancelledBookings = stat._count.status
          })
          
          // Get last activity
          const lastBooking = await prisma.booking.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true }
          })
          stats.lastActivity = lastBooking?.createdAt || null
          
        } else if (user.role === 'AGENT' && user.agent) {
          const [quotes, bookings, agentBookings] = await Promise.all([
            prisma.quote.count({ where: { agentId: user.agent.id } }),
            prisma.booking.count({
              where: {
                quote: { agentId: user.agent.id }
              }
            }),
            prisma.booking.findMany({
              where: {
                quote: { agentId: user.agent.id },
                status: 'COMPLETED'
              },
              include: {
                payments: {
                  where: { status: 'COMPLETED' }
                }
              }
            })
          ])
          
          stats.totalQuotes = quotes
          stats.totalBookings = bookings
          stats.completedBookings = agentBookings.length
          
          // Calculate agent commission revenue
          stats.totalRevenue = agentBookings.reduce((sum, booking) => {
            const bookingRevenue = booking.payments.reduce(
              (paySum, payment) => paySum + parseFloat(payment.amount.toString()),
              0
            )
            return sum + (bookingRevenue * (user.agent!.commission / 100))
          }, 0)
          
          stats.averageBookingValue = stats.completedBookings > 0 
            ? stats.totalRevenue / stats.completedBookings 
            : 0
          
          // Get booking status counts
          const bookingStats = await prisma.booking.groupBy({
            by: ['status'],
            where: {
              quote: { agentId: user.agent.id }
            },
            _count: { status: true }
          })
          
          bookingStats.forEach(stat => {
            if (stat.status === 'PENDING') stats.pendingBookings = stat._count.status
            if (stat.status === 'CANCELLED') stats.cancelledBookings = stat._count.status
          })
          
          // Get last activity
          const lastQuote = await prisma.quote.findFirst({
            where: { agentId: user.agent.id },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true }
          })
          stats.lastActivity = lastQuote?.createdAt || null
        }
        
        userWithStats = {
          ...user,
          stats
        }
      }
      
      return NextResponse.json(userWithStats)
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}

// PUT /api/users/[id] - Update user
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (authenticatedReq) => {
    try {
      const body = await req.json()
      const data = updateUserSchema.parse(body)
      
      // Get existing user
      const existingUser = await prisma.user.findUnique({
        where: { id: params.id },
        include: {
          agent: true,
          admin: true
        }
      })
      
      if (!existingUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
      
      // Check permissions
      const isOwnProfile = authenticatedReq.user?.id === params.id
      const isAdmin = authenticatedReq.user?.role === 'ADMIN'
      
      if (!isOwnProfile && !isAdmin) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
      
      // Restrict what non-admins can update
      if (!isAdmin) {
        const restrictedFields = ['role', 'isActive']
        const hasRestrictedFields = Object.keys(data).some(key => 
          restrictedFields.includes(key)
        )
        
        if (hasRestrictedFields) {
          return NextResponse.json(
            { error: 'Only admins can update role and active status' },
            { status: 403 }
          )
        }
      }
      
      // Check for email conflicts
      if (data.email && data.email !== existingUser.email) {
        const emailExists = await prisma.user.findFirst({
          where: {
            email: data.email,
            id: { not: params.id }
          }
        })
        
        if (emailExists) {
          return NextResponse.json(
            { error: 'Email already in use' },
            { status: 400 }
          )
        }
      }
      
      // Handle role changes (admin only)
      if (data.role && data.role !== existingUser.role && isAdmin) {
        // Check if user has active bookings/quotes that would be affected
        if (existingUser.role === 'AGENT' && data.role !== 'AGENT') {
          const activeQuotes = await prisma.quote.count({
            where: {
              agentId: existingUser.agent?.id,
              status: { in: ['PENDING', 'SENT', 'VIEWED'] }
            }
          })
          
          if (activeQuotes > 0) {
            return NextResponse.json(
              { error: 'Cannot change role - agent has active quotes' },
              { status: 400 }
            )
          }
        }
      }
      
      // Merge preferences
      const updatedPreferences = data.preferences 
        ? {
            ...existingUser.preferences,
            ...data.preferences,
            notifications: {
              ...existingUser.preferences?.notifications,
              ...data.preferences.notifications
            }
          }
        : existingUser.preferences
      
      const updateData = {
        ...data,
        preferences: updatedPreferences,
        updatedAt: new Date()
      }
      
      // Update user in transaction with role-specific updates
      const updatedUser = await prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id: params.id },
          data: updateData,
          include: {
            agent: true,
            admin: true
          }
        })
        
        // Update role-specific records
        if (user.agent && (data.name || data.email || data.phone)) {
          await tx.agent.update({
            where: { id: user.agent.id },
            data: {
              ...(data.name && { name: data.name }),
              ...(data.email && { email: data.email }),
              ...(data.phone && { phone: data.phone })
            }
          })
        }
        
        if (user.admin && (data.name || data.email)) {
          await tx.admin.update({
            where: { id: user.admin.id },
            data: {
              ...(data.name && { name: data.name }),
              ...(data.email && { email: data.email })
            }
          })
        }
        
        // Handle role changes
        if (data.role && data.role !== existingUser.role) {
          // Remove old role record
          if (existingUser.role === 'AGENT' && existingUser.agent) {
            await tx.agent.update({
              where: { id: existingUser.agent.id },
              data: { isActive: false }
            })
          }
          
          // Create new role record
          if (data.role === 'AGENT' && !user.agent) {
            await tx.agent.create({
              data: {
                userId: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                tierLevel: 'BRONZE',
                commission: 10,
                isActive: true
              }
            })
          } else if (data.role === 'ADMIN' && !user.admin) {
            await tx.admin.create({
              data: {
                userId: user.id,
                name: user.name,
                email: user.email,
                permissions: ['read']
              }
            })
          }
        }
        
        return user
      })
      
      // Update Clerk user if email or name changed
      if (data.email || data.name) {
        try {
          await clerkClient.users.updateUser(existingUser.clerkId, {
            ...(data.email && { emailAddress: [data.email] }),
            ...(data.name && { firstName: data.name.split(' ')[0], lastName: data.name.split(' ').slice(1).join(' ') })
          })
        } catch (clerkError) {
          console.error('Failed to update Clerk user:', clerkError)
          // Don't fail the request if Clerk update fails
        }
      }
      
      // Fetch updated user with all relations
      const completeUser = await prisma.user.findUnique({
        where: { id: params.id },
        include: {
          agent: true,
          admin: true
        }
      })
      
      return NextResponse.json(completeUser)
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}

// DELETE /api/users/[id] - Deactivate/Delete user
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAdmin(async (authenticatedReq) => {
    try {
      const url = new URL(req.url)
      const hardDelete = url.searchParams.get('hard') === 'true'
      
      const user = await prisma.user.findUnique({
        where: { id: params.id },
        include: {
          agent: true,
          quotes: true,
          bookings: true
        }
      })
      
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
      
      // Prevent deleting own account
      if (user.id === authenticatedReq.user?.id) {
        return NextResponse.json(
          { error: 'Cannot delete your own account' },
          { status: 400 }
        )
      }
      
      // Check for active bookings
      const activeBookings = user.bookings.filter(
        booking => !['CANCELLED', 'COMPLETED'].includes(booking.status)
      )
      
      if (activeBookings.length > 0) {
        return NextResponse.json(
          { error: 'Cannot delete user with active bookings' },
          { status: 400 }
        )
      }
      
      // Check for active quotes (if agent)
      if (user.role === 'AGENT' && user.agent) {
        const activeQuotes = await prisma.quote.count({
          where: {
            agentId: user.agent.id,
            status: { in: ['PENDING', 'SENT', 'VIEWED'] }
          }
        })
        
        if (activeQuotes > 0) {
          return NextResponse.json(
            { error: 'Cannot delete agent with active quotes' },
            { status: 400 }
          )
        }
      }
      
      if (hardDelete) {
        // Hard delete - only if no quotes or bookings exist
        if (user.quotes.length > 0 || user.bookings.length > 0) {
          return NextResponse.json(
            { error: 'Cannot permanently delete user with existing quotes or bookings' },
            { status: 400 }
          )
        }
        
        await prisma.$transaction(async (tx) => {
          // Delete role-specific records first
          if (user.agent) {
            await tx.agent.delete({ where: { id: user.agent.id } })
          }
          
          // Delete user
          await tx.user.delete({ where: { id: params.id } })
        })
        
        // Delete from Clerk
        try {
          await clerkClient.users.deleteUser(user.clerkId)
        } catch (clerkError) {
          console.error('Failed to delete Clerk user:', clerkError)
        }
        
        return NextResponse.json(
          { message: 'User permanently deleted' },
          { status: 200 }
        )
      } else {
        // Soft delete - deactivate user
        const deactivatedUser = await prisma.$transaction(async (tx) => {
          const user = await tx.user.update({
            where: { id: params.id },
            data: {
              isActive: false,
              updatedAt: new Date()
            }
          })
          
          // Deactivate agent if applicable
          if (user.role === 'AGENT') {
            await tx.agent.updateMany({
              where: { userId: user.id },
              data: { isActive: false }
            })
          }
          
          return user
        })
        
        return NextResponse.json(
          { message: 'User deactivated successfully', user: deactivatedUser },
          { status: 200 }
        )
      }
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}