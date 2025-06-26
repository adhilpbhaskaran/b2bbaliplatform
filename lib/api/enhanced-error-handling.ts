import { NextResponse } from 'next/server'
import { ApiError, handleApiError } from '../error-handling'
import { SecurityMonitoring } from '../security/monitoring'
import { ApiSecurity } from './security'

export interface ErrorContext {
  requestId?: string
  userId?: string
  ip?: string
  userAgent?: string
  path?: string
  method?: string
  timestamp?: string
}

export interface ErrorDetails {
  code: string
  message: string
  details?: any
  stack?: string
  context?: ErrorContext
}

export class EnhancedErrorHandler {
  private security = new ApiSecurity()
  private monitoring = new SecurityMonitoring()

  async handleError(error: Error | ApiError, context: ErrorContext = {}): Promise<NextResponse> {
    const errorDetails = this.extractErrorDetails(error, context)
    
    // Log error for monitoring
    await this.logError(errorDetails)
    
    // Determine response based on error type
    if (error instanceof ApiError) {
      return this.handleApiError(error, context)
    }
    
    // Handle specific error types
    if (this.isValidationError(error)) {
      return this.handleValidationError(error, context)
    }
    
    if (this.isAuthenticationError(error)) {
      return this.handleAuthenticationError(error, context)
    }
    
    if (this.isAuthorizationError(error)) {
      return this.handleAuthorizationError(error, context)
    }
    
    if (this.isDatabaseError(error)) {
      return this.handleDatabaseError(error, context)
    }
    
    if (this.isNetworkError(error)) {
      return this.handleNetworkError(error, context)
    }
    
    // Default to internal server error
    return this.handleInternalError(error, context)
  }

  private extractErrorDetails(error: Error | ApiError, context: ErrorContext): ErrorDetails {
    return {
      code: error instanceof ApiError ? error.code : 'INTERNAL_ERROR',
      message: error.message,
      details: error instanceof ApiError ? error.details : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      context: {
        ...context,
        timestamp: new Date().toISOString()
      }
    }
  }

  private async logError(errorDetails: ErrorDetails): Promise<void> {
    const severity = this.determineSeverity(errorDetails.code)
    
    await this.monitoring.logSecurityEvent({
      type: 'API_ERROR',
      severity,
      details: {
        code: errorDetails.code,
        message: errorDetails.message,
        path: errorDetails.context?.path,
        method: errorDetails.context?.method
      },
      metadata: {
        userId: errorDetails.context?.userId,
        ip: errorDetails.context?.ip,
        userAgent: errorDetails.context?.userAgent,
        requestId: errorDetails.context?.requestId,
        stack: errorDetails.stack
      }
    })
  }

  private determineSeverity(errorCode: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalErrors = ['INTERNAL_ERROR', 'DATABASE_CONNECTION_FAILED', 'SECURITY_BREACH']
    const highErrors = ['AUTHENTICATION_FAILED', 'AUTHORIZATION_FAILED', 'DATA_CORRUPTION']
    const mediumErrors = ['VALIDATION_ERROR', 'RATE_LIMIT_EXCEEDED', 'RESOURCE_NOT_FOUND']
    
    if (criticalErrors.includes(errorCode)) return 'critical'
    if (highErrors.includes(errorCode)) return 'high'
    if (mediumErrors.includes(errorCode)) return 'medium'
    return 'low'
  }

  private async handleApiError(error: ApiError, context: ErrorContext): Promise<NextResponse> {
    return this.security.errorResponse(error.code as any, {
      details: error.details,
      requestId: context.requestId,
      timestamp: context.timestamp
    })
  }

  private async handleValidationError(error: Error, context: ErrorContext): Promise<NextResponse> {
    return this.security.errorResponse('VALIDATION_ERROR', {
      message: error.message,
      requestId: context.requestId,
      timestamp: context.timestamp
    })
  }

  private async handleAuthenticationError(error: Error, context: ErrorContext): Promise<NextResponse> {
    // Log potential security threat
    await this.monitoring.logSecurityEvent({
      type: 'AUTHENTICATION_FAILURE',
      severity: 'high',
      details: { message: error.message },
      metadata: context
    })
    
    return this.security.errorResponse('AUTHENTICATION_REQUIRED', {
      requestId: context.requestId,
      timestamp: context.timestamp
    })
  }

  private async handleAuthorizationError(error: Error, context: ErrorContext): Promise<NextResponse> {
    // Log unauthorized access attempt
    await this.monitoring.logSecurityEvent({
      type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      severity: 'high',
      details: { message: error.message },
      metadata: context
    })
    
    return this.security.errorResponse('INSUFFICIENT_PERMISSIONS', {
      requestId: context.requestId,
      timestamp: context.timestamp
    })
  }

  private async handleDatabaseError(error: Error, context: ErrorContext): Promise<NextResponse> {
    // Log database issues for monitoring
    await this.monitoring.logSecurityEvent({
      type: 'DATABASE_ERROR',
      severity: 'critical',
      details: { message: error.message },
      metadata: context
    })
    
    return this.security.errorResponse('DATABASE_ERROR', {
      message: 'Database operation failed',
      requestId: context.requestId,
      timestamp: context.timestamp
    })
  }

  private async handleNetworkError(error: Error, context: ErrorContext): Promise<NextResponse> {
    return this.security.errorResponse('NETWORK_ERROR', {
      message: 'Network operation failed',
      requestId: context.requestId,
      timestamp: context.timestamp
    })
  }

  private async handleInternalError(error: Error, context: ErrorContext): Promise<NextResponse> {
    // Log critical internal errors
    await this.monitoring.logSecurityEvent({
      type: 'INTERNAL_ERROR',
      severity: 'critical',
      details: { message: error.message },
      metadata: {
        ...context,
        stack: error.stack
      }
    })
    
    return this.security.errorResponse('INTERNAL_SERVER_ERROR', {
      message: process.env.NODE_ENV === 'development' ? error.message : 'An internal error occurred',
      requestId: context.requestId,
      timestamp: context.timestamp
    })
  }

  // Error type detection methods
  private isValidationError(error: Error): boolean {
    return error.name === 'ValidationError' || 
           error.message.includes('validation') ||
           error.message.includes('invalid')
  }

  private isAuthenticationError(error: Error): boolean {
    return error.name === 'AuthenticationError' ||
           error.message.includes('authentication') ||
           error.message.includes('unauthorized')
  }

  private isAuthorizationError(error: Error): boolean {
    return error.name === 'AuthorizationError' ||
           error.message.includes('authorization') ||
           error.message.includes('forbidden') ||
           error.message.includes('permission')
  }

  private isDatabaseError(error: Error): boolean {
    return error.name.includes('Prisma') ||
           error.message.includes('database') ||
           error.message.includes('connection') ||
           error.message.includes('query')
  }

  private isNetworkError(error: Error): boolean {
    return error.name === 'NetworkError' ||
           error.message.includes('network') ||
           error.message.includes('timeout') ||
           error.message.includes('fetch')
  }
}

// Global error handler instance
export const errorHandler = new EnhancedErrorHandler()

// Utility function for consistent error handling in API routes
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: ErrorContext = {}
): Promise<T | NextResponse> {
  try {
    return await operation()
  } catch (error) {
    return errorHandler.handleError(error as Error, context)
  }
}

// Decorator for automatic error handling
export function handleErrors(context: ErrorContext = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      try {
        return await method.apply(this, args)
      } catch (error) {
        return errorHandler.handleError(error as Error, context)
      }
    }
  }
}