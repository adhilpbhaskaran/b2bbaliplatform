import { toast } from '@/hooks/use-toast'
import { AppError } from '@/types'

// Custom error classes
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network connection failed') {
    super(message)
    this.name = 'NetworkError'
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public errors?: Record<string, string[]>
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

// Error handling utilities
export const handleApiError = (error: unknown): AppError => {
  console.error('API Error:', error)

  if (error instanceof ApiError) {
    return {
      message: error.message,
      code: error.code || 'API_ERROR',
      statusCode: error.statusCode
    }
  }

  if (error instanceof NetworkError) {
    return {
      message: 'Network connection failed. Please check your internet connection.',
      code: 'NETWORK_ERROR',
      statusCode: 0
    }
  }

  if (error instanceof ValidationError) {
    return {
      message: error.message,
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      field: error.field,
      errors: error.errors
    }
  }

  if (error instanceof AuthenticationError) {
    return {
      message: error.message,
      code: 'AUTHENTICATION_ERROR',
      statusCode: 401
    }
  }

  if (error instanceof AuthorizationError) {
    return {
      message: error.message,
      code: 'AUTHORIZATION_ERROR',
      statusCode: 403
    }
  }

  // Handle fetch errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      message: 'Network connection failed. Please check your internet connection.',
      code: 'NETWORK_ERROR',
      statusCode: 0
    }
  }

  // Generic error fallback
  return {
    message: error instanceof Error ? error.message : 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    statusCode: 500
  }
}

// Toast error notifications
export const showErrorToast = (error: AppError | string) => {
  const message = typeof error === 'string' ? error : error.message
  const title = typeof error === 'string' ? 'Error' : getErrorTitle(error.code)
  
  toast({
    title,
    description: message,
    variant: 'destructive'
  })
}

export const showSuccessToast = (message: string, title: string = 'Success') => {
  toast({
    title,
    description: message,
    variant: 'default'
  })
}

// Get user-friendly error titles
const getErrorTitle = (code: string): string => {
  const titles: Record<string, string> = {
    'API_ERROR': 'Server Error',
    'NETWORK_ERROR': 'Connection Error',
    'VALIDATION_ERROR': 'Validation Error',
    'AUTHENTICATION_ERROR': 'Authentication Required',
    'AUTHORIZATION_ERROR': 'Access Denied',
    'NOT_FOUND': 'Not Found',
    'RATE_LIMIT': 'Too Many Requests',
    'UNKNOWN_ERROR': 'Unexpected Error'
  }
  
  return titles[code] || 'Error'
}

// Retry mechanism for failed requests
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // Don't retry on certain errors
      if (
        error instanceof ValidationError ||
        error instanceof AuthenticationError ||
        error instanceof AuthorizationError ||
        (error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500)
      ) {
        throw error
      }
      
      if (attempt === maxRetries) {
        throw lastError
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)))
    }
  }
  
  throw lastError!
}

// Error logging (placeholder for production logging service)
export const logError = (error: Error, context?: Record<string, any>) => {
  if (process.env.NODE_ENV === 'development') {
    console.group('🚨 Error Log')
    console.error('Error:', error)
    console.error('Stack:', error.stack)
    if (context) {
      console.error('Context:', context)
    }
    console.groupEnd()
  } else {
    // In production, send to logging service (Sentry, LogRocket, etc.)
    // Example: Sentry.captureException(error, { extra: context })
    console.error('Error:', error.message, context)
  }
}

// Global error handler for unhandled promise rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    logError(new Error(event.reason), { type: 'unhandledrejection' })
    event.preventDefault()
  })
}

// Error boundary helpers
export const getErrorInfo = (error: Error, errorInfo?: { componentStack: string }) => {
  return {
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo?.componentStack,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    url: typeof window !== 'undefined' ? window.location.href : 'server'
  }
}

// Form error handling
export const handleFormError = (error: unknown, setError?: (field: string, error: { message: string }) => void) => {
  const appError = handleApiError(error)
  
  if (appError.errors && setError) {
    // Handle field-specific validation errors
    Object.entries(appError.errors).forEach(([field, messages]) => {
      setError(field, { message: messages[0] })
    })
  } else {
    // Show general error toast
    showErrorToast(appError)
  }
  
  return appError
}