import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const GetStatsSchema = z.object({
  agentId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  period: z.enum(['week', 'month', 'quarter', 'year']).optional()
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    const validatedParams = GetStatsSchema.parse(params)
    
    const { agentId, startDate, endDate, period } = validatedParams

    // Build date filter
    let dateFilter: any = {}
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      }
    } else if (period) {
      const now = new Date()
      let fromDate: Date
      
      switch (period) {
        case 'week':
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          fromDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'quarter':
          const quarterStart = Math.floor(now.getMonth() / 3) * 3
          fromDate = new Date(now.getFullYear(), quarterStart, 1)
          break
        case 'year':
          fromDate = new Date(now.getFullYear(), 0, 1)
          break
        default:
          fromDate = new Date(now.getFullYear(), now.getMonth(), 1)
      }
      
      dateFilter = {
        createdAt: {
          gte: fromDate,
          lte: now
        }
      }
    }

    // Build where clause
    const where: any = {
      ...dateFilter
    }

    // Filter by agent if specified (for agent dashboard)
    if (agentId) {
      where.agentId = agentId
    } else if (session.user.role === 'AGENT') {
      // If user is an agent, only show their quotes
      where.agentId = session.user.id
    }

    // Get basic quote statistics
    const [totalQuotes, quotesByStatus, quotesWithAmounts] = await Promise.all([
      // Total quotes count
      db.quote.count({ where }),
      
      // Quotes grouped by status
      db.quote.groupBy({
        by: ['status'],
        where,
        _count: {
          id: true
        }
      }),
      
      // Quotes with amounts for financial calculations
      db.quote.findMany({
        where,
        select: {
          id: true,
          status: true,
          totalAmount: true,
          commission: true,
          isItemized: true,
          createdAt: true
        }
      })
    ])

    // Calculate status-based statistics
    const statusStats = quotesByStatus.reduce((acc, item) => {
      acc[item.status.toLowerCase()] = item._count.id
      return acc
    }, {} as Record<string, number>)

    const pendingQuotes = (statusStats.draft || 0) + (statusStats.sent || 0) + (statusStats.viewed || 0)
    const acceptedQuotes = statusStats.accepted || 0
    const rejectedQuotes = statusStats.rejected || 0
    const expiredQuotes = statusStats.expired || 0

    // Calculate financial statistics
    const totalValue = quotesWithAmounts.reduce((sum, quote) => sum + (quote.totalAmount || 0), 0)
    const totalCommission = quotesWithAmounts.reduce((sum, quote) => sum + (quote.commission || 0), 0)
    
    const acceptedValue = quotesWithAmounts
      .filter(quote => quote.status === 'ACCEPTED')
      .reduce((sum, quote) => sum + (quote.totalAmount || 0), 0)
    
    const acceptedCommission = quotesWithAmounts
      .filter(quote => quote.status === 'ACCEPTED')
      .reduce((sum, quote) => sum + (quote.commission || 0), 0)

    // Calculate conversion rate
    const conversionRate = totalQuotes > 0 ? (acceptedQuotes / totalQuotes) * 100 : 0

    // Calculate average quote value
    const averageQuoteValue = totalQuotes > 0 ? totalValue / totalQuotes : 0

    // Get itemized vs package breakdown
    const itemizedQuotes = quotesWithAmounts.filter(quote => quote.isItemized).length
    const packageQuotes = quotesWithAmounts.filter(quote => !quote.isItemized).length

    // Get monthly trend data (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    
    const monthlyTrend = await db.quote.groupBy({
      by: ['createdAt'],
      where: {
        ...where,
        createdAt: {
          gte: sixMonthsAgo
        }
      },
      _count: {
        id: true
      },
      _sum: {
        totalAmount: true,
        commission: true
      }
    })

    // Process monthly trend data
    const monthlyData = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      const monthData = monthlyTrend.filter(item => {
        const itemDate = new Date(item.createdAt)
        const itemMonthKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`
        return itemMonthKey === monthKey
      })
      
      monthlyData.push({
        month: monthKey,
        quotes: monthData.reduce((sum, item) => sum + item._count.id, 0),
        value: monthData.reduce((sum, item) => sum + (item._sum.totalAmount || 0), 0),
        commission: monthData.reduce((sum, item) => sum + (item._sum.commission || 0), 0)
      })
    }

    // Get top performing periods
    const topPerformingDay = await db.quote.groupBy({
      by: ['createdAt'],
      where,
      _count: { id: true },
      _sum: { totalAmount: true },
      orderBy: {
        _sum: {
          totalAmount: 'desc'
        }
      },
      take: 1
    })

    return NextResponse.json({
      success: true,
      data: {
        // Basic counts
        totalQuotes,
        pendingQuotes,
        acceptedQuotes,
        rejectedQuotes,
        expiredQuotes,
        
        // Financial metrics
        totalValue,
        totalCommission,
        acceptedValue,
        acceptedCommission,
        averageQuoteValue,
        
        // Performance metrics
        conversionRate,
        
        // Quote type breakdown
        itemizedQuotes,
        packageQuotes,
        
        // Status breakdown
        statusBreakdown: statusStats,
        
        // Trend data
        monthlyTrend: monthlyData,
        
        // Additional insights
        insights: {
          bestPerformingDay: topPerformingDay[0] ? {
            date: topPerformingDay[0].createdAt,
            quotes: topPerformingDay[0]._count.id,
            value: topPerformingDay[0]._sum.totalAmount
          } : null,
          averageQuotesPerDay: totalQuotes > 0 ? totalQuotes / 30 : 0, // Assuming 30-day period
          itemizedPercentage: totalQuotes > 0 ? (itemizedQuotes / totalQuotes) * 100 : 0
        }
      }
    })

  } catch (error) {
    console.error('Error fetching quote statistics:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}