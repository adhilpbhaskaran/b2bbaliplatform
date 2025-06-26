import { createApiHandler } from '../../../../lib/api/base-handler'
import { ResponseFormatter } from '../../../../lib/api/response-formatter'
import { performanceMonitor } from '../../../../lib/api/performance-monitor'
import { z } from 'zod'

// Query schema for performance metrics
const performanceQuerySchema = z.object({
  timeWindow: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(300).max(86400)).optional(), // 5 minutes to 24 hours
  limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(1000)).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  path: z.string().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  alertType: z.enum(['SLOW_REQUEST', 'HIGH_MEMORY', 'SLOW_QUERY', 'HIGH_ERROR_RATE']).optional()
})

// GET /api/admin/performance - Get performance metrics and statistics
export const GET = createApiHandler(
  async (context) => {
    const { query } = context.validatedData || {}
    const timeWindow = query?.timeWindow || 3600 // Default 1 hour
    
    // Get overall statistics
    const stats = performanceMonitor.getStats(timeWindow * 1000)
    
    // Get recent metrics
    const metrics = performanceMonitor.getMetrics({
      limit: query?.limit || 100,
      startTime: query?.startTime,
      endTime: query?.endTime,
      path: query?.path,
      method: query?.method
    })
    
    // Get recent alerts
    const alerts = performanceMonitor.getAlerts({
      limit: 50,
      severity: query?.severity,
      type: query?.alertType
    })
    
    // Calculate additional insights
    const insights = calculatePerformanceInsights(metrics, stats)
    
    const responseData = {
      stats,
      metrics: metrics.slice(-20), // Last 20 requests for dashboard
      alerts: alerts.slice(0, 10), // Top 10 recent alerts
      insights,
      metadata: {
        timeWindow,
        totalMetrics: metrics.length,
        totalAlerts: alerts.length,
        generatedAt: new Date().toISOString()
      }
    }
    
    return ResponseFormatter.success(responseData, {
      message: 'Performance data retrieved successfully',
      meta: {
        requestId: context.requestId,
        version: '1.0'
      }
    })
  },
  {
    method: 'GET',
    requireAuth: true,
    requiredRole: 'admin',
    validation: {
      query: performanceQuerySchema
    },
    rateLimit: {
      requests: 60,
      window: 60000 // 1 minute
    },
    enablePerformanceMonitoring: true
  }
)

// GET /api/admin/performance/metrics - Get detailed metrics
export const POST = createApiHandler(
  async (context) => {
    const { body } = context.validatedData || {}
    
    if (!body) {
      return ResponseFormatter.badRequest('Request body is required')
    }
    
    // Advanced filtering and aggregation
    const metrics = performanceMonitor.getMetrics({
      limit: body.limit || 500,
      startTime: body.startTime,
      endTime: body.endTime,
      path: body.path,
      method: body.method
    })
    
    // Group metrics by time intervals for charting
    const timeSeriesData = groupMetricsByTime(metrics, body.interval || '5m')
    
    // Calculate percentiles
    const responseTimes = metrics.map(m => m.duration).sort((a, b) => a - b)
    const percentiles = {
      p50: getPercentile(responseTimes, 50),
      p75: getPercentile(responseTimes, 75),
      p90: getPercentile(responseTimes, 90),
      p95: getPercentile(responseTimes, 95),
      p99: getPercentile(responseTimes, 99)
    }
    
    // Endpoint performance breakdown
    const endpointStats = getEndpointStats(metrics)
    
    // Error analysis
    const errorAnalysis = getErrorAnalysis(metrics)
    
    const responseData = {
      timeSeries: timeSeriesData,
      percentiles,
      endpointStats,
      errorAnalysis,
      rawMetrics: body.includeRaw ? metrics : undefined,
      metadata: {
        totalRequests: metrics.length,
        timeRange: {
          start: metrics[0]?.timestamp,
          end: metrics[metrics.length - 1]?.timestamp
        },
        generatedAt: new Date().toISOString()
      }
    }
    
    return ResponseFormatter.success(responseData, {
      message: 'Detailed metrics retrieved successfully',
      meta: {
        requestId: context.requestId
      }
    })
  },
  {
    method: 'POST',
    requireAuth: true,
    requiredRole: 'admin',
    validation: {
      body: z.object({
        startTime: z.string().datetime().optional(),
        endTime: z.string().datetime().optional(),
        path: z.string().optional(),
        method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional(),
        limit: z.number().min(1).max(5000).optional(),
        interval: z.enum(['1m', '5m', '15m', '1h', '1d']).optional(),
        includeRaw: z.boolean().optional()
      })
    },
    rateLimit: {
      requests: 20,
      window: 60000 // 1 minute
    },
    enablePerformanceMonitoring: true
  }
)

