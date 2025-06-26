import { NextRequest } from 'next/server'

export interface PerformanceMetrics {
  requestId: string
  method: string
  path: string
  statusCode: number
  duration: number
  timestamp: string
  userAgent?: string
  ip?: string
  userId?: string
  memoryUsage?: {
    rss: number
    heapUsed: number
    heapTotal: number
    external: number
  }
  dbQueries?: {
    count: number
    totalDuration: number
    slowQueries: Array<{
      query: string
      duration: number
    }>
  }
  cacheHits?: {
    hits: number
    misses: number
    hitRate: number
  }
}

export interface PerformanceAlert {
  type: 'SLOW_REQUEST' | 'HIGH_MEMORY' | 'SLOW_QUERY' | 'HIGH_ERROR_RATE'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  metrics: Partial<PerformanceMetrics>
  threshold: number
  actualValue: number
  timestamp: string
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: PerformanceMetrics[] = []
  private alerts: PerformanceAlert[] = []
  private readonly maxMetricsHistory = 1000
  private readonly maxAlertsHistory = 100

  // Performance thresholds
  private readonly thresholds = {
    slowRequestMs: 5000,
    verySlowRequestMs: 10000,
    highMemoryMB: 512,
    criticalMemoryMB: 1024,
    slowQueryMs: 1000,
    verySlowQueryMs: 3000,
    highErrorRate: 0.05, // 5%
    criticalErrorRate: 0.1 // 10%
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  startRequest(request: NextRequest): PerformanceTracker {
    return new PerformanceTracker(this, request)
  }

  recordMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics)
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory)
    }

    // Check for performance issues
    this.checkPerformanceThresholds(metrics)
  }

  private checkPerformanceThresholds(metrics: PerformanceMetrics): void {
    // Check slow requests
    if (metrics.duration > this.thresholds.verySlowRequestMs) {
      this.createAlert({
        type: 'SLOW_REQUEST',
        severity: 'critical',
        message: `Very slow request detected: ${metrics.duration}ms`,
        metrics,
        threshold: this.thresholds.verySlowRequestMs,
        actualValue: metrics.duration
      })
    } else if (metrics.duration > this.thresholds.slowRequestMs) {
      this.createAlert({
        type: 'SLOW_REQUEST',
        severity: 'medium',
        message: `Slow request detected: ${metrics.duration}ms`,
        metrics,
        threshold: this.thresholds.slowRequestMs,
        actualValue: metrics.duration
      })
    }

    // Check memory usage
    if (metrics.memoryUsage) {
      const memoryMB = metrics.memoryUsage.heapUsed / 1024 / 1024
      
      if (memoryMB > this.thresholds.criticalMemoryMB) {
        this.createAlert({
          type: 'HIGH_MEMORY',
          severity: 'critical',
          message: `Critical memory usage: ${memoryMB.toFixed(2)}MB`,
          metrics,
          threshold: this.thresholds.criticalMemoryMB,
          actualValue: memoryMB
        })
      } else if (memoryMB > this.thresholds.highMemoryMB) {
        this.createAlert({
          type: 'HIGH_MEMORY',
          severity: 'medium',
          message: `High memory usage: ${memoryMB.toFixed(2)}MB`,
          metrics,
          threshold: this.thresholds.highMemoryMB,
          actualValue: memoryMB
        })
      }
    }

    // Check slow queries
    if (metrics.dbQueries?.slowQueries.length) {
      const slowestQuery = metrics.dbQueries.slowQueries[0]
      
      if (slowestQuery.duration > this.thresholds.verySlowQueryMs) {
        this.createAlert({
          type: 'SLOW_QUERY',
          severity: 'critical',
          message: `Very slow database query: ${slowestQuery.duration}ms`,
          metrics,
          threshold: this.thresholds.verySlowQueryMs,
          actualValue: slowestQuery.duration
        })
      } else if (slowestQuery.duration > this.thresholds.slowQueryMs) {
        this.createAlert({
          type: 'SLOW_QUERY',
          severity: 'medium',
          message: `Slow database query: ${slowestQuery.duration}ms`,
          metrics,
          threshold: this.thresholds.slowQueryMs,
          actualValue: slowestQuery.duration
        })
      }
    }

    // Check error rates (every 10 requests)
    if (this.metrics.length % 10 === 0) {
      this.checkErrorRate()
    }
  }

  private checkErrorRate(): void {
    const recentMetrics = this.metrics.slice(-100) // Last 100 requests
    const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length
    const errorRate = errorCount / recentMetrics.length

    if (errorRate > this.thresholds.criticalErrorRate) {
      this.createAlert({
        type: 'HIGH_ERROR_RATE',
        severity: 'critical',
        message: `Critical error rate: ${(errorRate * 100).toFixed(2)}%`,
        metrics: {},
        threshold: this.thresholds.criticalErrorRate,
        actualValue: errorRate
      })
    } else if (errorRate > this.thresholds.highErrorRate) {
      this.createAlert({
        type: 'HIGH_ERROR_RATE',
        severity: 'medium',
        message: `High error rate: ${(errorRate * 100).toFixed(2)}%`,
        metrics: {},
        threshold: this.thresholds.highErrorRate,
        actualValue: errorRate
      })
    }
  }

  private createAlert(alert: Omit<PerformanceAlert, 'timestamp'>): void {
    const fullAlert: PerformanceAlert = {
      ...alert,
      timestamp: new Date().toISOString()
    }

    this.alerts.push(fullAlert)
    
    // Keep only recent alerts
    if (this.alerts.length > this.maxAlertsHistory) {
      this.alerts = this.alerts.slice(-this.maxAlertsHistory)
    }

    // Log alert (in production, send to monitoring service)
    console.warn('Performance Alert:', fullAlert)
  }

  getMetrics(options: {
    limit?: number
    startTime?: string
    endTime?: string
    path?: string
    method?: string
  } = {}): PerformanceMetrics[] {
    let filtered = [...this.metrics]

    if (options.startTime) {
      filtered = filtered.filter(m => m.timestamp >= options.startTime!)
    }

    if (options.endTime) {
      filtered = filtered.filter(m => m.timestamp <= options.endTime!)
    }

    if (options.path) {
      filtered = filtered.filter(m => m.path.includes(options.path!))
    }

    if (options.method) {
      filtered = filtered.filter(m => m.method === options.method)
    }

    if (options.limit) {
      filtered = filtered.slice(-options.limit)
    }

    return filtered
  }

  getAlerts(options: {
    limit?: number
    severity?: PerformanceAlert['severity']
    type?: PerformanceAlert['type']
  } = {}): PerformanceAlert[] {
    let filtered = [...this.alerts]

    if (options.severity) {
      filtered = filtered.filter(a => a.severity === options.severity)
    }

    if (options.type) {
      filtered = filtered.filter(a => a.type === options.type)
    }

    if (options.limit) {
      filtered = filtered.slice(-options.limit)
    }

    return filtered.reverse() // Most recent first
  }

  getStats(timeWindow: number = 3600000): {
    totalRequests: number
    averageResponseTime: number
    errorRate: number
    slowRequestsCount: number
    memoryStats: {
      average: number
      peak: number
    }
  } {
    const cutoff = new Date(Date.now() - timeWindow).toISOString()
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoff)

    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        slowRequestsCount: 0,
        memoryStats: { average: 0, peak: 0 }
      }
    }

    const totalRequests = recentMetrics.length
    const averageResponseTime = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests
    const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length
    const errorRate = errorCount / totalRequests
    const slowRequestsCount = recentMetrics.filter(m => m.duration > this.thresholds.slowRequestMs).length

    const memoryUsages = recentMetrics
      .filter(m => m.memoryUsage)
      .map(m => m.memoryUsage!.heapUsed / 1024 / 1024)
    
    const memoryStats = {
      average: memoryUsages.length > 0 ? memoryUsages.reduce((sum, m) => sum + m, 0) / memoryUsages.length : 0,
      peak: memoryUsages.length > 0 ? Math.max(...memoryUsages) : 0
    }

    return {
      totalRequests,
      averageResponseTime,
      errorRate,
      slowRequestsCount,
      memoryStats
    }
  }
}

