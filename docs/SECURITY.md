# Security Guide

This guide outlines security practices, configurations, and best practices for the Bali DMC project.

## 🔐 Security Overview

### Security Principles

1. **Defense in Depth**: Multiple layers of security
2. **Least Privilege**: Minimal access rights
3. **Zero Trust**: Verify everything, trust nothing
4. **Security by Design**: Built-in from the start
5. **Regular Updates**: Keep dependencies current
6. **Monitoring**: Continuous security monitoring

### Threat Model

#### Assets to Protect
- User personal data (PII)
- Payment information
- Booking details
- Business data
- Authentication credentials
- API keys and secrets

#### Potential Threats
- SQL Injection
- Cross-Site Scripting (XSS)
- Cross-Site Request Forgery (CSRF)
- Authentication bypass
- Data breaches
- DDoS attacks
- Man-in-the-middle attacks

## 🛡️ Authentication & Authorization

### Clerk Integration

#### Configuration

```typescript
// middleware.ts
import { authMiddleware } from '@clerk/nextjs'

export default authMiddleware({
  // Public routes that don't require authentication
  publicRoutes: [
    '/',
    '/packages',
    '/packages/(.*)',
    '/about',
    '/contact',
    '/api/contact',
    '/api/newsletter',
    '/api/webhooks/(.*)',
    '/sign-in(.*)',
    '/sign-up(.*)'
  ],
  
  // Routes that require authentication
  protectedRoutes: [
    '/dashboard(.*)',
    '/bookings(.*)',
    '/profile(.*)',
    '/api/bookings(.*)',
    '/api/user(.*)'
  ],
  
  // Ignore API routes that handle their own auth
  ignoredRoutes: [
    '/api/webhooks/stripe',
    '/api/webhooks/clerk'
  ],
  
  // Custom redirect for unauthenticated users
  afterAuth(auth, req) {
    // Handle users who aren't authenticated
    if (!auth.userId && !auth.isPublicRoute) {
      return redirectToSignIn({ returnBackUrl: req.url })
    }
    
    // Handle users who are authenticated but accessing sign-in/sign-up
    if (auth.userId && (req.nextUrl.pathname === '/sign-in' || req.nextUrl.pathname === '/sign-up')) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    
    return NextResponse.next()
  }
})

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}
```

#### Role-Based Access Control

```typescript
// lib/auth.ts
import { auth } from '@clerk/nextjs'
import { redirect } from 'next/navigation'

export type UserRole = 'admin' | 'staff' | 'customer'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  permissions: string[]
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { userId } = auth()
  
  if (!userId) {
    return null
  }
  
  // Get user from database with role and permissions
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      role: {
        include: {
          permissions: true
        }
      }
    }
  })
  
  if (!user) {
    return null
  }
  
  return {
    id: user.id,
    email: user.email,
    role: user.role.name as UserRole,
    permissions: user.role.permissions.map(p => p.name)
  }
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/sign-in')
  }
  
  return user
}

export async function requireRole(role: UserRole): Promise<AuthUser> {
  const user = await requireAuth()
  
  if (user.role !== role) {
    throw new Error('Insufficient permissions')
  }
  
  return user
}

export async function requirePermission(permission: string): Promise<AuthUser> {
  const user = await requireAuth()
  
  if (!user.permissions.includes(permission)) {
    throw new Error('Insufficient permissions')
  }
  
  return user
}

// Higher-order component for protecting pages
export function withAuth<T extends object>(
  Component: React.ComponentType<T>,
  requiredRole?: UserRole
) {
  return function AuthenticatedComponent(props: T) {
    const { isLoaded, isSignedIn } = useAuth()
    const { user } = useUser()
    
    if (!isLoaded) {
      return <div>Loading...</div>
    }
    
    if (!isSignedIn) {
      return <RedirectToSignIn />
    }
    
    if (requiredRole && user?.publicMetadata?.role !== requiredRole) {
      return <div>Access denied</div>
    }
    
    return <Component {...props} />
  }
}
```