// Helper functions
function calculatePerformanceInsights(metrics: any[], stats: any) {
  const insights = []
  
  // Slow endpoints
  const endpointPerformance = new Map()
  metrics.forEach(metric => {
    const key = `${metric.method} ${metric.path}`
    if (!endpointPerformance.has(key)) {
      endpointPerformance.set(key, { total: 0, count: 0, max: 0 })
    }
    const perf = endpointPerformance.get(key)
    perf.total += metric.duration
    perf.count += 1
    perf.max = Math.max(perf.max, metric.duration)
  })
  
  const slowEndpoints = Array.from(endpointPerformance.entries())
    .map(([endpoint, perf]) => ({
      endpoint,
      averageTime: perf.total / perf.count,
      maxTime: perf.max,
      requestCount: perf.count
    }))
    .filter(ep => ep.averageTime > 1000)
    .sort((a, b) => b.averageTime - a.averageTime)
    .slice(0, 5)
  
  if (slowEndpoints.length > 0) {
    insights.push({
      type: 'slow_endpoints',
      severity: 'medium',
      message: `${slowEndpoints.length} endpoints have average response time > 1s`,
      data: slowEndpoints
    })
  }
  
  // High error rate
  if (stats.errorRate > 0.05) {
    insights.push({
      type: 'high_error_rate',
      severity: stats.errorRate > 0.1 ? 'high' : 'medium',
      message: `Error rate is ${(stats.errorRate * 100).toFixed(2)}%`,
      data: { errorRate: stats.errorRate }
    })
  }
  
  // Memory usage trend
  const recentMetrics = metrics.slice(-20)
  const avgMemory = recentMetrics
    .filter(m => m.memoryUsage)
    .reduce((sum, m) => sum + (m.memoryUsage?.heapUsed || 0), 0) / recentMetrics.length
  
  if (avgMemory > 512 * 1024 * 1024) { // 512MB
    insights.push({
      type: 'high_memory_usage',
      severity: avgMemory > 1024 * 1024 * 1024 ? 'high' : 'medium',
      message: `Average memory usage is ${(avgMemory / 1024 / 1024).toFixed(2)}MB`,
      data: { averageMemoryMB: avgMemory / 1024 / 1024 }
    })
  }
  
  return insights
}

function groupMetricsByTime(metrics: any[], interval: string) {
  const intervalMs = {
    '1m': 60000,
    '5m': 300000,
    '15m': 900000,
    '1h': 3600000,
    '1d': 86400000
  }[interval] || 300000
  
  const groups = new Map()
  
  metrics.forEach(metric => {
    const timestamp = new Date(metric.timestamp).getTime()
    const bucket = Math.floor(timestamp / intervalMs) * intervalMs
    
    if (!groups.has(bucket)) {
      groups.set(bucket, {
        timestamp: new Date(bucket).toISOString(),
        requests: 0,
        totalDuration: 0,
        errors: 0,
        memoryUsage: []
      })
    }
    
    const group = groups.get(bucket)
    group.requests += 1
    group.totalDuration += metric.duration
    if (metric.statusCode >= 400) group.errors += 1
    if (metric.memoryUsage) group.memoryUsage.push(metric.memoryUsage.heapUsed)
  })
  
  return Array.from(groups.values()).map(group => ({
    ...group,
    averageDuration: group.totalDuration / group.requests,
    errorRate: group.errors / group.requests,
    averageMemory: group.memoryUsage.length > 0 
      ? group.memoryUsage.reduce((a, b) => a + b, 0) / group.memoryUsage.length
      : 0
  }))
}

function getPercentile(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0
  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1
  return sortedArray[Math.max(0, index)]
}

function getEndpointStats(metrics: any[]) {
  const endpointMap = new Map()
  
  metrics.forEach(metric => {
    const key = `${metric.method} ${metric.path}`
    if (!endpointMap.has(key)) {
      endpointMap.set(key, {
        method: metric.method,
        path: metric.path,
        requests: 0,
        totalDuration: 0,
        errors: 0,
        minDuration: Infinity,
        maxDuration: 0
      })
    }
    
    const stats = endpointMap.get(key)
    stats.requests += 1
    stats.totalDuration += metric.duration
    if (metric.statusCode >= 400) stats.errors += 1
    stats.minDuration = Math.min(stats.minDuration, metric.duration)
    stats.maxDuration = Math.max(stats.maxDuration, metric.duration)
  })
  
  return Array.from(endpointMap.values()).map(stats => ({
    ...stats,
    averageDuration: stats.totalDuration / stats.requests,
    errorRate: stats.errors / stats.requests,
    minDuration: stats.minDuration === Infinity ? 0 : stats.minDuration
  }))
}

function getErrorAnalysis(metrics: any[]) {
  const errorsByStatus = new Map()
  const errorsByPath = new Map()
  
  metrics.filter(m => m.statusCode >= 400).forEach(metric => {
    // Group by status code
    const status = metric.statusCode.toString()
    errorsByStatus.set(status, (errorsByStatus.get(status) || 0) + 1)
    
    // Group by path
    const path = metric.path
    errorsByPath.set(path, (errorsByPath.get(path) || 0) + 1)
  })
  
  return {
    byStatusCode: Array.from(errorsByStatus.entries()).map(([status, count]) => ({ status, count })),
    byPath: Array.from(errorsByPath.entries()).map(([path, count]) => ({ path, count }))
  }
}