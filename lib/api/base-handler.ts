import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { rateLimit } from '../rate-limiting'
import { validateInput } from '../validation'
import { ApiSecurity } from './security'
import { SecurityMonitoring } from '../security/monitoring'
import { ResponseFormatter } from './response-formatter'
import { errorHandler, withErrorHandling, ErrorContext } from './enhanced-error-handling'
import { performanceMonitor, PerformanceTracker } from './performance-monitor'
import { z } from 'zod'

export interface ApiHandlerOptions<T = any> {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  requireAuth?: boolean
  requiredRole?: string
  rateLimit?: {
    requests: number
    window: number
  }
  validation?: {
    body?: z.ZodSchema<T>
    query?: z.ZodSchema
    params?: z.ZodSchema
  }
  skipSecurityHeaders?: boolean
  enablePerformanceMonitoring?: boolean
  customErrorHandler?: boolean
}

export interface ApiContext<T = any> {
  user?: {
    id: string
    email?: string
    role?: string
  }
  validatedData?: {
    body?: T
    query?: any
    params?: any
  }
  request: NextRequest
  performanceTracker?: PerformanceTracker
  requestId: string
}

export abstract class BaseApiHandler {
  protected security = new ApiSecurity()
  protected monitoring = new SecurityMonitoring()

  constructor(protected options: ApiHandlerOptions = {}) {}

  async handle(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now()
    const ip = this.getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    try {
      // Rate limiting
      if (this.options.rateLimit) {
        const rateLimitResult = checkRateLimit(
          ip,
          this.options.rateLimit.requests,
          this.options.rateLimit.windowMs
        )
        
        if (!rateLimitResult.allowed) {
          await this.monitoring.logSecurityEvent({
            type: 'RATE_LIMIT_EXCEEDED',
            severity: 'medium',
            details: { ip, userAgent },
            metadata: { limit: this.options.rateLimit.requests }
          })
          
          return this.security.errorResponse('RATE_LIMIT_EXCEEDED', {
            retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
          })
        }
      }

      // Authentication check
      let user = null
      if (this.options.requireAuth) {
        // Implementation would depend on your auth system
        // This is a placeholder
        user = await this.getCurrentUser(request)
        if (!user) {
          return this.security.errorResponse('AUTHENTICATION_REQUIRED')
        }
      }

      // Role-based authorization
      if (this.options.requiredRole && user) {
        if (!this.options.requiredRole.includes(user.role)) {
          await this.monitoring.logSecurityEvent({
            type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
            severity: 'high',
            details: { userId: user.id, requiredRole: this.options.requiredRole, userRole: user.role },
            metadata: { ip, userAgent }
          })
          
          return this.security.errorResponse('INSUFFICIENT_PERMISSIONS')
        }
      }

      const context: ApiContext = {
        user,
        ip,
        userAgent,
        startTime
      }

      // Route to appropriate method
      const method = request.method
      let response: ApiResponse<any>

      switch (method) {
        case 'GET':
          response = await this.get(request, context)
          break
        case 'POST':
          response = await this.post(request, context)
          break
        case 'PUT':
          response = await this.put(request, context)
          break
        case 'DELETE':
          response = await this.delete(request, context)
          break
        case 'PATCH':
          response = await this.patch(request, context)
          break
        default:
          return this.security.errorResponse('METHOD_NOT_ALLOWED')
      }

      // Log performance metrics
      const duration = Date.now() - startTime
      if (duration > 1000) { // Log slow requests
        await this.monitoring.logSecurityEvent({
          type: 'SLOW_REQUEST',
          severity: 'low',
          details: { method, path: request.nextUrl.pathname, duration },
          metadata: { ip, userAgent }
        })
      }

      return this.security.successResponse(response.data, response.message, {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
        duration
      })

    } catch (error) {
      await this.monitoring.logSecurityEvent({
        type: 'API_ERROR',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        metadata: { ip, userAgent, path: request.nextUrl.pathname }
      })

      return this.security.errorResponse('INTERNAL_SERVER_ERROR', {
        requestId: this.generateRequestId()
      })
    }
  }