#### API Route Protection

```typescript
// lib/api-auth.ts
import { auth } from '@clerk/nextjs'
import { NextRequest, NextResponse } from 'next/server'

export async function withApiAuth(
  handler: (req: NextRequest, user: AuthUser) => Promise<NextResponse>,
  options: {
    requiredRole?: UserRole
    requiredPermission?: string
  } = {}
) {
  return async (req: NextRequest) => {
    try {
      const { userId } = auth()
      
      if (!userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
      
      const user = await getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
      
      // Check role requirement
      if (options.requiredRole && user.role !== options.requiredRole) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }
      
      // Check permission requirement
      if (options.requiredPermission && !user.permissions.includes(options.requiredPermission)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }
      
      return await handler(req, user)
    } catch (error) {
      console.error('API Auth Error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

// Usage example
export const POST = withApiAuth(
  async (req: NextRequest, user: AuthUser) => {
    // Handler logic here
    return NextResponse.json({ success: true })
  },
  { requiredPermission: 'manage_bookings' }
)
```

## 🔒 Data Protection

### Input Validation & Sanitization

```typescript
// lib/validation.ts
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'
import validator from 'validator'

// Sanitize HTML input
export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  })
}

// Sanitize and validate email
export function sanitizeEmail(email: string): string {
  const sanitized = validator.normalizeEmail(email.trim().toLowerCase()) || ''
  if (!validator.isEmail(sanitized)) {
    throw new Error('Invalid email format')
  }
  return sanitized
}

// Sanitize phone number
export function sanitizePhone(phone: string): string {
  const cleaned = phone.replace(/[^+\d]/g, '')
  if (!validator.isMobilePhone(cleaned)) {
    throw new Error('Invalid phone number')
  }
  return cleaned
}

// SQL injection prevention (Prisma handles this automatically)
export const safeUserQuery = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  phone: z.string().optional()
})

// XSS prevention for user-generated content
export function sanitizeUserContent(content: string): string {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
    ALLOWED_ATTR: [],
    FORBID_SCRIPTS: true,
    FORBID_TAGS: ['script', 'object', 'embed', 'link', 'style'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
  })
}

// Rate limiting validation
export function validateRateLimit(ip: string, endpoint: string): boolean {
  // Implement rate limiting logic
  // This could use Redis or in-memory store
  return true
}
```

### Database Security

```typescript
// lib/db-security.ts
import { PrismaClient } from '@prisma/client'

// Secure Prisma client configuration
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

// Row-level security helper
export async function getUserBookings(userId: string) {
  return prisma.booking.findMany({
    where: {
      userId: userId, // Ensure user can only access their own bookings
      deletedAt: null // Soft delete check
    },
    select: {
      id: true,
      packageId: true,
      status: true,
      startDate: true,
      endDate: true,
      totalPrice: true,
      // Exclude sensitive fields like payment details
    }
  })
}

// Audit logging
export async function logUserAction(
  userId: string,
  action: string,
  resource: string,
  metadata?: Record<string, any>
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      resource,
      metadata,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      timestamp: new Date()
    }
  })
}

// Data anonymization for GDPR compliance
export async function anonymizeUserData(userId: string) {
  const anonymizedEmail = `deleted-${Date.now()}@example.com`
  const anonymizedName = 'Deleted User'
  
  await prisma.user.update({
    where: { id: userId },
    data: {
      email: anonymizedEmail,
      firstName: anonymizedName,
      lastName: '',
      phone: null,
      deletedAt: new Date()
    }
  })
  
  // Log the anonymization
  await logUserAction(userId, 'ANONYMIZE', 'user', {
    reason: 'GDPR_REQUEST'
  })
}
```

### Encryption & Hashing

