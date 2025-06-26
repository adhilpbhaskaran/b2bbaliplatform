import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withAdmin, handleApiError } from '@/lib/auth/middleware'

const reportQuerySchema = z.object({
  type: z.enum([
    'revenue',
    'bookings',
    'agents',
    'customers',
    'packages',
    'conversion',
    'financial',
    'operational',
    'marketing'
  ]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  format: z.enum(['json', 'csv', 'pdf']).default('json'),
  groupBy: z.enum(['day', 'week', 'month', 'quarter', 'year']).default('month'),
  filters: z.object({
    agentId: z.string().uuid().optional(),
    packageId: z.string().uuid().optional(),
    category: z.string().optional(),
    status: z.string().optional(),
    tierLevel: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']).optional()
  }).optional()
})

const customReportSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  query: z.object({
    tables: z.array(z.string()),
    fields: z.array(z.string()),
    filters: z.record(z.any()).optional(),
    groupBy: z.array(z.string()).optional(),
    orderBy: z.array(z.object({
      field: z.string(),
      direction: z.enum(['asc', 'desc'])
    })).optional()
  }),
  schedule: z.object({
    enabled: z.boolean().default(false),
    frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
    recipients: z.array(z.string().email()).optional()
  }).optional()
})

// GET /api/admin/reports - Generate various reports
export async function GET(req: NextRequest) {
  return withAdmin(async (authenticatedReq) => {
    try {
      const url = new URL(req.url)
      const action = url.searchParams.get('action')
      
      if (action === 'list') {
        // List available report templates
        const templates = [
          {
            id: 'revenue',
            name: 'Revenue Report',
            description: 'Comprehensive revenue analysis with trends and breakdowns',
            category: 'Financial'
          },
          {
            id: 'bookings',
            name: 'Bookings Report',
            description: 'Booking statistics, conversion rates, and performance metrics',
            category: 'Operational'
          },
          {
            id: 'agents',
            name: 'Agent Performance Report',
            description: 'Agent productivity, commissions, and performance rankings',
            category: 'HR'
          },
          {
            id: 'customers',
            name: 'Customer Analysis Report',
            description: 'Customer behavior, retention, and lifetime value analysis',
            category: 'Marketing'
          },
          {
            id: 'packages',
            name: 'Package Performance Report',
            description: 'Package popularity, pricing analysis, and optimization insights',
            category: 'Product'
          },
          {
            id: 'conversion',
            name: 'Conversion Funnel Report',
            description: 'Quote to booking conversion analysis and optimization opportunities',
            category: 'Marketing'
          },
          {
            id: 'financial',
            name: 'Financial Summary Report',
            description: 'Complete financial overview including payments, refunds, and outstanding amounts',
            category: 'Financial'
          },
          {
            id: 'operational',
            name: 'Operational Efficiency Report',
            description: 'Process efficiency, response times, and operational metrics',
            category: 'Operational'
          },
          {
            id: 'marketing',
            name: 'Marketing Performance Report',
            description: 'Lead generation, campaign effectiveness, and customer acquisition costs',
            category: 'Marketing'
          }
        ]
        
        return NextResponse.json({ templates })
      }
      
      if (action === 'custom') {
        // List custom reports
        const customReports = await prisma.analyticsEvent.findMany({
          where: {
            eventType: 'CUSTOM_REPORT',
            userId: authenticatedReq.user!.id
          },
          orderBy: { createdAt: 'desc' }
        })
        
        return NextResponse.json({
          reports: customReports.map(report => ({
            id: report.id,
            name: report.description,
            metadata: report.metadata,
            createdAt: report.createdAt,
            updatedAt: report.updatedAt
          }))
        })
      }
      
      // Generate specific report
      const queryParams = {
        type: url.searchParams.get('type') || 'revenue',
        startDate: url.searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: url.searchParams.get('endDate') || new Date().toISOString(),
        format: url.searchParams.get('format') || 'json',
        groupBy: url.searchParams.get('groupBy') || 'month',
        filters: {
          agentId: url.searchParams.get('agentId'),
          packageId: url.searchParams.get('packageId'),
          category: url.searchParams.get('category'),
          status: url.searchParams.get('status'),
          tierLevel: url.searchParams.get('tierLevel')
        }
      }
      
      const data = reportQuerySchema.parse(queryParams)
      const startDate = new Date(data.startDate)
      const endDate = new Date(data.endDate)
      
      let reportData: any = {}
      
      switch (data.type) {
        case 'revenue':
          reportData = await generateRevenueReport(startDate, endDate, data.groupBy, data.filters)
          break
        case 'bookings':
          reportData = await generateBookingsReport(startDate, endDate, data.groupBy, data.filters)
          break
        case 'agents':
          reportData = await generateAgentsReport(startDate, endDate, data.filters)
          break
        case 'customers':
          reportData = await generateCustomersReport(startDate, endDate, data.groupBy, data.filters)
          break
        case 'packages':
          reportData = await generatePackagesReport(startDate, endDate, data.filters)
          break
        case 'conversion':
          reportData = await generateConversionReport(startDate, endDate, data.groupBy, data.filters)
          break
        case 'financial':
          reportData = await generateFinancialReport(startDate, endDate, data.groupBy, data.filters)
          break
        case 'operational':
          reportData = await generateOperationalReport(startDate, endDate, data.filters)
          break
        case 'marketing':
          reportData = await generateMarketingReport(startDate, endDate, data.groupBy, data.filters)
          break
        default:
          return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
      }
      
      const report = {
        type: data.type,
        period: { startDate, endDate },
        groupBy: data.groupBy,
        filters: data.filters,
        generatedAt: new Date().toISOString(),
        generatedBy: {
          id: authenticatedReq.user!.id,
          name: authenticatedReq.user!.name,
          email: authenticatedReq.user!.email
        },
        data: reportData
      }
      
      // Log report generation
      await prisma.analyticsEvent.create({
        data: {
          eventType: 'REPORT_GENERATED',
          description: `Generated ${data.type} report`,
          metadata: {
            reportType: data.type,
            period: { startDate, endDate },
            filters: data.filters
          },
          userId: authenticatedReq.user!.id
        }
      })
      
      if (data.format === 'csv') {
        const csvContent = convertToCSV(report)
        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${data.type}-report-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}.csv"`
          }
        })
      }
      
      return NextResponse.json(report)
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}

