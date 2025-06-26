import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withAdmin, handleApiError } from '@/lib/auth/middleware'

const adminStatsQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month', 'quarter', 'year']).default('month'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
})

const systemConfigSchema = z.object({
  key: z.string().min(1),
  value: z.any(),
  description: z.string().optional(),
  category: z.string().default('general')
})

// GET /api/admin - Get admin dashboard stats
export async function GET(req: NextRequest) {
  return withAdmin(async (authenticatedReq) => {
    try {
      const url = new URL(req.url)
      const action = url.searchParams.get('action')
      
      if (action === 'stats') {
        const queryParams = {
          period: url.searchParams.get('period') || 'month',
          startDate: url.searchParams.get('startDate'),
          endDate: url.searchParams.get('endDate')
        }
        
        const data = adminStatsQuerySchema.parse(queryParams)
        
        // Set default date range
        const endDate = data.endDate ? new Date(data.endDate) : new Date()
        const startDate = data.startDate ? new Date(data.startDate) : (() => {
          const date = new Date(endDate)
          date.setMonth(date.getMonth() - 1)
          return date
        })()
        
        // Get comprehensive system stats
        const [totalUsers, totalAgents, totalPackages, totalBookings, totalRevenue, recentActivity] = await Promise.all([
          // Total users by role
          prisma.user.groupBy({
            by: ['role'],
            _count: { role: true }
          }),
          
          // Active agents with stats
          prisma.agent.findMany({
            where: { isActive: true },
            include: {
              _count: {
                select: {
                  quotes: true,
                  bookings: {
                    where: {
                      createdAt: {
                        gte: startDate,
                        lte: endDate
                      }
                    }
                  }
                }
              }
            }
          }),
          
          // Package stats
          prisma.package.aggregate({
            where: { isActive: true },
            _count: true,
            _avg: { basePrice: true },
            _min: { basePrice: true },
            _max: { basePrice: true }
          }),
          
          // Booking stats for period
          prisma.booking.groupBy({
            by: ['status'],
            where: {
              createdAt: {
                gte: startDate,
                lte: endDate
              }
            },
            _count: { status: true },
            _sum: { totalAmount: true }
          }),
          
          // Revenue stats
          prisma.payment.aggregate({
            where: {
              status: 'COMPLETED',
              createdAt: {
                gte: startDate,
                lte: endDate
              }
            },
            _sum: { amount: true },
            _count: true
          }),
          
          // Recent activity
          prisma.analyticsEvent.findMany({
            where: {
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true
                }
              }
            }
          })
        ])
        
        // Calculate growth rates
        const prevStartDate = new Date(startDate)
        const prevEndDate = new Date(endDate)
        const diffMs = endDate.getTime() - startDate.getTime()
        prevStartDate.setTime(prevStartDate.getTime() - diffMs)
        prevEndDate.setTime(prevEndDate.getTime() - diffMs)
        
        const [prevBookings, prevRevenue] = await Promise.all([
          prisma.booking.aggregate({
            where: {
              createdAt: {
                gte: prevStartDate,
                lte: prevEndDate
              }
            },
            _count: true
          }),
          
          prisma.payment.aggregate({
            where: {
              status: 'COMPLETED',
              createdAt: {
                gte: prevStartDate,
                lte: prevEndDate
              }
            },
            _sum: { amount: true }
          })
        ])
        
        const currentBookingsCount = totalBookings.reduce((sum, item) => sum + item._count.status, 0)
        const currentRevenue = parseFloat(totalRevenue._sum.amount?.toString() || '0')
        const prevBookingsCount = prevBookings._count
        const prevRevenueAmount = parseFloat(prevRevenue._sum.amount?.toString() || '0')
        
        const stats = {
          period: data.period,
          startDate,
          endDate,
          users: {
            total: totalUsers.reduce((sum, item) => sum + item._count.role, 0),
            customers: totalUsers.find(item => item.role === 'CUSTOMER')?._count.role || 0,
            agents: totalUsers.find(item => item.role === 'AGENT')?._count.role || 0,
            admins: totalUsers.find(item => item.role === 'ADMIN')?._count.role || 0
          },
          agents: {
            active: totalAgents.length,
            topPerformers: totalAgents
              .sort((a, b) => b._count.bookings - a._count.bookings)
              .slice(0, 5)
              .map(agent => ({
                id: agent.id,
                name: agent.name,
                email: agent.email,
                tierLevel: agent.tierLevel,
                bookings: agent._count.bookings,
                quotes: agent._count.quotes,
                commission: agent.commission
              }))
          },
          packages: {
            total: totalPackages._count,
            averagePrice: parseFloat(totalPackages._avg.basePrice?.toString() || '0'),
            priceRange: {
              min: parseFloat(totalPackages._min.basePrice?.toString() || '0'),
              max: parseFloat(totalPackages._max.basePrice?.toString() || '0')
            }
          },
          bookings: {
            total: currentBookingsCount,
            byStatus: totalBookings.reduce((acc, item) => {
              acc[item.status.toLowerCase()] = item._count.status
              return acc
            }, {} as Record<string, number>),
            totalValue: totalBookings.reduce((sum, item) => 
              sum + parseFloat(item._sum.totalAmount?.toString() || '0'), 0
            ),
            growth: prevBookingsCount > 0 
              ? ((currentBookingsCount - prevBookingsCount) / prevBookingsCount) * 100
              : 0
          },
          revenue: {
            total: currentRevenue,
            transactions: totalRevenue._count,
            growth: prevRevenueAmount > 0 
              ? ((currentRevenue - prevRevenueAmount) / prevRevenueAmount) * 100
              : 0
          },
          recentActivity: recentActivity.map(event => ({
            id: event.id,
            eventType: event.eventType,
            description: event.description,
            userId: event.userId,
            user: event.user,
            metadata: event.metadata,
            createdAt: event.createdAt
          }))
        }
        
        return NextResponse.json(stats)
      }
      
      if (action === 'config') {
        // Get system configuration
        const configs = await prisma.analyticsEvent.findMany({
          where: {
            eventType: 'SYSTEM_CONFIG'
          },
          orderBy: { createdAt: 'desc' }
        })
        
        return NextResponse.json({
          configs: configs.map(config => ({
            key: config.description,
            value: config.metadata,
            createdAt: config.createdAt,
            updatedAt: config.updatedAt
          }))
        })
      }
      
      if (action === 'health') {
        // System health check
        const [dbHealth, recentErrors] = await Promise.all([
          // Database health
          prisma.$queryRaw`SELECT 1 as healthy`.then(() => true).catch(() => false),
          
          // Recent errors
          prisma.analyticsEvent.findMany({
            where: {
              eventType: 'ERROR',
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
          })
        ])
        
        return NextResponse.json({
          database: { healthy: dbHealth },
          errors: recentErrors,
          timestamp: new Date().toISOString()
        })
      }
      
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}

// POST /api/admin - Admin actions
export async function POST(req: NextRequest) {
  return withAdmin(async (authenticatedReq) => {
    try {
      const url = new URL(req.url)
      const action = url.searchParams.get('action')
      const body = await req.json()
      
      if (action === 'config') {
        // Update system configuration
        const data = systemConfigSchema.parse(body)
        
        // Store as analytics event for now (in a real app, you'd have a dedicated config table)
        const config = await prisma.analyticsEvent.create({
          data: {
            eventType: 'SYSTEM_CONFIG',
            description: data.key,
            metadata: {
              value: data.value,
              description: data.description,
              category: data.category
            },
            userId: authenticatedReq.user!.id
          }
        })
        
        return NextResponse.json({
          key: data.key,
          value: data.value,
          description: data.description,
          category: data.category,
          updatedAt: config.createdAt
        })
      }
      
      if (action === 'maintenance') {
        // System maintenance actions
        const { type, target } = body
        
        let result: any = {}
        
        switch (type) {
          case 'cleanup_logs':
            // Clean up old analytics events
            const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
            const deleted = await prisma.analyticsEvent.deleteMany({
              where: {
                createdAt: { lt: cutoffDate },
                eventType: { in: ['PAGE_VIEW', 'USER_ACTION'] }
              }
            })
            result = { deletedEvents: deleted.count }
            break
            
          case 'recalculate_stats':
            // Trigger stats recalculation (placeholder)
            result = { message: 'Stats recalculation triggered' }
            break
            
          case 'backup_data':
            // Trigger data backup (placeholder)
            result = { message: 'Data backup initiated' }
            break
            
          default:
            return NextResponse.json({ error: 'Invalid maintenance type' }, { status: 400 })
        }
        
        // Log the maintenance action
        await prisma.analyticsEvent.create({
          data: {
            eventType: 'ADMIN_ACTION',
            description: `Maintenance: ${type}`,
            metadata: { type, target, result },
            userId: authenticatedReq.user!.id
          }
        })
        
        return NextResponse.json(result)
      }
      
      if (action === 'broadcast') {
        // Send broadcast message to users
        const { message, recipients, channel } = body
        
        // Validate recipients
        const users = await prisma.user.findMany({
          where: {
            id: { in: recipients },
            isActive: true
          },
          select: { id: true, email: true, name: true }
        })
        
        // Log broadcast event
        await prisma.analyticsEvent.create({
          data: {
            eventType: 'BROADCAST',
            description: 'Admin broadcast message',
            metadata: {
              message,
              recipients: users.map(u => u.id),
              channel,
              recipientCount: users.length
            },
            userId: authenticatedReq.user!.id
          }
        })
        
        // In a real implementation, you would send the actual messages here
        // For now, just return success
        return NextResponse.json({
          message: 'Broadcast sent successfully',
          recipientCount: users.length,
          recipients: users
        })
      }
      
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}

// PUT /api/admin - Update admin settings
export async function PUT(req: NextRequest) {
  return withAdmin(async (authenticatedReq) => {
    try {
      const body = await req.json()
      const { settings } = body
      
      // Update multiple system settings
      const updates = []
      
      for (const [key, value] of Object.entries(settings)) {
        const update = prisma.analyticsEvent.create({
          data: {
            eventType: 'SYSTEM_CONFIG',
            description: key,
            metadata: { value },
            userId: authenticatedReq.user!.id
          }
        })
        updates.push(update)
      }
      
      await Promise.all(updates)
      
      return NextResponse.json({
        message: 'Settings updated successfully',
        updatedSettings: Object.keys(settings),
        updatedAt: new Date().toISOString()
      })
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}