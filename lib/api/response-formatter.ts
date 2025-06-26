import { NextResponse } from 'next/server'

export interface ApiResponseMeta {
  requestId?: string
  timestamp: string
  version?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface ApiSuccessResponse<T = any> {
  success: true
  data: T
  message?: string
  meta: ApiResponseMeta
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
    field?: string
  }
  meta: ApiResponseMeta
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse

export class ResponseFormatter {
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private static createMeta(options: Partial<ApiResponseMeta> = {}): ApiResponseMeta {
    return {
      requestId: options.requestId || this.generateRequestId(),
      timestamp: new Date().toISOString(),
      version: options.version || '1.0',
      ...options
    }
  }

  static success<T>(
    data: T,
    options: {
      message?: string
      status?: number
      meta?: Partial<ApiResponseMeta>
      headers?: Record<string, string>
    } = {}
  ): NextResponse {
    const response: ApiSuccessResponse<T> = {
      success: true,
      data,
      message: options.message,
      meta: this.createMeta(options.meta)
    }

    return NextResponse.json(response, {
      status: options.status || 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': response.meta.requestId!,
        ...options.headers
      }
    })
  }

  static error(
    code: string,
    message: string,
    options: {
      details?: any
      field?: string
      status?: number
      meta?: Partial<ApiResponseMeta>
      headers?: Record<string, string>
    } = {}
  ): NextResponse {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code,
        message,
        details: options.details,
        field: options.field
      },
      meta: this.createMeta(options.meta)
    }

    return NextResponse.json(response, {
      status: options.status || 400,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': response.meta.requestId!,
        ...options.headers
      }
    })
  }

  static paginated<T>(
    data: T[],
    pagination: {
      page: number
      limit: number
      total: number
    },
    options: {
      message?: string
      status?: number
      meta?: Partial<ApiResponseMeta>
      headers?: Record<string, string>
    } = {}
  ): NextResponse {
    const totalPages = Math.ceil(pagination.total / pagination.limit)
    const hasNext = pagination.page < totalPages
    const hasPrev = pagination.page > 1

    const paginationMeta = {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages,
      hasNext,
      hasPrev
    }

    const response: ApiSuccessResponse<T[]> = {
      success: true,
      data,
      message: options.message,
      meta: {
        ...this.createMeta(options.meta),
        pagination: paginationMeta
      }
    }

    return NextResponse.json(response, {
      status: options.status || 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': response.meta.requestId!,
        'X-Total-Count': pagination.total.toString(),
        'X-Page': pagination.page.toString(),
        'X-Per-Page': pagination.limit.toString(),
        'X-Total-Pages': totalPages.toString(),
        ...options.headers
      }
    })
  }

  static created<T>(
    data: T,
    options: {
      message?: string
      location?: string
      meta?: Partial<ApiResponseMeta>
      headers?: Record<string, string>
    } = {}
  ): NextResponse {
    const headers: Record<string, string> = {
      ...options.headers
    }

    if (options.location) {
      headers.Location = options.location
    }

    return this.success(data, {
      message: options.message || 'Resource created successfully',
      status: 201,
      meta: options.meta,
      headers
    })
  }

  static updated<T>(
    data: T,
    options: {
      message?: string
      meta?: Partial<ApiResponseMeta>
      headers?: Record<string, string>
    } = {}
  ): NextResponse {
    return this.success(data, {
      message: options.message || 'Resource updated successfully',
      status: 200,
      meta: options.meta,
      headers: options.headers
    })
  }

  static deleted(
    options: {
      message?: string
      meta?: Partial<ApiResponseMeta>
      headers?: Record<string, string>
    } = {}
  ): NextResponse {
    return this.success(null, {
      message: options.message || 'Resource deleted successfully',
      status: 204,
      meta: options.meta,
      headers: options.headers
    })
  }

  static noContent(
    options: {
      meta?: Partial<ApiResponseMeta>
      headers?: Record<string, string>
    } = {}
  ): NextResponse {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'X-Request-ID': this.createMeta(options.meta).requestId!,
        ...options.headers
      }
    })
  }

  // Common error responses
  static badRequest(
    message: string = 'Bad request',
    options: {
      details?: any
      field?: string
      meta?: Partial<ApiResponseMeta>
    } = {}
  ): NextResponse {
    return this.error('BAD_REQUEST', message, {
      ...options,
      status: 400
    })
  }

  static unauthorized(
    message: string = 'Authentication required',
    options: {
      details?: any
      meta?: Partial<ApiResponseMeta>
    } = {}
  ): NextResponse {
    return this.error('UNAUTHORIZED', message, {
      ...options,
      status: 401
    })
  }

  static forbidden(
    message: string = 'Insufficient permissions',
    options: {
      details?: any
      meta?: Partial<ApiResponseMeta>
    } = {}
  ): NextResponse {
    return this.error('FORBIDDEN', message, {
      ...options,
      status: 403
    })
  }

  static notFound(
    message: string = 'Resource not found',
    options: {
      details?: any
      meta?: Partial<ApiResponseMeta>
    } = {}
  ): NextResponse {
    return this.error('NOT_FOUND', message, {
      ...options,
      status: 404
    })
  }

  static conflict(
    message: string = 'Resource conflict',
    options: {
      details?: any
      field?: string
      meta?: Partial<ApiResponseMeta>
    } = {}
  ): NextResponse {
    return this.error('CONFLICT', message, {
      ...options,
      status: 409
    })
  }

  static unprocessableEntity(
    message: string = 'Validation failed',
    options: {
      details?: any
      field?: string
      meta?: Partial<ApiResponseMeta>
    } = {}
  ): NextResponse {
    return this.error('VALIDATION_ERROR', message, {
      ...options,
      status: 422
    })
  }

  static tooManyRequests(
    message: string = 'Rate limit exceeded',
    options: {
      retryAfter?: number
      meta?: Partial<ApiResponseMeta>
    } = {}
  ): NextResponse {
    const headers: Record<string, string> = {}
    
    if (options.retryAfter) {
      headers['Retry-After'] = options.retryAfter.toString()
    }

    return this.error('RATE_LIMIT_EXCEEDED', message, {
      status: 429,
      meta: options.meta,
      headers
    })
  }

  static internalServerError(
    message: string = 'Internal server error',
    options: {
      details?: any
      meta?: Partial<ApiResponseMeta>
    } = {}
  ): NextResponse {
    return this.error('INTERNAL_SERVER_ERROR', message, {
      ...options,
      status: 500
    })
  }

  static serviceUnavailable(
    message: string = 'Service temporarily unavailable',
    options: {
      retryAfter?: number
      meta?: Partial<ApiResponseMeta>
    } = {}
  ): NextResponse {
    const headers: Record<string, string> = {}
    
    if (options.retryAfter) {
      headers['Retry-After'] = options.retryAfter.toString()
    }

    return this.error('SERVICE_UNAVAILABLE', message, {
      status: 503,
      meta: options.meta,
      headers
    })
  }
}

// Export convenience methods
export const {
  success,
  error,
  paginated,
  created,
  updated,
  deleted,
  noContent,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessableEntity,
  tooManyRequests,
  internalServerError,
  serviceUnavailable
} = ResponseFormatter