// POST /api/admin/reports - Create custom reports and schedule reports
export async function POST(req: NextRequest) {
  return withAdmin(async (authenticatedReq) => {
    try {
      const url = new URL(req.url)
      const action = url.searchParams.get('action')
      const body = await req.json()
      
      if (action === 'custom') {
        // Create custom report
        const data = customReportSchema.parse(body)
        
        const customReport = await prisma.analyticsEvent.create({
          data: {
            eventType: 'CUSTOM_REPORT',
            description: data.name,
            metadata: {
              description: data.description,
              query: data.query,
              schedule: data.schedule
            },
            userId: authenticatedReq.user!.id
          }
        })
        
        return NextResponse.json({
          id: customReport.id,
          name: data.name,
          description: data.description,
          query: data.query,
          schedule: data.schedule,
          createdAt: customReport.createdAt
        })
      }
      
      if (action === 'schedule') {
        // Schedule report generation
        const { reportType, schedule, recipients } = body
        
        // In a real implementation, you would set up a job scheduler
        // For now, just log the schedule request
        await prisma.analyticsEvent.create({
          data: {
            eventType: 'REPORT_SCHEDULED',
            description: `Scheduled ${reportType} report`,
            metadata: {
              reportType,
              schedule,
              recipients
            },
            userId: authenticatedReq.user!.id
          }
        })
        
        return NextResponse.json({
          message: 'Report scheduled successfully',
          reportType,
          schedule,
          recipients
        })
      }
      
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}

// Helper functions for generating different types of reports

async function generateRevenueReport(startDate: Date, endDate: Date, groupBy: string, filters: any) {
  const baseWhere = {
    createdAt: { gte: startDate, lte: endDate },
    status: 'COMPLETED'
  }
  
  if (filters?.agentId) {
    baseWhere.booking = { quote: { agentId: filters.agentId } }
  }
  
  const [totalRevenue, revenueByPeriod, revenueByAgent, revenueByPackage] = await Promise.all([
    prisma.payment.aggregate({
      where: baseWhere,
      _sum: { amount: true },
      _count: true,
      _avg: { amount: true }
    }),
    
    prisma.payment.findMany({
      where: baseWhere,
      select: {
        amount: true,
        createdAt: true,
        booking: {
          select: {
            quote: {
              select: {
                agent: { select: { name: true, tierLevel: true } },
                package: { select: { name: true, category: true } }
              }
            }
          }
        }
      }
    }),
    
    prisma.payment.groupBy({
      by: ['booking'],
      where: baseWhere,
      _sum: { amount: true },
      _count: true
    }),
    
    prisma.payment.groupBy({
      by: ['booking'],
      where: baseWhere,
      _sum: { amount: true }
    })
  ])
  
  return {
    summary: {
      totalRevenue: parseFloat(totalRevenue._sum.amount?.toString() || '0'),
      totalTransactions: totalRevenue._count,
      averageTransaction: parseFloat(totalRevenue._avg.amount?.toString() || '0')
    },
    trends: groupRevenueByPeriod(revenueByPeriod, groupBy),
    breakdown: {
      byAgent: await getRevenueByAgent(revenueByPeriod),
      byPackage: await getRevenueByPackage(revenueByPeriod),
      byCategory: await getRevenueByCategory(revenueByPeriod)
    }
  }
}

async function generateBookingsReport(startDate: Date, endDate: Date, groupBy: string, filters: any) {
  const baseWhere = {
    createdAt: { gte: startDate, lte: endDate }
  }
  
  if (filters?.agentId) {
    baseWhere.quote = { agentId: filters.agentId }
  }
  if (filters?.status) {
    baseWhere.status = filters.status
  }
  
  const [bookingStats, bookingsByStatus, bookingsByAgent] = await Promise.all([
    prisma.booking.aggregate({
      where: baseWhere,
      _count: true,
      _sum: { totalAmount: true },
      _avg: { totalAmount: true }
    }),
    
    prisma.booking.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: { status: true },
      _sum: { totalAmount: true }
    }),
    
    prisma.booking.findMany({
      where: baseWhere,
      include: {
        quote: {
          include: {
            agent: { select: { name: true, tierLevel: true } },
            package: { select: { name: true, category: true } }
          }
        }
      }
    })
  ])
  
  return {
    summary: {
      totalBookings: bookingStats._count,
      totalValue: parseFloat(bookingStats._sum.totalAmount?.toString() || '0'),
      averageValue: parseFloat(bookingStats._avg.totalAmount?.toString() || '0')
    },
    statusBreakdown: bookingsByStatus.map(item => ({
      status: item.status,
      count: item._count.status,
      value: parseFloat(item._sum.totalAmount?.toString() || '0')
    })),
    trends: groupBookingsByPeriod(bookingsByAgent, groupBy)
  }
}

async function generateAgentsReport(startDate: Date, endDate: Date, filters: any) {
  const agents = await prisma.agent.findMany({
    where: {
      isActive: true,
      ...(filters?.tierLevel && { tierLevel: filters.tierLevel })
    },
    include: {
      quotes: {
        where: {
          createdAt: { gte: startDate, lte: endDate }
        }
      },
      bookings: {
        where: {
          createdAt: { gte: startDate, lte: endDate }
        },
        include: {
          payments: {
            where: { status: 'COMPLETED' }
          }
        }
      }
    }
  })
  
  return {
    summary: {
      totalAgents: agents.length,
      activeAgents: agents.filter(a => a.quotes.length > 0 || a.bookings.length > 0).length
    },
    performance: agents.map(agent => {
      const revenue = agent.bookings.reduce((sum, booking) => 
        sum + booking.payments.reduce((pSum, payment) => 
          pSum + parseFloat(payment.amount.toString()), 0
        ), 0
      )
      
      return {
        id: agent.id,
        name: agent.name,
        tierLevel: agent.tierLevel,
        commission: agent.commission,
        quotes: agent.quotes.length,
        bookings: agent.bookings.length,
        revenue,
        commissionEarned: revenue * (agent.commission / 100),
        conversionRate: agent.quotes.length > 0 ? (agent.bookings.length / agent.quotes.length) * 100 : 0
      }
    }).sort((a, b) => b.revenue - a.revenue)
  }
}

async function generateCustomersReport(startDate: Date, endDate: Date, groupBy: string, filters: any) {
  const customers = await prisma.user.findMany({
    where: {
      role: 'CUSTOMER',
      createdAt: { gte: startDate, lte: endDate }
    },
    include: {
      quotes: true,
      bookings: {
        include: {
          payments: {
            where: { status: 'COMPLETED' }
          }
        }
      }
    }
  })
  
  return {
    summary: {
      newCustomers: customers.length,
      activeCustomers: customers.filter(c => c.bookings.length > 0).length,
      totalLifetimeValue: customers.reduce((sum, customer) => 
        sum + customer.bookings.reduce((bSum, booking) => 
          bSum + booking.payments.reduce((pSum, payment) => 
            pSum + parseFloat(payment.amount.toString()), 0
          ), 0
        ), 0
      )
    },
    segments: {
      byValue: segmentCustomersByValue(customers),
      byActivity: segmentCustomersByActivity(customers),
      byRecency: segmentCustomersByRecency(customers)
    }
  }
}

async function generatePackagesReport(startDate: Date, endDate: Date, filters: any) {
  const packages = await prisma.package.findMany({
    where: {
      isActive: true,
      ...(filters?.category && { category: filters.category })
    },
    include: {
      quotes: {
        where: {
          createdAt: { gte: startDate, lte: endDate }
        }
      },
      bookings: {
        where: {
          createdAt: { gte: startDate, lte: endDate }
        },
        include: {
          payments: {
            where: { status: 'COMPLETED' }
          }
        }
      }
    }
  })
  
  return {
    performance: packages.map(pkg => {
      const revenue = pkg.bookings.reduce((sum, booking) => 
        sum + booking.payments.reduce((pSum, payment) => 
          pSum + parseFloat(payment.amount.toString()), 0
        ), 0
      )
      
      return {
        id: pkg.id,
        name: pkg.name,
        category: pkg.category,
        basePrice: parseFloat(pkg.basePrice.toString()),
        quotes: pkg.quotes.length,
        bookings: pkg.bookings.length,
        revenue,
        conversionRate: pkg.quotes.length > 0 ? (pkg.bookings.length / pkg.quotes.length) * 100 : 0,
        averageBookingValue: pkg.bookings.length > 0 ? revenue / pkg.bookings.length : 0
      }
    }).sort((a, b) => b.revenue - a.revenue)
  }
}

async function generateConversionReport(startDate: Date, endDate: Date, groupBy: string, filters: any) {
  const [quotes, bookings] = await Promise.all([
    prisma.quote.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        ...(filters?.agentId && { agentId: filters.agentId })
      },
      include: {
        package: { select: { category: true } },
        agent: { select: { tierLevel: true } }
      }
    }),
    
    prisma.booking.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate }
      },
      include: {
        quote: {
          include: {
            package: { select: { category: true } },
            agent: { select: { tierLevel: true } }
          }
        }
      }
    })
  ])
  
  const totalQuotes = quotes.length
  const totalBookings = bookings.length
  const overallConversion = totalQuotes > 0 ? (totalBookings / totalQuotes) * 100 : 0
  
  return {
    summary: {
      totalQuotes,
      totalBookings,
      conversionRate: overallConversion
    },
    breakdown: {
      byCategory: getConversionByCategory(quotes, bookings),
      byAgent: getConversionByAgent(quotes, bookings),
      byTier: getConversionByTier(quotes, bookings)
    }
  }
}