export class PerformanceTracker {
  private startTime: number
  private startMemory: NodeJS.MemoryUsage
  private dbQueries: Array<{ query: string; duration: number }> = []
  private cacheOperations = { hits: 0, misses: 0 }

  constructor(
    private monitor: PerformanceMonitor,
    private request: NextRequest
  ) {
    this.startTime = Date.now()
    this.startMemory = process.memoryUsage()
  }

  recordDbQuery(query: string, duration: number): void {
    this.dbQueries.push({ query, duration })
  }

  recordCacheHit(): void {
    this.cacheOperations.hits++
  }

  recordCacheMiss(): void {
    this.cacheOperations.misses++
  }

  finish(statusCode: number, userId?: string): void {
    const endTime = Date.now()
    const duration = endTime - this.startTime
    const endMemory = process.memoryUsage()

    const metrics: PerformanceMetrics = {
      requestId: `req_${this.startTime}_${Math.random().toString(36).substr(2, 9)}`,
      method: this.request.method,
      path: this.request.nextUrl.pathname,
      statusCode,
      duration,
      timestamp: new Date().toISOString(),
      userAgent: this.request.headers.get('user-agent') || undefined,
      ip: this.request.headers.get('x-forwarded-for') || 
          this.request.headers.get('x-real-ip') || 
          'unknown',
      userId,
      memoryUsage: endMemory,
      dbQueries: {
        count: this.dbQueries.length,
        totalDuration: this.dbQueries.reduce((sum, q) => sum + q.duration, 0),
        slowQueries: this.dbQueries
          .filter(q => q.duration > 100) // Queries slower than 100ms
          .sort((a, b) => b.duration - a.duration)
          .slice(0, 5) // Top 5 slowest
      },
      cacheHits: {
        hits: this.cacheOperations.hits,
        misses: this.cacheOperations.misses,
        hitRate: this.cacheOperations.hits + this.cacheOperations.misses > 0 
          ? this.cacheOperations.hits / (this.cacheOperations.hits + this.cacheOperations.misses)
          : 0
      }
    }

    this.monitor.recordMetrics(metrics)
  }
}

// Global performance monitor instance
export const performanceMonitor = PerformanceMonitor.getInstance()

// Middleware helper
export function withPerformanceMonitoring<T>(
  handler: (tracker: PerformanceTracker) => Promise<T>
) {
  return async (request: NextRequest): Promise<T> => {
    const tracker = performanceMonitor.startRequest(request)
    
    try {
      const result = await handler(tracker)
      tracker.finish(200) // Assume success if no error
      return result
    } catch (error) {
      tracker.finish(500) // Assume server error
      throw error
    }
  }
}