import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { rateLimit } from '@/lib/security/rate-limit';
import { validateInput } from '@/lib/security/validation';
import { logSecurityEvent } from '@/lib/security/monitoring';
import { SecurityConfig } from '@/lib/security';
import { z } from 'zod';

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

// API error codes
export const API_ERROR_CODES = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Authorization errors
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // Validation errors
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  
  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  
  // Business logic errors
  BOOKING_CONFLICT: 'BOOKING_CONFLICT',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED'
} as const;

// API security middleware
export class ApiSecurity {
  // Create standardized API response
  static createResponse<T>(
    success: boolean,
    data?: T,
    error?: {
      code: string;
      message: string;
      details?: any;
    },
    status: number = 200
  ): NextResponse<ApiResponse<T>> {
    const response: ApiResponse<T> = {
      success,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    };
    
    if (success && data !== undefined) {
      response.data = data;
    }
    
    if (!success && error) {
      response.error = error;
    }
    
    return NextResponse.json(response, { status });
  }
  
  // Create error response
  static createErrorResponse(
    code: string,
    message: string,
    status: number = 400,
    details?: any
  ): NextResponse<ApiResponse> {
    return this.createResponse(
      false,
      undefined,
      { code, message, details },
      status
    );
  }
  
  // Get client IP address
  static getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');
    
    if (cfConnectingIP) return cfConnectingIP;
    if (realIP) return realIP;
    if (forwarded) return forwarded.split(',')[0].trim();
    
    return 'unknown';
  }
  
  // Get user agent
  static getUserAgent(request: NextRequest): string {
    return request.headers.get('user-agent') || 'unknown';
  }
  
  // Check for suspicious activity
  static async checkSuspiciousActivity(
    request: NextRequest
  ): Promise<{ suspicious: boolean; reason?: string }> {
    const userAgent = this.getUserAgent(request);
    const url = request.url;
    
    // Check for suspicious user agents
    if (SecurityConfig.hasSuspiciousUserAgent(userAgent)) {
      return { suspicious: true, reason: 'suspicious_user_agent' };
    }
    
    // Check for suspicious patterns in URL
    if (SecurityConfig.hasSuspiciousPatterns(url)) {
      return { suspicious: true, reason: 'suspicious_url_pattern' };
    }
    
    // Check request body for suspicious patterns
    try {
      const body = await request.clone().text();
      if (body && SecurityConfig.hasSuspiciousPatterns(body)) {
        return { suspicious: true, reason: 'suspicious_request_body' };
      }
    } catch {
      // Ignore errors when reading body
    }
    
    return { suspicious: false };
  }
}