```typescript
// lib/crypto.ts
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32)
const IV_LENGTH = 16

// Encrypt sensitive data
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

// Decrypt sensitive data
export function decrypt(encryptedText: string): string {
  const [ivHex, encrypted] = encryptedText.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

// Hash passwords (though Clerk handles this)
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Generate secure random tokens
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

// Hash API keys for storage
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex')
}

// Generate API key
export function generateApiKey(): { key: string; hash: string } {
  const key = `bali_${generateSecureToken(32)}`
  const hash = hashApiKey(key)
  return { key, hash }
}
```

## 🌐 Network Security

### HTTPS & Security Headers

```typescript
// middleware.ts (security headers)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  // HSTS (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://checkout.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.stripe.com https://api.clerk.dev https://*.clerk.accounts.dev",
    "frame-src https://js.stripe.com https://checkout.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join('; ')
  
  response.headers.set('Content-Security-Policy', csp)
  
  return response
}
```

### Rate Limiting

```typescript
// lib/rate-limit.ts
import { NextRequest } from 'next/server'
import { LRUCache } from 'lru-cache'

type RateLimitOptions = {
  interval: number // Time window in milliseconds
  uniqueTokenPerInterval: number // Max unique tokens per interval
}

class RateLimiter {
  private cache: LRUCache<string, number[]>
  private options: RateLimitOptions
  
  constructor(options: RateLimitOptions) {
    this.options = options
    this.cache = new LRUCache({
      max: options.uniqueTokenPerInterval,
      ttl: options.interval
    })
  }
  
  check(limit: number, token: string): { success: boolean; remaining: number; reset: Date } {
    const now = Date.now()
    const tokenCount = this.cache.get(token) || []
    const windowStart = now - this.options.interval
    
    // Remove old entries
    const validEntries = tokenCount.filter(time => time > windowStart)
    
    if (validEntries.length >= limit) {
      return {
        success: false,
        remaining: 0,
        reset: new Date(validEntries[0] + this.options.interval)
      }
    }
    
    // Add current request
    validEntries.push(now)
    this.cache.set(token, validEntries)
    
    return {
      success: true,
      remaining: limit - validEntries.length,
      reset: new Date(now + this.options.interval)
    }
  }
}

// Rate limiters for different endpoints
export const apiLimiter = new RateLimiter({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500
})

export const authLimiter = new RateLimiter({
  interval: 15 * 60 * 1000, // 15 minutes
  uniqueTokenPerInterval: 100
})

export const contactLimiter = new RateLimiter({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 50
})

// Rate limiting middleware
export function withRateLimit(
  limiter: RateLimiter,
  limit: number,
  keyGenerator?: (req: NextRequest) => string
) {
  return (handler: (req: NextRequest) => Promise<Response>) => {
    return async (req: NextRequest) => {
      const key = keyGenerator ? keyGenerator(req) : getClientIP(req)
      const result = limiter.check(limit, key)
      
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
        )
      }
      
      const response = await handler(req)
      
      // Add rate limit headers to successful responses
      response.headers.set('X-RateLimit-Limit', limit.toString())
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
      response.headers.set('X-RateLimit-Reset', result.reset.toISOString())
      
      return response
    }
  }
}

// Get client IP address
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
```

## 💳 Payment Security

### Stripe Integration Security

