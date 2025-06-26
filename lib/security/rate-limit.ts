import { NextRequest } from 'next/server';
import { LRUCache } from 'lru-cache';

type RateLimitOptions = {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max unique tokens per interval
};

class RateLimiter {
  private cache: LRUCache<string, number[]>;
  private options: RateLimitOptions;
  
  constructor(options: RateLimitOptions) {
    this.options = options;
    this.cache = new LRUCache({
      max: options.uniqueTokenPerInterval,
      ttl: options.interval
    });
  }
  
  check(limit: number, token: string): { success: boolean; remaining: number; reset: Date } {
    const now = Date.now();
    const tokenCount = this.cache.get(token) || [];
    const windowStart = now - this.options.interval;
    
    // Remove old entries
    const validEntries = tokenCount.filter(time => time > windowStart);
    
    if (validEntries.length >= limit) {
      return {
        success: false,
        remaining: 0,
        reset: new Date(validEntries[0] + this.options.interval)
      };
    }
    
    // Add current request
    validEntries.push(now);
    this.cache.set(token, validEntries);
    
    return {
      success: true,
      remaining: limit - validEntries.length,
      reset: new Date(now + this.options.interval)
    };
  }
  
  // Clear rate limit for a specific token
  clear(token: string): void {
    this.cache.delete(token);
  }
  
  // Get current usage for a token
  getUsage(token: string): number {
    const now = Date.now();
    const tokenCount = this.cache.get(token) || [];
    const windowStart = now - this.options.interval;
    
    return tokenCount.filter(time => time > windowStart).length;
  }
}

// Rate limiters for different endpoints
export const apiLimiter = new RateLimiter({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500
});

export const authLimiter = new RateLimiter({
  interval: 15 * 60 * 1000, // 15 minutes
  uniqueTokenPerInterval: 100
});

export const contactLimiter = new RateLimiter({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 50
});

export const paymentLimiter = new RateLimiter({
  interval: 5 * 60 * 1000, // 5 minutes
  uniqueTokenPerInterval: 20
});

export const searchLimiter = new RateLimiter({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 200
});

// Rate limiting middleware
export function withRateLimit(
  limiter: RateLimiter,
  limit: number,
  keyGenerator?: (req: NextRequest) => string
) {
  return (handler: (req: NextRequest) => Promise<Response>) => {
    return async (req: NextRequest) => {
      const key = keyGenerator ? keyGenerator(req) : getClientIP(req);
      const result = limiter.check(limit, key);
      
      if (!result.success) {
        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            retryAfter: result.reset.toISOString()
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil((result.reset.getTime() - Date.now()) / 1000).toString(),
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': result.remaining.toString(),
              'X-RateLimit-Reset': result.reset.toISOString()
            }
          }
        );
      }
      
      const response = await handler(req);
      
      // Add rate limit headers to successful responses
      response.headers.set('X-RateLimit-Limit', limit.toString());
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', result.reset.toISOString());
      
      return response;
    };
  };
}

// Adaptive rate limiting based on user type
export function withAdaptiveRateLimit(
  baseLimiter: RateLimiter,
  limits: {
    anonymous: number;
    authenticated: number;
    premium: number;
    admin: number;
  }
) {
  return (handler: (req: NextRequest) => Promise<Response>) => {
    return async (req: NextRequest) => {
      // Determine user type from request
      const userType = await getUserType(req);
      const limit = limits[userType] || limits.anonymous;
      
      const key = getClientIP(req);
      const result = baseLimiter.check(limit, key);
      
      if (!result.success) {
        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            retryAfter: result.reset.toISOString(),
            userType
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil((result.reset.getTime() - Date.now()) / 1000).toString(),
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': result.remaining.toString(),
              'X-RateLimit-Reset': result.reset.toISOString()
            }
          }
        );
      }
      
      const response = await handler(req);
      
      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', limit.toString());
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', result.reset.toISOString());
      response.headers.set('X-RateLimit-User-Type', userType);
      
      return response;
    };
  };
}

// Get client IP address
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return req.ip || 'unknown';
}

// Determine user type for adaptive rate limiting
async function getUserType(req: NextRequest): Promise<'anonymous' | 'authenticated' | 'premium' | 'admin'> {
  try {
    // Check for authentication token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return 'anonymous';
    }
    
    // This would typically involve validating the token and checking user role
    // For now, we'll return a basic implementation
    return 'authenticated';
  } catch (error) {
    return 'anonymous';
  }
}

// Rate limit bypass for trusted IPs
const trustedIPs = new Set([
  '127.0.0.1',
  '::1',
  // Add your trusted IPs here
]);

export function isTrustedIP(ip: string): boolean {
  return trustedIPs.has(ip);
}

// Rate limit with IP whitelist
export function withRateLimitAndWhitelist(
  limiter: RateLimiter,
  limit: number,
  keyGenerator?: (req: NextRequest) => string
) {
  return (handler: (req: NextRequest) => Promise<Response>) => {
    return async (req: NextRequest) => {
      const ip = getClientIP(req);
      
      // Skip rate limiting for trusted IPs
      if (isTrustedIP(ip)) {
        return handler(req);
      }
      
      const key = keyGenerator ? keyGenerator(req) : ip;
      const result = limiter.check(limit, key);
      
      if (!result.success) {
        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            retryAfter: result.reset.toISOString()
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil((result.reset.getTime() - Date.now()) / 1000).toString(),
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': result.remaining.toString(),
              'X-RateLimit-Reset': result.reset.toISOString()
            }
          }
        );
      }
      
      const response = await handler(req);
      
      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', limit.toString());
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', result.reset.toISOString());
      
      return response;
    };
  };
}

// Sliding window rate limiter for more precise control
export class SlidingWindowRateLimiter {
  private windows: Map<string, { count: number; window: number }> = new Map();
  private windowSize: number;
  private maxRequests: number;
  
  constructor(windowSizeMs: number, maxRequests: number) {
    this.windowSize = windowSizeMs;
    this.maxRequests = maxRequests;
  }
  
  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = Math.floor(now / this.windowSize);
    
    const current = this.windows.get(key);
    
    if (!current || current.window < windowStart) {
      this.windows.set(key, { count: 1, window: windowStart });
      return true;
    }
    
    if (current.count >= this.maxRequests) {
      return false;
    }
    
    current.count++;
    return true;
  }
  
  getRemainingRequests(key: string): number {
    const current = this.windows.get(key);
    if (!current) {
      return this.maxRequests;
    }
    
    return Math.max(0, this.maxRequests - current.count);
  }
  
  reset(key: string): void {
    this.windows.delete(key);
  }
  
  cleanup(): void {
    const now = Date.now();
    const currentWindow = Math.floor(now / this.windowSize);
    
    for (const [key, value] of this.windows.entries()) {
      if (value.window < currentWindow) {
        this.windows.delete(key);
      }
    }
  }
}

// Export rate limiting presets
export const rateLimitPresets = {
  // Very strict for sensitive operations
  strict: {
    interval: 60 * 1000, // 1 minute
    limit: 5
  },
  
  // Moderate for API endpoints
  moderate: {
    interval: 60 * 1000, // 1 minute
    limit: 30
  },
  
  // Lenient for public endpoints
  lenient: {
    interval: 60 * 1000, // 1 minute
    limit: 100
  },
  
  // For authentication endpoints
  auth: {
    interval: 15 * 60 * 1000, // 15 minutes
    limit: 5
  },
  
  // For contact forms
  contact: {
    interval: 60 * 60 * 1000, // 1 hour
    limit: 3
  }
};