// Higher-order function for API route protection
export function withApiSecurity(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  options: {
    requireAuth?: boolean;
    requiredRole?: string;
    requiredPermissions?: string[];
    rateLimit?: {
      windowMs: number;
      max: number;
    };
    validateInput?: z.ZodSchema;
    allowedMethods?: string[];
  } = {}
) {
  return async function securedHandler(
    request: NextRequest,
    context?: any
  ): Promise<NextResponse> {
    const startTime = Date.now();
    const clientIP = ApiSecurity.getClientIP(request);
    const userAgent = ApiSecurity.getUserAgent(request);
    const method = request.method;
    const pathname = new URL(request.url).pathname;
    
    try {
      // Check allowed methods
      if (options.allowedMethods && !options.allowedMethods.includes(method)) {
        await logSecurityEvent({
          eventType: 'api_abuse',
          severity: 'medium',
          resource: pathname,
          action: 'method_not_allowed',
          ipAddress: clientIP,
          userAgent,
          metadata: {
            method,
            allowedMethods: options.allowedMethods
          }
        });
        
        return ApiSecurity.createErrorResponse(
          'METHOD_NOT_ALLOWED',
          `Method ${method} not allowed`,
          405
        );
      }
      
      // Check for suspicious activity
      const suspiciousCheck = await ApiSecurity.checkSuspiciousActivity(request);
      if (suspiciousCheck.suspicious) {
        await logSecurityEvent({
          eventType: 'suspicious_activity',
          severity: 'high',
          resource: pathname,
          action: 'blocked_suspicious_request',
          ipAddress: clientIP,
          userAgent,
          metadata: {
            reason: suspiciousCheck.reason,
            method
          }
        });
        
        return ApiSecurity.createErrorResponse(
          'SUSPICIOUS_ACTIVITY',
          'Request blocked due to suspicious activity',
          403
        );
      }
      
      // Apply rate limiting
      if (options.rateLimit) {
        const rateLimitResult = await rateLimit(
          `api:${pathname}:${clientIP}`,
          options.rateLimit.max,
          options.rateLimit.windowMs
        );
        
        if (!rateLimitResult.success) {
          await logSecurityEvent({
            eventType: 'api_abuse',
            severity: 'medium',
            resource: pathname,
            action: 'rate_limit_exceeded',
            ipAddress: clientIP,
            userAgent,
            metadata: {
              limit: options.rateLimit.max,
              windowMs: options.rateLimit.windowMs,
              remaining: rateLimitResult.remaining
            }
          });
          
          return ApiSecurity.createErrorResponse(
            API_ERROR_CODES.RATE_LIMIT_EXCEEDED,
            'Rate limit exceeded',
            429
          );
        }
      }
      
      let userId: string | null = null;
      
      // Check authentication if required
      if (options.requireAuth) {
        const { userId: authUserId } = auth();
        
        if (!authUserId) {
          await logSecurityEvent({
            eventType: 'authentication',
            severity: 'medium',
            resource: pathname,
            action: 'unauthorized_access_attempt',
            ipAddress: clientIP,
            userAgent,
            metadata: { method }
          });
          
          return ApiSecurity.createErrorResponse(
            API_ERROR_CODES.UNAUTHORIZED,
            'Authentication required',
            401
          );
        }
        
        userId = authUserId;
      }
      
      // Check role and permissions if required
      if (options.requiredRole || options.requiredPermissions) {
        if (!userId) {
          return ApiSecurity.createErrorResponse(
            API_ERROR_CODES.UNAUTHORIZED,
            'Authentication required for role/permission check',
            401
          );
        }
        
        // Import here to avoid circular dependencies
        const { getCurrentUser, hasRole, hasPermissions } = await import('@/lib/auth/security');
        
        const user = await getCurrentUser();
        if (!user) {
          return ApiSecurity.createErrorResponse(
            API_ERROR_CODES.UNAUTHORIZED,
            'User not found',
            401
          );
        }
        
        // Check required role
        if (options.requiredRole && !await hasRole(options.requiredRole)) {
          await logSecurityEvent({
            userId,
            eventType: 'authorization',
            severity: 'medium',
            resource: pathname,
            action: 'insufficient_role',
            ipAddress: clientIP,
            userAgent,
            metadata: {
              requiredRole: options.requiredRole,
              userRole: user.role?.name
            }
          });
          
          return ApiSecurity.createErrorResponse(
            API_ERROR_CODES.FORBIDDEN,
            'Insufficient role permissions',
            403
          );
        }
        
        // Check required permissions
        if (options.requiredPermissions && !await hasPermissions(options.requiredPermissions)) {
          await logSecurityEvent({
            userId,
            eventType: 'authorization',
            severity: 'medium',
            resource: pathname,
            action: 'insufficient_permissions',
            ipAddress: clientIP,
            userAgent,
            metadata: {
              requiredPermissions: options.requiredPermissions,
              userPermissions: user.role?.permissions?.map(p => p.name) || []
            }
          });
          
          return ApiSecurity.createErrorResponse(
            API_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
            'Insufficient permissions',
            403
          );
        }
      }
      
      // Validate input if schema provided
      if (options.validateInput && ['POST', 'PUT', 'PATCH'].includes(method)) {
        try {
          const body = await request.clone().json();
          const validationResult = options.validateInput.safeParse(body);
          
          if (!validationResult.success) {
            await logSecurityEvent({
              userId,
              eventType: 'data_access',
              severity: 'low',
              resource: pathname,
              action: 'input_validation_failed',
              ipAddress: clientIP,
              userAgent,
              metadata: {
                validationErrors: validationResult.error.errors
              }
            });
            
            return ApiSecurity.createErrorResponse(
              API_ERROR_CODES.INVALID_INPUT,
              'Invalid input data',
              400,
              validationResult.error.errors
            );
          }
        } catch (error) {
          return ApiSecurity.createErrorResponse(
            API_ERROR_CODES.INVALID_FORMAT,
            'Invalid JSON format',
            400
          );
        }
      }
      
      // Log successful API access
      await logSecurityEvent({
        userId,
        eventType: 'data_access',
        severity: 'low',
        resource: pathname,
        action: 'api_access',
        ipAddress: clientIP,
        userAgent,
        metadata: {
          method,
          responseTime: Date.now() - startTime
        }
      });
      
      // Call the actual handler
      return await handler(request, context);
      
    } catch (error) {
      // Log the error
      await logSecurityEvent({
        userId,
        eventType: 'system_error',
        severity: 'high',
        resource: pathname,
        action: 'api_error',
        ipAddress: clientIP,
        userAgent,
        metadata: {
          error: error.message,
          method,
          responseTime: Date.now() - startTime
        }
      });
      
      console.error('API route error:', error);
      
      return ApiSecurity.createErrorResponse(
        API_ERROR_CODES.INTERNAL_ERROR,
        'Internal server error',
        500
      );
    }
  };
}