```typescript
// lib/stripe-security.ts
import Stripe from 'stripe'
import { headers } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true
})

// Verify webhook signature
export function verifyStripeWebhook(body: string, signature: string): Stripe.Event {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!
  
  try {
    return stripe.webhooks.constructEvent(body, signature, endpointSecret)
  } catch (error) {
    throw new Error(`Webhook signature verification failed: ${error.message}`)
  }
}

// Create secure payment intent
export async function createSecurePaymentIntent(
  amount: number,
  currency: string,
  customerId: string,
  metadata: Record<string, string>
): Promise<Stripe.PaymentIntent> {
  // Validate amount (prevent negative amounts)
  if (amount <= 0) {
    throw new Error('Invalid amount')
  }
  
  // Validate currency
  const allowedCurrencies = ['usd', 'idr', 'eur', 'gbp']
  if (!allowedCurrencies.includes(currency.toLowerCase())) {
    throw new Error('Unsupported currency')
  }
  
  return stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: currency.toLowerCase(),
    customer: customerId,
    metadata: {
      ...metadata,
      created_by: 'balidmc_system',
      timestamp: new Date().toISOString()
    },
    automatic_payment_methods: {
      enabled: true
    },
    capture_method: 'automatic',
    confirmation_method: 'automatic'
  })
}

// Secure refund processing
export async function processSecureRefund(
  paymentIntentId: string,
  amount?: number,
  reason?: string
): Promise<Stripe.Refund> {
  // Verify payment intent exists and is refundable
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
  
  if (paymentIntent.status !== 'succeeded') {
    throw new Error('Payment intent is not refundable')
  }
  
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amount ? Math.round(amount * 100) : undefined,
    reason: reason as Stripe.RefundCreateParams.Reason,
    metadata: {
      processed_by: 'balidmc_system',
      timestamp: new Date().toISOString()
    }
  })
}

// PCI compliance helpers
export function sanitizePaymentData(data: any): any {
  const sensitiveFields = [
    'card_number',
    'cvc',
    'cvv',
    'expiry',
    'exp_month',
    'exp_year',
    'ssn',
    'bank_account'
  ]
  
  const sanitized = { ...data }
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      delete sanitized[field]
    }
  })
  
  return sanitized
}
```

## 🔍 Security Monitoring

### Logging & Monitoring

```typescript
// lib/security-monitoring.ts
import { NextRequest } from 'next/server'

export interface SecurityEvent {
  type: 'auth_failure' | 'rate_limit' | 'suspicious_activity' | 'data_breach' | 'xss_attempt'
  severity: 'low' | 'medium' | 'high' | 'critical'
  userId?: string
  ipAddress: string
  userAgent: string
  endpoint: string
  details: Record<string, any>
  timestamp: Date
}

class SecurityMonitor {
  private events: SecurityEvent[] = []
  
  logEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date()
    }
    
    this.events.push(securityEvent)
    
    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToSecurityService(securityEvent)
    } else {
      console.warn('Security Event:', securityEvent)
    }
    
    // Trigger alerts for critical events
    if (event.severity === 'critical') {
      this.triggerAlert(securityEvent)
    }
  }
  
  private async sendToSecurityService(event: SecurityEvent): Promise<void> {
    try {
      // Send to security monitoring service (e.g., Sentry, DataDog)
      await fetch(process.env.SECURITY_WEBHOOK_URL!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SECURITY_API_KEY}`
        },
        body: JSON.stringify(event)
      })
    } catch (error) {
      console.error('Failed to send security event:', error)
    }
  }
  
  private async triggerAlert(event: SecurityEvent): Promise<void> {
    // Send immediate alert for critical security events
    console.error('CRITICAL SECURITY EVENT:', event)
    
    // In production, send to alerting system
    if (process.env.NODE_ENV === 'production') {
      // Send email, Slack notification, etc.
    }
  }
  
  detectSuspiciousActivity(req: NextRequest, userId?: string): boolean {
    const ipAddress = getClientIP(req)
    const userAgent = req.headers.get('user-agent') || ''
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /bot|crawler|spider/i,
      /sqlmap|nikto|nmap/i,
      /<script|javascript:|vbscript:/i,
      /union.*select|drop.*table|insert.*into/i
    ]
    
    const isSuspicious = suspiciousPatterns.some(pattern => 
      pattern.test(userAgent) || pattern.test(req.url)
    )
    
    if (isSuspicious) {
      this.logEvent({
        type: 'suspicious_activity',
        severity: 'high',
        userId,
        ipAddress,
        userAgent,
        endpoint: req.url,
        details: {
          reason: 'Suspicious user agent or URL pattern',
          pattern_matched: suspiciousPatterns.find(p => p.test(userAgent) || p.test(req.url))?.toString()
        }
      })
    }
    
    return isSuspicious
  }
  
  logAuthFailure(req: NextRequest, reason: string, userId?: string): void {
    this.logEvent({
      type: 'auth_failure',
      severity: 'medium',
      userId,
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('user-agent') || '',
      endpoint: req.url,
      details: { reason }
    })
  }
  
  logRateLimitExceeded(req: NextRequest, limit: number, userId?: string): void {
    this.logEvent({
      type: 'rate_limit',
      severity: 'medium',
      userId,
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('user-agent') || '',
      endpoint: req.url,
      details: { limit, exceeded_at: new Date().toISOString() }
    })
  }
}

