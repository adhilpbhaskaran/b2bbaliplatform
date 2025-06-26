import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withAuth, withAgent, withAdmin, handleApiError } from '@/lib/auth/middleware'

const analyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  period: z.enum(['day', 'week', 'month', 'quarter', 'year']).default('month'),
  agentId: z.string().uuid().optional(),
  packageId: z.string().uuid().optional(),
  category: z.string().optional(),
  metrics: z.array(z.enum([
    'revenue',
    'bookings',
    'quotes',
    'conversion',
    'customers',
    'agents',
    'packages',
    'payments',
    'cancellations'
  ])).default(['revenue', 'bookings', 'quotes', 'conversion'])
})

// GET /api/analytics - Get analytics data
export async function GET(req: NextRequest) {
  return withAuth(async (authenticatedReq) => {
    try {
      const url = new URL(req.url)
      const queryParams = {
        startDate: url.searchParams.get('startDate'),
        endDate: url.searchParams.get('endDate'),
        period: url.searchParams.get('period') || 'month',
        agentId: url.searchParams.get('agentId'),
        packageId: url.searchParams.get('packageId'),
        category: url.searchParams.get('category'),
        metrics: url.searchParams.get('metrics')?.split(',') || ['revenue', 'bookings', 'quotes', 'conversion']
      }
      
      const data = analyticsQuerySchema.parse(queryParams)
      
      // Set default date range if not provided
      const endDate = data.endDate ? new Date(data.endDate) : new Date()
      const startDate = data.startDate ? new Date(data.startDate) : (() => {
        const date = new Date(endDate)
        switch (data.period) {
          case 'day': date.setDate(date.getDate() - 30); break
          case 'week': date.setDate(date.getDate() - 84); break // 12 weeks
          case 'month': date.setMonth(date.getMonth() - 12); break
          case 'quarter': date.setMonth(date.getMonth() - 48); break // 16 quarters
          case 'year': date.setFullYear(date.getFullYear() - 5); break
        }
        return date
      })()
      
      // Role-based filtering
      const baseWhere: any = {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
      
      if (authenticatedReq.user?.role === 'AGENT' && !authenticatedReq.user.adminId) {
        baseWhere.quote = { agentId: authenticatedReq.user.agentId }
      }
      
      if (data.agentId) {
        baseWhere.quote = { ...baseWhere.quote, agentId: data.agentId }
      }
      
      if (data.packageId) {
        baseWhere.quote = { ...baseWhere.quote, packageId: data.packageId }
      }
      
      if (data.category) {
        baseWhere.quote = {
          ...baseWhere.quote,
          package: { category: data.category }
        }
      }
      
      const analytics: any = {
        period: data.period,
        startDate,
        endDate,
        summary: {},
        trends: {},
        breakdown: {}
      }
      
      // Calculate summary metrics
      if (data.metrics.includes('revenue')) {
        const revenueData = await prisma.payment.aggregate({
          where: {
            ...baseWhere,
            status: 'COMPLETED'
          },
          _sum: { amount: true },
          _count: true
        })
        
        analytics.summary.revenue = {
          total: parseFloat(revenueData._sum.amount?.toString() || '0'),
          count: revenueData._count
        }
        
        // Previous period comparison
        const prevStartDate = new Date(startDate)
        const prevEndDate = new Date(endDate)
        const diffMs = endDate.getTime() - startDate.getTime()
        prevStartDate.setTime(prevStartDate.getTime() - diffMs)
        prevEndDate.setTime(prevEndDate.getTime() - diffMs)
        
        const prevRevenueData = await prisma.payment.aggregate({
          where: {
            ...baseWhere,
            status: 'COMPLETED',
            createdAt: {
              gte: prevStartDate,
              lte: prevEndDate
            }
          },
          _sum: { amount: true }
        })
        
        const prevRevenue = parseFloat(prevRevenueData._sum.amount?.toString() || '0')
        analytics.summary.revenue.growth = prevRevenue > 0 
          ? ((analytics.summary.revenue.total - prevRevenue) / prevRevenue) * 100
          : 0
      }
      
      if (data.metrics.includes('bookings')) {
        const bookingsData = await prisma.booking.groupBy({
          by: ['status'],
          where: baseWhere,
          _count: { status: true },
          _sum: { totalAmount: true }
        })
        
        analytics.summary.bookings = {
          total: bookingsData.reduce((sum, item) => sum + item._count.status, 0),
          completed: bookingsData.find(item => item.status === 'COMPLETED')?._count.status || 0,
          pending: bookingsData.find(item => item.status === 'PENDING')?._count.status || 0,
          cancelled: bookingsData.find(item => item.status === 'CANCELLED')?._count.status || 0,
          totalValue: bookingsData.reduce((sum, item) => 
            sum + parseFloat(item._sum.totalAmount?.toString() || '0'), 0
          )
        }
      }
      
      if (data.metrics.includes('quotes')) {
        const quotesWhere = {
          createdAt: baseWhere.createdAt,
          ...(baseWhere.quote && { agentId: baseWhere.quote.agentId }),
          ...(data.packageId && { packageId: data.packageId }),
          ...(data.category && { package: { category: data.category } })
        }
        
        const quotesData = await prisma.quote.groupBy({
          by: ['status'],
          where: quotesWhere,
          _count: { status: true },
          _sum: { totalPrice: true }
        })
        
        analytics.summary.quotes = {
          total: quotesData.reduce((sum, item) => sum + item._count.status, 0),
          pending: quotesData.find(item => item.status === 'PENDING')?._count.status || 0,
          sent: quotesData.find(item => item.status === 'SENT')?._count.status || 0,
          accepted: quotesData.find(item => item.status === 'ACCEPTED')?._count.status || 0,
          rejected: quotesData.find(item => item.status === 'REJECTED')?._count.status || 0,
          totalValue: quotesData.reduce((sum, item) => 
            sum + parseFloat(item._sum.totalPrice?.toString() || '0'), 0
          )
        }
      }
      
      if (data.metrics.includes('conversion')) {
        const quotesCount = analytics.summary.quotes?.total || await prisma.quote.count({
          where: {
            createdAt: baseWhere.createdAt,
            ...(baseWhere.quote && { agentId: baseWhere.quote.agentId }),
            ...(data.packageId && { packageId: data.packageId }),
            ...(data.category && { package: { category: data.category } })
          }
        })
        
        const bookingsCount = analytics.summary.bookings?.total || await prisma.booking.count({
          where: baseWhere
        })
        
        analytics.summary.conversion = {
          rate: quotesCount > 0 ? (bookingsCount / quotesCount) * 100 : 0,
          quotesToBookings: `${quotesCount}:${bookingsCount}`
        }
      }
      
      if (data.metrics.includes('customers')) {
        const customersData = await prisma.user.aggregate({
          where: {
            role: 'CUSTOMER',
            createdAt: baseWhere.createdAt
          },
          _count: true
        })
        
        const activeCustomers = await prisma.user.count({
          where: {
            role: 'CUSTOMER',
            bookings: {
              some: {
                createdAt: baseWhere.createdAt
              }
            }
          }
        })
        
        analytics.summary.customers = {
          new: customersData._count,
          active: activeCustomers,
          retention: customersData._count > 0 ? (activeCustomers / customersData._count) * 100 : 0
        }
      }
      
      // Generate time-series trends
      if (data.metrics.includes('revenue') || data.metrics.includes('bookings')) {
        const trendData = await generateTrendData(startDate, endDate, data.period, baseWhere)
        analytics.trends = trendData
      }
      
      // Generate breakdown data
      if (data.metrics.includes('packages')) {
        const packageBreakdown = await prisma.booking.groupBy({
          by: ['quote'],
          where: baseWhere,
          _count: { quote: true },
          _sum: { totalAmount: true }
        })
        
        // Get package details
        const packageIds = packageBreakdown.map(item => item.quote)
        const packages = await prisma.quote.findMany({
          where: { id: { in: packageIds } },
          include: {
            package: {
              select: {
                id: true,
                name: true,
                category: true
              }
            }
          }
        })
        
        analytics.breakdown.packages = packageBreakdown.map(item => {
          const quote = packages.find(p => p.id === item.quote)
          return {
            packageId: quote?.package.id,
            packageName: quote?.package.name,
            category: quote?.package.category,
            bookings: item._count.quote,
            revenue: parseFloat(item._sum.totalAmount?.toString() || '0')
          }
        }).sort((a, b) => b.revenue - a.revenue)
      }
      
      if (data.metrics.includes('agents') && authenticatedReq.user?.role === 'ADMIN') {
        const agentBreakdown = await prisma.booking.groupBy({
          by: ['quote'],
          where: baseWhere,
          _count: { quote: true },
          _sum: { totalAmount: true }
        })
        
        // Get agent details
        const quoteIds = agentBreakdown.map(item => item.quote)
        const quotes = await prisma.quote.findMany({
          where: { id: { in: quoteIds } },
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                tierLevel: true,
                commission: true
              }
            }
          }
        })
        
        const agentStats = new Map()
        agentBreakdown.forEach(item => {
          const quote = quotes.find(q => q.id === item.quote)
          if (quote?.agent) {
            const agentId = quote.agent.id
            const existing = agentStats.get(agentId) || {
              agentId,
              agentName: quote.agent.name,
              tierLevel: quote.agent.tierLevel,
              commission: quote.agent.commission,
              bookings: 0,
              revenue: 0,
              commissionEarned: 0
            }
            
            const revenue = parseFloat(item._sum.totalAmount?.toString() || '0')
            existing.bookings += item._count.quote
            existing.revenue += revenue
            existing.commissionEarned += revenue * (quote.agent.commission / 100)
            
            agentStats.set(agentId, existing)
          }
        })
        
        analytics.breakdown.agents = Array.from(agentStats.values())
          .sort((a, b) => b.revenue - a.revenue)
      }
      
      return NextResponse.json(analytics)
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}

// Helper function to generate trend data
async function generateTrendData(startDate: Date, endDate: Date, period: string, baseWhere: any) {
  const trends: any = {
    revenue: [],
    bookings: [],
    quotes: []
  }
  
  // Generate date intervals based on period
  const intervals = generateDateIntervals(startDate, endDate, period)
  
  for (const interval of intervals) {
    const intervalWhere = {
      ...baseWhere,
      createdAt: {
        gte: interval.start,
        lt: interval.end
      }
    }
    
    // Revenue trend
    const revenueData = await prisma.payment.aggregate({
      where: {
        ...intervalWhere,
        status: 'COMPLETED'
      },
      _sum: { amount: true }
    })
    
    trends.revenue.push({
      date: interval.start.toISOString().split('T')[0],
      value: parseFloat(revenueData._sum.amount?.toString() || '0')
    })
    
    // Bookings trend
    const bookingsCount = await prisma.booking.count({
      where: intervalWhere
    })
    
    trends.bookings.push({
      date: interval.start.toISOString().split('T')[0],
      value: bookingsCount
    })
    
    // Quotes trend
    const quotesWhere = {
      createdAt: intervalWhere.createdAt,
      ...(intervalWhere.quote && { agentId: intervalWhere.quote.agentId })
    }
    
    const quotesCount = await prisma.quote.count({
      where: quotesWhere
    })
    
    trends.quotes.push({
      date: interval.start.toISOString().split('T')[0],
      value: quotesCount
    })
  }
  
  return trends
}

// Helper function to generate date intervals
function generateDateIntervals(startDate: Date, endDate: Date, period: string) {
  const intervals = []
  const current = new Date(startDate)
  
  while (current < endDate) {
    const intervalStart = new Date(current)
    const intervalEnd = new Date(current)
    
    switch (period) {
      case 'day':
        intervalEnd.setDate(intervalEnd.getDate() + 1)
        break
      case 'week':
        intervalEnd.setDate(intervalEnd.getDate() + 7)
        break
      case 'month':
        intervalEnd.setMonth(intervalEnd.getMonth() + 1)
        break
      case 'quarter':
        intervalEnd.setMonth(intervalEnd.getMonth() + 3)
        break
      case 'year':
        intervalEnd.setFullYear(intervalEnd.getFullYear() + 1)
        break
    }
    
    if (intervalEnd > endDate) {
      intervalEnd.setTime(endDate.getTime())
    }
    
    intervals.push({
      start: intervalStart,
      end: intervalEnd
    })
    
    current.setTime(intervalEnd.getTime())
  }
  
  return intervals
}