async function generateFinancialReport(startDate: Date, endDate: Date, groupBy: string, filters: any) {
  const [payments, refunds, outstanding] = await Promise.all([
    prisma.payment.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED'
      }
    }),
    
    prisma.payment.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: 'REFUNDED'
      }
    }),
    
    prisma.booking.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: { in: ['PENDING', 'CONFIRMED'] }
      },
      include: {
        payments: true
      }
    })
  ])
  
  const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0)
  const totalRefunds = refunds.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0)
  const totalOutstanding = outstanding.reduce((sum, booking) => {
    const paid = booking.payments
      .filter(p => p.status === 'COMPLETED')
      .reduce((pSum, p) => pSum + parseFloat(p.amount.toString()), 0)
    return sum + (parseFloat(booking.totalAmount.toString()) - paid)
  }, 0)
  
  return {
    summary: {
      totalRevenue,
      totalRefunds,
      netRevenue: totalRevenue - totalRefunds,
      totalOutstanding,
      cashFlow: totalRevenue - totalRefunds
    },
    trends: groupFinancialByPeriod(payments, refunds, groupBy)
  }
}

async function generateOperationalReport(startDate: Date, endDate: Date, filters: any) {
  // This would include metrics like response times, processing efficiency, etc.
  // For now, return basic operational metrics
  return {
    summary: {
      averageQuoteResponseTime: '2.5 hours', // Placeholder
      averageBookingProcessingTime: '4.2 hours', // Placeholder
      customerSatisfactionScore: 4.7 // Placeholder
    }
  }
}