export const securityMonitor = new SecurityMonitor()

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
```

### Vulnerability Scanning

```typescript
// lib/vulnerability-scanner.ts
import { NextRequest } from 'next/server'

export class VulnerabilityScanner {
  // Check for common XSS patterns
  static checkXSS(input: string): boolean {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload\s*=/gi,
      /onerror\s*=/gi,
      /onclick\s*=/gi,
      /onmouseover\s*=/gi,
      /<iframe[^>]*>/gi,
      /<object[^>]*>/gi,
      /<embed[^>]*>/gi
    ]
    
    return xssPatterns.some(pattern => pattern.test(input))
  }
  
  // Check for SQL injection patterns
  static checkSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /('|(\-\-)|(;)|(\||\|)|(\*|\*))/gi,
      /(union.*select|select.*from|insert.*into|delete.*from|drop.*table|create.*table|alter.*table)/gi,
      /(exec|execute|sp_|xp_)/gi,
      /(script|javascript|vbscript)/gi
    ]
    
    return sqlPatterns.some(pattern => pattern.test(input))
  }
  
  // Check for path traversal
  static checkPathTraversal(input: string): boolean {
    const pathPatterns = [
      /\.\.\//gi,
      /\.\.\\\\?/gi,
      /%2e%2e%2f/gi,
      /%2e%2e%5c/gi,
      /\.\.%2f/gi,
      /\.\.%5c/gi
    ]
    
    return pathPatterns.some(pattern => pattern.test(input))
  }
  
  // Comprehensive input validation
  static validateInput(input: string, type: 'email' | 'url' | 'text' | 'html'): {
    isValid: boolean
    threats: string[]
    sanitized: string
  } {
    const threats: string[] = []
    let sanitized = input
    
    // Check for XSS
    if (this.checkXSS(input)) {
      threats.push('XSS')
    }
    
    // Check for SQL injection
    if (this.checkSQLInjection(input)) {
      threats.push('SQL_INJECTION')
    }
    
    // Check for path traversal
    if (this.checkPathTraversal(input)) {
      threats.push('PATH_TRAVERSAL')
    }
    
    // Type-specific validation
    switch (type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(input)) {
          threats.push('INVALID_EMAIL')
        }
        break
        
      case 'url':
        try {
          new URL(input)
        } catch {
          threats.push('INVALID_URL')
        }
        break
        
      case 'html':
        // Additional HTML-specific checks
        if (/<script|<object|<embed|<iframe/gi.test(input)) {
          threats.push('DANGEROUS_HTML')
        }
        break
    }
    
    // Basic sanitization
    if (threats.length > 0) {
      sanitized = input
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
    }
    
    return {
      isValid: threats.length === 0,
      threats,
      sanitized
    }
  }
}

