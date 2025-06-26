import { apiLimiter, authLimiter, contactLimiter, paymentLimiter, searchLimiter } from './security/rate-limit'
import { NextRequest } from 'next/server'

// Rate limit function that matches the expected interface
export async function rateLimit(
  req: NextRequest,
  options: {
    type?: 'api' | 'auth' | 'contact' | 'payment' | 'search'
    limit?: number
    identifier?: string
  } = {}
): Promise<{ success: boolean; remaining?: number; reset?: Date }> {
  const { type = 'api', limit = 60, identifier } = options
  
  // Get the appropriate limiter
  let limiter
  let defaultLimit
  
  switch (type) {
    case 'auth':
      limiter = authLimiter
      defaultLimit = 5
      break
    case 'contact':
      limiter = contactLimiter
      defaultLimit = 3
      break
    case 'payment':
      limiter = paymentLimiter
      defaultLimit = 10
      break
    case 'search':
      limiter = searchLimiter
      defaultLimit = 100
      break
    default:
      limiter = apiLimiter
      defaultLimit = 60
  }
  
  // Generate identifier from request if not provided
  const key = identifier || getClientIP(req)
  
  // Check rate limit
  const result = limiter.check(limit || defaultLimit, key)
  
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset
  }
}

// Helper function to get client IP
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIP = req.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  return req.ip || 'unknown'
}

// Export rate limiters for direct use
export {
  apiLimiter,
  authLimiter,
  contactLimiter,
  paymentLimiter,
  searchLimiter
} from './security/rate-limit'