// Specific security wrappers for common use cases
export const withAuth = (handler: any) => 
  withApiSecurity(handler, { requireAuth: true });

export const withAdminAuth = (handler: any) => 
  withApiSecurity(handler, { 
    requireAuth: true, 
    requiredRole: 'admin' 
  });

export const withStaffAuth = (handler: any) => 
  withApiSecurity(handler, { 
    requireAuth: true, 
    requiredRole: 'staff' 
  });

export const withRateLimit = (handler: any, max: number = 100, windowMs: number = 15 * 60 * 1000) => 
  withApiSecurity(handler, { 
    rateLimit: { max, windowMs } 
  });

export const withValidation = (handler: any, schema: z.ZodSchema) => 
  withApiSecurity(handler, { validateInput: schema });

// CORS helper
export function withCORS(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  options: {
    origins?: string[];
    methods?: string[];
    headers?: string[];
    credentials?: boolean;
  } = {}
) {
  return async function corsHandler(
    request: NextRequest,
    context?: any
  ): Promise<NextResponse> {
    const origin = request.headers.get('origin');
    const allowedOrigins = options.origins || ['http://localhost:3000'];
    const allowedMethods = options.methods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
    const allowedHeaders = options.headers || ['Content-Type', 'Authorization'];
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 });
      
      if (origin && allowedOrigins.includes(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin);
      }
      
      response.headers.set('Access-Control-Allow-Methods', allowedMethods.join(', '));
      response.headers.set('Access-Control-Allow-Headers', allowedHeaders.join(', '));
      
      if (options.credentials) {
        response.headers.set('Access-Control-Allow-Credentials', 'true');
      }
      
      return response;
    }
    
    // Handle actual requests
    const response = await handler(request, context);
    
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    
    if (options.credentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    
    return response;
  };
}

// Export all utilities
export const apiSecurity = {
  ApiSecurity,
  withApiSecurity,
  withAuth,
  withAdminAuth,
  withStaffAuth,
  withRateLimit,
  withValidation,
  withCORS,
  API_ERROR_CODES
};