// Middleware to scan requests
export function withVulnerabilityScanning(
  handler: (req: NextRequest) => Promise<Response>
) {
  return async (req: NextRequest) => {
    // Scan URL parameters
    const url = new URL(req.url)
    for (const [key, value] of url.searchParams) {
      const validation = VulnerabilityScanner.validateInput(value, 'text')
      if (!validation.isValid) {
        securityMonitor.logEvent({
          type: 'suspicious_activity',
          severity: 'high',
          ipAddress: getClientIP(req),
          userAgent: req.headers.get('user-agent') || '',
          endpoint: req.url,
          details: {
            parameter: key,
            threats: validation.threats,
            value: value.substring(0, 100) // Log first 100 chars only
          }
        })
        
        return new Response(
          JSON.stringify({ error: 'Invalid input detected' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }
    
    // Scan request body if present
    if (req.body && req.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await req.json()
        const bodyString = JSON.stringify(body)
        const validation = VulnerabilityScanner.validateInput(bodyString, 'text')
        
        if (!validation.isValid) {
          securityMonitor.logEvent({
            type: 'suspicious_activity',
            severity: 'high',
            ipAddress: getClientIP(req),
            userAgent: req.headers.get('user-agent') || '',
            endpoint: req.url,
            details: {
              location: 'request_body',
              threats: validation.threats
            }
          })
          
          return new Response(
            JSON.stringify({ error: 'Invalid input detected' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          )
        }
      } catch (error) {
        // Invalid JSON - let the handler deal with it
      }
    }
    
    return handler(req)
  }
}
```

## 📋 Security Checklist

### Development

- [ ] Input validation on all user inputs
- [ ] Output encoding for all dynamic content
- [ ] SQL injection prevention (Prisma ORM)
- [ ] XSS protection with CSP headers
- [ ] CSRF protection with SameSite cookies
- [ ] Secure authentication with Clerk
- [ ] Role-based access control
- [ ] Rate limiting on API endpoints
- [ ] Secure password policies
- [ ] Data encryption for sensitive information

### Infrastructure

- [ ] HTTPS enforced (HSTS headers)
- [ ] Security headers configured
- [ ] Environment variables secured
- [ ] Database access restricted
- [ ] API keys rotated regularly
- [ ] Backup encryption enabled
- [ ] Network segmentation
- [ ] Firewall rules configured
- [ ] DDoS protection enabled
- [ ] CDN security features enabled

### Monitoring

- [ ] Security event logging
- [ ] Failed authentication monitoring
- [ ] Rate limit breach alerts
- [ ] Suspicious activity detection
- [ ] Vulnerability scanning
- [ ] Dependency security updates
- [ ] Security incident response plan
- [ ] Regular security audits
- [ ] Penetration testing scheduled
- [ ] Compliance monitoring (GDPR, PCI)

### Deployment

- [ ] Secrets management configured
- [ ] Production environment hardened
- [ ] Security headers verified
- [ ] SSL certificate valid
- [ ] Database security configured
- [ ] Backup and recovery tested
- [ ] Incident response procedures
- [ ] Security documentation updated
- [ ] Team security training completed
- [ ] Third-party security assessments

## 🚨 Incident Response

### Security Incident Response Plan

1. **Detection & Analysis**
   - Monitor security alerts
   - Analyze suspicious activities
   - Determine incident severity
   - Document initial findings

2. **Containment**
   - Isolate affected systems
   - Prevent further damage
   - Preserve evidence
   - Notify stakeholders

3. **Eradication**
   - Remove malicious code
   - Patch vulnerabilities
   - Update security controls
   - Verify system integrity

4. **Recovery**
   - Restore services
   - Monitor for reoccurrence
   - Validate security measures
   - Update documentation

5. **Lessons Learned**
   - Conduct post-incident review
   - Update security procedures
   - Improve monitoring
   - Train team members

### Emergency Contacts

- **Security Team**: security@balidmc.com
- **Development Team**: dev@balidmc.com
- **Infrastructure Team**: ops@balidmc.com
- **Legal Team**: legal@balidmc.com
- **External Security Consultant**: [Contact Info]

---

**Remember**: Security is not a one-time implementation but an ongoing process. Regular reviews, updates, and training are essential for maintaining a secure application.