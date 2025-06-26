import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withAdmin, handleApiError, validateRequest, getPagination } from '@/lib/auth/middleware'
import { clerkClient } from '@clerk/nextjs/server'

const bulkUserActionSchema = z.object({
  action: z.enum(['activate', 'deactivate', 'delete', 'update_role', 'send_notification']),
  userIds: z.array(z.string().uuid()),
  data: z.object({
    role: z.enum(['CUSTOMER', 'AGENT', 'ADMIN']).optional(),
    message: z.string().optional(),
    tierLevel: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']).optional(),
    commission: z.number().min(0).max(100).optional()
  }).optional()
})

const userImportSchema = z.object({
  users: z.array(z.object({
    email: z.string().email(),
    name: z.string().min(1),
    role: z.enum(['CUSTOMER', 'AGENT', 'ADMIN']),
    phone: z.string().optional(),
    tierLevel: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']).optional(),
    commission: z.number().min(0).max(100).optional(),
    isActive: z.boolean().default(true)
  }))
})

// GET /api/admin/users - Get users with advanced filtering and stats
export async function GET(req: NextRequest) {
  return withAdmin(async (authenticatedReq) => {
    try {
      const url = new URL(req.url)
      const action = url.searchParams.get('action')
      
      if (action === 'export') {
        // Export users data
        const role = url.searchParams.get('role') as 'CUSTOMER' | 'AGENT' | 'ADMIN' | null
        const format = url.searchParams.get('format') || 'json'
        
        const users = await prisma.user.findMany({
          where: role ? { role } : {},
          include: {
            agent: true,
            admin: true,
            quotes: {
              select: {
                id: true,
                status: true,
                totalPrice: true,
                createdAt: true
              }
            },
            bookings: {
              select: {
                id: true,
                status: true,
                totalAmount: true,
                createdAt: true
              }
            },
            payments: {
              select: {
                id: true,
                amount: true,
                status: true,
                createdAt: true
              }
            }
          }
        })
        
        const exportData = users.map(user => ({
          id: user.id,
          clerkId: user.clerkId,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          lastLoginAt: user.lastLoginAt,
          // Agent specific data
          ...(user.agent && {
            tierLevel: user.agent.tierLevel,
            commission: user.agent.commission,
            totalEarnings: user.agent.totalEarnings
          }),
          // Statistics
          stats: {
            totalQuotes: user.quotes.length,
            totalBookings: user.bookings.length,
            totalRevenue: user.payments
              .filter(p => p.status === 'COMPLETED')
              .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0),
            lastActivity: Math.max(
              user.quotes.length > 0 ? Math.max(...user.quotes.map(q => q.createdAt.getTime())) : 0,
              user.bookings.length > 0 ? Math.max(...user.bookings.map(b => b.createdAt.getTime())) : 0
            )
          }
        }))
        
        if (format === 'csv') {
          // Convert to CSV format
          const headers = Object.keys(exportData[0] || {})
          const csvContent = [
            headers.join(','),
            ...exportData.map(row => 
              headers.map(header => {
                const value = (row as any)[header]
                if (typeof value === 'object' && value !== null) {
                  return JSON.stringify(value).replace(/"/g, '""')
                }
                return `"${String(value).replace(/"/g, '""')}"`
              }).join(',')
            )
          ].join('\n')
          
          return new NextResponse(csvContent, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="users-export-${new Date().toISOString().split('T')[0]}.csv"`
            }
          })
        }
        
        return NextResponse.json({
          users: exportData,
          exportedAt: new Date().toISOString(),
          totalCount: exportData.length
        })
      }
      
      if (action === 'stats') {
        // Get detailed user statistics
        const [userStats, activityStats, recentUsers] = await Promise.all([
          // User counts by role and status
          prisma.user.groupBy({
            by: ['role', 'isActive'],
            _count: { role: true }
          }),
          
          // Activity statistics
          prisma.user.aggregate({
            where: {
              lastLoginAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
              }
            },
            _count: true
          }),
          
          // Recent user registrations
          prisma.user.findMany({
            where: {
              createdAt: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              createdAt: true
            }
          })
        ])
        
        const stats = {
          overview: {
            total: userStats.reduce((sum, stat) => sum + stat._count.role, 0),
            active: userStats
              .filter(stat => stat.isActive)
              .reduce((sum, stat) => sum + stat._count.role, 0),
            inactive: userStats
              .filter(stat => !stat.isActive)
              .reduce((sum, stat) => sum + stat._count.role, 0)
          },
          byRole: {
            customers: userStats
              .filter(stat => stat.role === 'CUSTOMER')
              .reduce((sum, stat) => sum + stat._count.role, 0),
            agents: userStats
              .filter(stat => stat.role === 'AGENT')
              .reduce((sum, stat) => sum + stat._count.role, 0),
            admins: userStats
              .filter(stat => stat.role === 'ADMIN')
              .reduce((sum, stat) => sum + stat._count.role, 0)
          },
          activity: {
            activeInLast30Days: activityStats._count,
            recentRegistrations: recentUsers
          }
        }
        
        return NextResponse.json(stats)
      }
      
      // Regular user listing with advanced filters
      const {
        page = 1,
        limit = 20,
        role,
        isActive,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        tierLevel,
        lastLoginBefore,
        lastLoginAfter,
        createdBefore,
        createdAfter,
        includeStats
      } = Object.fromEntries(url.searchParams.entries())
      
      const { skip, take } = getPagination(parseInt(page), parseInt(limit))
      
      // Build where clause
      const where: any = {}
      
      if (role) where.role = role
      if (isActive !== undefined) where.isActive = isActive === 'true'
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } }
        ]
      }
      if (tierLevel) {
        where.agent = { tierLevel }
      }
      if (lastLoginBefore) {
        where.lastLoginAt = { ...where.lastLoginAt, lt: new Date(lastLoginBefore) }
      }
      if (lastLoginAfter) {
        where.lastLoginAt = { ...where.lastLoginAt, gt: new Date(lastLoginAfter) }
      }
      if (createdBefore) {
        where.createdAt = { ...where.createdAt, lt: new Date(createdBefore) }
      }
      if (createdAfter) {
        where.createdAt = { ...where.createdAt, gt: new Date(createdAfter) }
      }
      
      const [users, totalCount] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take,
          orderBy: { [sortBy]: sortOrder },
          include: {
            agent: true,
            admin: true,
            ...(includeStats === 'true' && {
              _count: {
                select: {
                  quotes: true,
                  bookings: true,
                  payments: {
                    where: { status: 'COMPLETED' }
                  }
                }
              }
            })
          }
        }),
        prisma.user.count({ where })
      ])
      
      // Add additional stats if requested
      let usersWithStats = users
      if (includeStats === 'true') {
        const userIds = users.map(u => u.id)
        const [revenueStats, lastActivity] = await Promise.all([
          prisma.payment.groupBy({
            by: ['userId'],
            where: {
              userId: { in: userIds },
              status: 'COMPLETED'
            },
            _sum: { amount: true }
          }),
          prisma.analyticsEvent.groupBy({
            by: ['userId'],
            where: {
              userId: { in: userIds }
            },
            _max: { createdAt: true }
          })
        ])
        
        usersWithStats = users.map(user => {
          const revenue = revenueStats.find(r => r.userId === user.id)
          const activity = lastActivity.find(a => a.userId === user.id)
          
          return {
            ...user,
            stats: {
              totalRevenue: revenue ? parseFloat(revenue._sum.amount?.toString() || '0') : 0,
              lastActivity: activity?._max.createdAt || null
            }
          }
        })
      }
      
      return NextResponse.json({
        users: usersWithStats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / parseInt(limit))
        }
      })
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}

// POST /api/admin/users - Bulk actions and user import
export async function POST(req: NextRequest) {
  return withAdmin(async (authenticatedReq) => {
    try {
      const url = new URL(req.url)
      const action = url.searchParams.get('action')
      const body = await req.json()
      
      if (action === 'bulk') {
        // Bulk user actions
        const data = bulkUserActionSchema.parse(body)
        
        const results = []
        
        for (const userId of data.userIds) {
          try {
            const user = await prisma.user.findUnique({
              where: { id: userId },
              include: { agent: true, admin: true }
            })
            
            if (!user) {
              results.push({ userId, success: false, error: 'User not found' })
              continue
            }
            
            switch (data.action) {
              case 'activate':
              case 'deactivate':
                await prisma.user.update({
                  where: { id: userId },
                  data: { isActive: data.action === 'activate' }
                })
                
                // Update Clerk user
                if (user.clerkId) {
                  await clerkClient.users.updateUser(user.clerkId, {
                    publicMetadata: {
                      ...user.clerkId ? (await clerkClient.users.getUser(user.clerkId)).publicMetadata : {},
                      isActive: data.action === 'activate'
                    }
                  })
                }
                break
                
              case 'delete':
                // Check for active bookings
                const activeBookings = await prisma.booking.count({
                  where: {
                    userId,
                    status: { in: ['PENDING', 'CONFIRMED'] }
                  }
                })
                
                if (activeBookings > 0) {
                  results.push({ 
                    userId, 
                    success: false, 
                    error: 'Cannot delete user with active bookings' 
                  })
                  continue
                }
                
                // Soft delete
                await prisma.user.update({
                  where: { id: userId },
                  data: { isActive: false }
                })
                
                // Delete from Clerk
                if (user.clerkId) {
                  await clerkClient.users.deleteUser(user.clerkId)
                }
                break
                
              case 'update_role':
                if (!data.data?.role) {
                  results.push({ userId, success: false, error: 'Role is required' })
                  continue
                }
                
                await prisma.$transaction(async (tx) => {
                  // Update user role
                  await tx.user.update({
                    where: { id: userId },
                    data: { role: data.data!.role }
                  })
                  
                  // Handle role-specific records
                  if (data.data!.role === 'AGENT' && !user.agent) {
                    await tx.agent.create({
                      data: {
                        userId,
                        name: user.name,
                        email: user.email,
                        phone: user.phone,
                        tierLevel: data.data?.tierLevel || 'BRONZE',
                        commission: data.data?.commission || 5,
                        isActive: true
                      }
                    })
                  } else if (data.data!.role === 'ADMIN' && !user.admin) {
                    await tx.admin.create({
                      data: {
                        userId,
                        name: user.name,
                        email: user.email,
                        permissions: ['READ', 'write'],
                        isActive: true
                      }
                    })
                  }
                })
                break
                
              case 'send_notification':
                if (!data.data?.message) {
                  results.push({ userId, success: false, error: 'Message is required' })
                  continue
                }
                
                // Log notification (in real app, send actual notification)
                await prisma.analyticsEvent.create({
                  data: {
                    eventType: 'NOTIFICATION',
                    description: 'Admin notification sent',
                    metadata: {
                      message: data.data.message,
                      recipientId: userId,
                      sentBy: authenticatedReq.user!.id
                    },
                    userId: authenticatedReq.user!.id
                  }
                })
                break
            }
            
            results.push({ userId, success: true })
          } catch (error) {
            results.push({ 
              userId, 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            })
          }
        }
        
        return NextResponse.json({
          action: data.action,
          results,
          summary: {
            total: data.userIds.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
          }
        })
      }
      
      if (action === 'import') {
        // Import users from CSV/JSON
        const data = userImportSchema.parse(body)
        
        const results = []
        
        for (const userData of data.users) {
          try {
            // Check if user already exists
            const existingUser = await prisma.user.findUnique({
              where: { email: userData.email }
            })
            
            if (existingUser) {
              results.push({ 
                email: userData.email, 
                success: false, 
                error: 'User already exists' 
              })
              continue
            }
            
            // Create user in database
            const user = await prisma.$transaction(async (tx) => {
              const newUser = await tx.user.create({
                data: {
                  email: userData.email,
                  name: userData.name,
                  phone: userData.phone,
                  role: userData.role,
                  isActive: userData.isActive
                }
              })
              
              // Create role-specific records
              if (userData.role === 'AGENT') {
                await tx.agent.create({
                  data: {
                    userId: newUser.id,
                    name: userData.name,
                    email: userData.email,
                    phone: userData.phone,
                    tierLevel: userData.tierLevel || 'BRONZE',
                    commission: userData.commission || 5,
                    isActive: userData.isActive
                  }
                })
              } else if (userData.role === 'ADMIN') {
                await tx.admin.create({
                  data: {
                    userId: newUser.id,
                    name: userData.name,
                    email: userData.email,
                    permissions: ['read'],
                    isActive: userData.isActive
                  }
                })
              }
              
              return newUser
            })
            
            results.push({ 
              email: userData.email, 
              success: true, 
              userId: user.id 
            })
          } catch (error) {
            results.push({ 
              email: userData.email, 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            })
          }
        }
        
        return NextResponse.json({
          results,
          summary: {
            total: data.users.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
          }
        })
      }
      
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}