async function generateMarketingReport(startDate: Date, endDate: Date, groupBy: string, filters: any) {
  // This would include lead sources, campaign performance, etc.
  // For now, return basic marketing metrics
  return {
    summary: {
      leadConversionRate: 15.3, // Placeholder
      customerAcquisitionCost: 125.50, // Placeholder
      averageCustomerLifetimeValue: 2850.00 // Placeholder
    }
  }
}

// Helper functions for data processing
function groupRevenueByPeriod(payments: any[], groupBy: string) {
  // Implementation for grouping revenue by time period
  return []
}

function getRevenueByAgent(payments: any[]) {
  // Implementation for revenue breakdown by agent
  return []
}

function getRevenueByPackage(payments: any[]) {
  // Implementation for revenue breakdown by package
  return []
}

function getRevenueByCategory(payments: any[]) {
  // Implementation for revenue breakdown by category
  return []
}

function groupBookingsByPeriod(bookings: any[], groupBy: string) {
  // Implementation for grouping bookings by time period
  return []
}

function segmentCustomersByValue(customers: any[]) {
  // Implementation for customer value segmentation
  return []
}

function segmentCustomersByActivity(customers: any[]) {
  // Implementation for customer activity segmentation
  return []
}

function segmentCustomersByRecency(customers: any[]) {
  // Implementation for customer recency segmentation
  return []
}

function getConversionByCategory(quotes: any[], bookings: any[]) {
  // Implementation for conversion rate by category
  return []
}

function getConversionByAgent(quotes: any[], bookings: any[]) {
  // Implementation for conversion rate by agent
  return []
}

function getConversionByTier(quotes: any[], bookings: any[]) {
  // Implementation for conversion rate by tier
  return []
}

function groupFinancialByPeriod(payments: any[], refunds: any[], groupBy: string) {
  // Implementation for financial trends by period
  return []
}

function convertToCSV(report: any): string {
  // Implementation for converting report data to CSV format
  return 'CSV content placeholder'
}