  // Abstract methods to be implemented by subclasses
  protected async get(request: NextRequest, context: ApiContext): Promise<ApiResponse<any>> {
    return this.security.errorResponse('METHOD_NOT_ALLOWED')
  }

  protected async post(request: NextRequest, context: ApiContext): Promise<ApiResponse<any>> {
    return this.security.errorResponse('METHOD_NOT_ALLOWED')
  }

  protected async put(request: NextRequest, context: ApiContext): Promise<ApiResponse<any>> {
    return this.security.errorResponse('METHOD_NOT_ALLOWED')
  }

  protected async delete(request: NextRequest, context: ApiContext): Promise<ApiResponse<any>> {
    return this.security.errorResponse('METHOD_NOT_ALLOWED')
  }

  protected async patch(request: NextRequest, context: ApiContext): Promise<ApiResponse<any>> {
    return this.security.errorResponse('METHOD_NOT_ALLOWED')
  }

  // Helper methods
  protected async parseBody<T>(request: NextRequest): Promise<T> {
    try {
      return await request.json()
    } catch (error) {
      throw new Error('Invalid JSON body')
    }
  }

  protected validateInput<T>(data: T, validator: (data: T) => { success: boolean; error?: string }): T {
    const result = validator(data)
    if (!result.success) {
      throw new Error(result.error || 'Validation failed')
    }
    return data
  }

  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const cfConnectingIP = request.headers.get('cf-connecting-ip')
    
    if (cfConnectingIP) return cfConnectingIP
    if (realIP) return realIP
    if (forwarded) return forwarded.split(',')[0].trim()
    
