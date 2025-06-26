import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withAuth, withAdmin, handleApiError, getPaginationParams, formatPaginatedResponse } from '@/lib/auth/middleware'
import { clerkClient } from '@clerk/nextjs/server'

const createUserSchema = z.object({
  clerkId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  phone: z.string().optional(),
  role: z.enum(['CUSTOMER', 'AGENT', 'ADMIN']).default('CUSTOMER'),
  isActive: z.boolean().default(true),
  preferences: z.object({
    currency: z.string().default('USD'),
    language: z.string().default('en'),
    notifications: z.object({
      email: z.boolean().default(true),
      whatsapp: z.boolean().default(true),
      sms: z.boolean().default(false)
    }).default({}),
    marketing: z.boolean().default(false)
  }).optional()
})

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

// GET /api/users - List users with filters (Admin only)
export async function GET(req: NextRequest) {
  return withAdmin(async (authenticatedReq) => {
    try {
      const { page, limit, skip } = getPaginationParams(req)
      const url = new URL(req.url)
      
      const role = url.searchParams.get('role')
      const isActive = url.searchParams.get('isActive')
      const search = url.searchParams.get('search')
      const sortBy = url.searchParams.get('sortBy') || 'createdAt'
      const sortOrder = url.searchParams.get('sortOrder') || 'desc'
      const includeStats = url.searchParams.get('includeStats') === 'true'
      
      const where: any = {}
      
      // Apply filters
      if (role) where.role = role
      if (isActive !== null) where.isActive = isActive === 'true'
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } }
        ]
      }
      
      // Build orderBy
      const orderBy: any = {}
      if (sortBy === 'name') {
        orderBy.name = sortOrder
      } else if (sortBy === 'email') {
        orderBy.email = sortOrder
      } else if (sortBy === 'role') {
        orderBy.role = sortOrder
      } else {
        orderBy.createdAt = sortOrder
      }
      
      const include: any = {
        agent: {
          select: {
            id: true,
            tierLevel: true,
            commission: true,
            isActive: true
          }
        },
        admin: {
          select: {
            id: true,
            permissions: true
          }
        }
      }
      
      if (includeStats) {
        include._count = {
          select: {
            quotes: true,
            bookings: true,
            payments: true
          }
        }
      }
      
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          include,
          orderBy,
          skip,
          take: limit
        }),
        prisma.user.count({ where })
      ])
      
      // Add additional stats if requested
      let usersWithStats = users
      if (includeStats) {
        usersWithStats = await Promise.all(
          users.map(async (user) => {
            const stats = {
              totalQuotes: 0,
              totalBookings: 0,
              totalRevenue: 0,
              lastActivity: null as Date | null
            }
            
            if (user.role === 'CUSTOMER') {
              const [quotes, bookings, payments] = await Promise.all([
                prisma.quote.count({ where: { userId: user.id } }),
                prisma.booking.count({ where: { userId: user.id } }),
                prisma.payment.aggregate({
                  where: {
                    booking: { userId: user.id },
                    status: 'COMPLETED'
                  },
                  _sum: { amount: true }
                })
              ])
              
              stats.totalQuotes = quotes
              stats.totalBookings = bookings
              stats.totalRevenue = parseFloat(payments._sum.amount?.toString() || '0')
              
              // Get last activity
              const lastBooking = await prisma.booking.findFirst({
                where: { userId: user.id },
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true }
              })
              stats.lastActivity = lastBooking?.createdAt || null
            } else if (user.role === 'AGENT' && user.agent) {
              const [quotes, bookings] = await Promise.all([
                prisma.quote.count({ where: { agentId: user.agent.id } }),
                prisma.booking.count({
                  where: {
                    quote: { agentId: user.agent.id }
                  }
                })
              ])
              
              stats.totalQuotes = quotes
              stats.totalBookings = bookings
              
              // Calculate agent revenue (commission)
              const completedBookings = await prisma.booking.findMany({
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
              
              stats.totalRevenue = completedBookings.reduce((sum, booking) => {
                const bookingRevenue = booking.payments.reduce(
                  (paySum, payment) => paySum + parseFloat(payment.amount.toString()),
                  0
                )
                return sum + (bookingRevenue * (user.agent!.commission / 100))
              }, 0)
              
              // Get last activity
              const lastQuote = await prisma.quote.findFirst({
                where: { agentId: user.agent.id },
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true }
              })
              stats.lastActivity = lastQuote?.createdAt || null
            }
            
            return {
              ...user,
              stats
            }
          })
        )
      }
      
      return NextResponse.json(
        formatPaginatedResponse(usersWithStats, total, page, limit)
      )
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}

// POST /api/users - Create new user (Admin only)
export async function POST(req: NextRequest) {
  return withAdmin(async (authenticatedReq) => {
    try {
      const body = await req.json()
      const data = createUserSchema.parse(body)
      
      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { clerkId: data.clerkId },
            { email: data.email }
          ]
        }
      })
      
      if (existingUser) {
        return NextResponse.json(
          { error: 'User already exists with this Clerk ID or email' },
          { status: 400 }
        )
      }
      
      // Verify Clerk user exists
      try {
        const clerkUser = await clerkClient.users.getUser(data.clerkId)
        if (!clerkUser) {
          return NextResponse.json(
            { error: 'Clerk user not found' },
            { status: 400 }
          )
        }
      } catch (clerkError) {
        return NextResponse.json(
          { error: 'Invalid Clerk user ID' },
          { status: 400 }
        )
      }
      
      // Create user with role-specific data
      const userData: any = {
        clerkId: data.clerkId,
        email: data.email,
        name: data.name,
        phone: data.phone,
        role: data.role,
        isActive: data.isActive,
        preferences: data.preferences || {
          currency: 'USD',
          language: 'en',
          notifications: {
            email: true,
            whatsapp: true,
            sms: false
          },
          marketing: false
        }
      }
      
      // Create user in transaction with role-specific records
      const user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: userData,
          include: {
            agent: true,
            admin: true
          }
        })
        
        // Create role-specific records
        if (data.role === 'AGENT') {
          await tx.agent.create({
            data: {
              userId: newUser.id,
              name: data.name,
              email: data.email,
              phone: data.phone,
              tierLevel: 'BRONZE',
              commission: 10, // Default commission
              isActive: true
            }
          })
        } else if (data.role === 'ADMIN') {
          await tx.admin.create({
            data: {
              userId: newUser.id,
              name: data.name,
              email: data.email,
              permissions: ['READ', 'write'] // Default permissions
            }
          })
        }
        
        return newUser
      })
      
      // Fetch the complete user with relations
      const completeUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          agent: true,
          admin: true
        }
      })
      
      return NextResponse.json(completeUser, { status: 201 })
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}