    return 'unknown'
  }

  private async getCurrentUser(request: NextRequest): Promise<any> {
    // This would integrate with your auth system
    // Placeholder implementation
    return null
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

export function createApiHandler<T = any>(
  handler: (context: ApiContext<T>) => Promise<NextResponse>,
  options: ApiHandlerOptions<T> = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const security = new ApiSecurity()
    const monitoring = new SecurityMonitoring()
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Start performance monitoring
    const performanceTracker = options.enablePerformanceMonitoring !== false 
      ? performanceMonitor.startRequest(request) 
      : undefined

    const errorContext: ErrorContext = {
      requestId,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      path: request.nextUrl.pathname,
      method: request.method,
      timestamp: new Date().toISOString()
    }

    // Use enhanced error handling if enabled
    if (options.customErrorHandler !== false) {
      return withErrorHandling(async () => {
        return await executeHandler()
      }, errorContext) as Promise<NextResponse>
    }

    async function executeHandler(): Promise<NextResponse> {
      try {
        // Method validation
        if (options.method && request.method !== options.method) {
          const response = ResponseFormatter.error('METHOD_NOT_ALLOWED', 'Method not allowed', {
            status: 405,
            meta: { requestId }
          })
          performanceTracker?.finish(405)
          return response
        }

        // Security headers
        if (!options.skipSecurityHeaders) {
          const securityResponse = security.addSecurityHeaders(new NextResponse())
          if (securityResponse.status !== 200) {
            performanceTracker?.finish(securityResponse.status)
            return securityResponse
          }
        }

        // Rate limiting
        if (options.rateLimit) {
          const rateLimitResult = await rateLimit(
            request,
            options.rateLimit.requests,
            options.rateLimit.window
          )
          
          if (!rateLimitResult.success) {
            await monitoring.logSecurityEvent({
              type: 'RATE_LIMIT_EXCEEDED',
              severity: 'medium',
              details: {
                ip: errorContext.ip,
                path: request.nextUrl.pathname,
                limit: options.rateLimit.requests,
                window: options.rateLimit.window
              },
              metadata: { requestId }
            })
            
            const response = ResponseFormatter.tooManyRequests('Rate limit exceeded', {
              retryAfter: rateLimitResult.retryAfter,
              meta: { requestId }
            })
            performanceTracker?.finish(429)
            return response
          }
        }

        // Authentication
        let user: ApiContext['user'] | undefined
        if (options.requireAuth) {
          const { userId } = auth()
          if (!userId) {
            await monitoring.logSecurityEvent({
              type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
              severity: 'medium',
              details: {
                ip: errorContext.ip,
                path: request.nextUrl.pathname,
                userAgent: errorContext.userAgent
              },
              metadata: { requestId }
            })
            
            const response = ResponseFormatter.unauthorized('Authentication required', {
              meta: { requestId }
            })
            performanceTracker?.finish(401, userId)
            return response
          }

          // Get user details (implement based on your user model)
          user = {
            id: userId,
            // Add email and role fetching logic here
          }
          
          errorContext.userId = userId

          // Role-based authorization
          if (options.requiredRole && user.role !== options.requiredRole) {
            await monitoring.logSecurityEvent({
              type: 'INSUFFICIENT_PERMISSIONS',
              severity: 'medium',
              details: {
                userId: user.id,
                requiredRole: options.requiredRole,
                userRole: user.role,
                path: request.nextUrl.pathname
              },
              metadata: { requestId }
            })
            
            const response = ResponseFormatter.forbidden('Insufficient permissions', {
              meta: { requestId }
            })
            performanceTracker?.finish(403, userId)
            return response
          }
        }

        // Input validation
        let validatedData: ApiContext<T>['validatedData'] = {}
        if (options.validation) {
          try {
            if (options.validation.body && request.method !== 'GET') {
              const body = await request.json()
              validatedData.body = await validateInput(body, options.validation.body)
            }

            if (options.validation.query) {
              const query = Object.fromEntries(request.nextUrl.searchParams)
              validatedData.query = await validateInput(query, options.validation.query)
            }

            if (options.validation.params) {
              // Extract params from URL (implement based on your routing)
              const params = {} // Extract from request.nextUrl.pathname
              validatedData.params = await validateInput(params, options.validation.params)
            }
          } catch (error) {
            await monitoring.logSecurityEvent({
              type: 'VALIDATION_ERROR',
              severity: 'low',
              details: {
                error: error instanceof Error ? error.message : 'Unknown validation error',
                path: request.nextUrl.pathname,
                userId: user?.id
              },
              metadata: { requestId }
            })
            
            const response = ResponseFormatter.unprocessableEntity(
              error instanceof Error ? error.message : 'Validation failed',
              {
                details: error instanceof Error ? error.message : 'Validation failed',
                meta: { requestId }
              }
            )
            performanceTracker?.finish(422, user?.id)
            return response
          }
        }

        // Create context
        const context: ApiContext<T> = {
          user,
          validatedData,
          request,
          performanceTracker,
          requestId
        }

        // Execute handler
        const response = await handler(context)

        // Finish performance tracking
        performanceTracker?.finish(response.status, user?.id)

        // Add security headers to response
        if (!options.skipSecurityHeaders) {
          return security.addSecurityHeaders(response)
        }

        return response

      } catch (error) {
        await monitoring.logSecurityEvent({
          type: 'API_ERROR',
          severity: 'high',
          details: {
            error: error instanceof Error ? error.message : 'Unknown error',
            path: request.nextUrl.pathname,
            method: request.method
          },
          metadata: { requestId, stack: error instanceof Error ? error.stack : undefined }
        })

        performanceTracker?.finish(500, errorContext.userId)
        
        return ResponseFormatter.internalServerError(
          process.env.NODE_ENV === 'development' 
            ? (error instanceof Error ? error.message : 'Unknown error')
            : 'Internal server error',
          {
            meta: { requestId }
          }
        )
      }
    }

    return executeHandler()
  }
}