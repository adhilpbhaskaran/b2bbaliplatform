// Security utilities index - centralized exports and configuration

// Core security utilities
export * from './validation';
export * from './rate-limit';
export * from './crypto';
export * from './db-security';
export * from './payment-security';
export * from './monitoring';

// Re-export auth utilities
export * from '../auth/security';

// Security configuration
export const SECURITY_CONFIG = {
  // Rate limiting
  rateLimits: {
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // requests per window
    },
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5 // login attempts per window
    },
    contact: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3 // contact form submissions per hour
    },
    payment: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10 // payment attempts per hour
    }
  },
  
  // Security headers
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  },
  
  // Content Security Policy
  csp: {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Required for Next.js
      "'unsafe-eval'", // Required for development
      'https://js.stripe.com',
      'https://checkout.stripe.com',
      'https://maps.googleapis.com'
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for Tailwind CSS
      'https://fonts.googleapis.com'
    ],
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com'
    ],
    'img-src': [
      "'self'",
      'data:',
      'https:',
      'blob:'
    ],
    'connect-src': [
      "'self'",
      'https://api.stripe.com',
      'https://checkout.stripe.com',
      'https://maps.googleapis.com',
      'https://api.clerk.dev'
    ],
    'frame-src': [
      'https://js.stripe.com',
      'https://checkout.stripe.com'
    ],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"]
  },
  
  // File upload security
  fileUpload: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
      'text/plain'
    ],
    allowedExtensions: [
      '.jpg',
      '.jpeg',
      '.png',
      '.webp',
      '.gif',
      '.pdf',
      '.txt'
    ]
  },
  
  // Password requirements
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true,
    maxLength: 128
  },
  
  // Session security
  session: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    renewThreshold: 60 * 60 * 1000, // 1 hour
    absoluteTimeout: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  
  // API security
  api: {
    maxRequestSize: '1mb',
    timeout: 30000, // 30 seconds
    corsOrigins: process.env.NODE_ENV === 'production' 
      ? [process.env.NEXT_PUBLIC_APP_URL!]
      : ['http://localhost:3000', 'http://127.0.0.1:3000']
  },
  
  // Monitoring
  monitoring: {
    logRetentionDays: 90,
    alertThresholds: {
      failedLogins: 5, // per 5 minutes
      apiRequests: 100, // per hour
      dataAccess: 50 // per hour per user
    },
    criticalEvents: [
      'authentication.failed_login',
      'authorization.permission_denied',
      'suspicious_activity.brute_force_detected',
      'suspicious_activity.rate_limit_exceeded',
      'payment_activity.fraud_detected'
    ]
  }
};

// Security middleware configuration
export const SECURITY_MIDDLEWARE_CONFIG = {
  // Public routes that don't require authentication
  publicRoutes: [
    '/',
    '/about',
    '/packages',
    '/packages/[id]',
    '/contact',
    '/api/contact',
    '/api/newsletter',
    '/api/packages',
    '/api/packages/[id]',
    '/api/webhooks/stripe',
    '/api/webhooks/clerk'
  ],
  
  // Routes that require authentication
  protectedRoutes: [
    '/dashboard',
    '/profile',
    '/bookings',
    '/api/bookings',
    '/api/quotes',
    '/api/reviews',
    '/api/user'
  ],
  
  // Admin-only routes
  adminRoutes: [
    '/admin',
    '/api/admin'
  ],
  
  // Routes to ignore (static files, etc.)
  ignoredRoutes: [
    '/_next',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml'
  ],
  
  // Suspicious patterns to detect
  suspiciousPatterns: [
    // SQL injection attempts
    /('|(\-\-)|(;)|(\||\|)|(\*|\*))/i,
    /(union|select|insert|delete|update|drop|create|alter|exec|execute)/i,
    
    // XSS attempts
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    
    // Path traversal
    /\.\.[\/\\]/g,
    /(\.\.[\/\\]){2,}/g,
    
    // Command injection
    /[;&|`$(){}\[\]]/g,
    /(cat|ls|pwd|whoami|id|uname|wget|curl|nc|netcat)/gi
  ],
  
  // Bot/crawler user agents to block
  suspiciousUserAgents: [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /scanner/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i,
    /go-http-client/i
  ]
};

// Utility functions for security configuration
export class SecurityConfig {
  // Get CSP header value
  static getCSPHeader(): string {
    const csp = SECURITY_CONFIG.csp;
    const directives = Object.entries(csp).map(([key, values]) => {
      return `${key} ${values.join(' ')}`;
    });
    return directives.join('; ');
  }
  
  // Check if route is public
  static isPublicRoute(pathname: string): boolean {
    return SECURITY_MIDDLEWARE_CONFIG.publicRoutes.some(route => {
      if (route.includes('[')) {
        // Handle dynamic routes
        const pattern = route.replace(/\[.*?\]/g, '[^/]+');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(pathname);
      }
      return pathname === route || pathname.startsWith(route + '/');
    });
  }
  
  // Check if route is protected
  static isProtectedRoute(pathname: string): boolean {
    return SECURITY_MIDDLEWARE_CONFIG.protectedRoutes.some(route => {
      if (route.includes('[')) {
        const pattern = route.replace(/\[.*?\]/g, '[^/]+');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(pathname);
      }
      return pathname === route || pathname.startsWith(route + '/');
    });
  }
  
  // Check if route is admin-only
  static isAdminRoute(pathname: string): boolean {
    return SECURITY_MIDDLEWARE_CONFIG.adminRoutes.some(route => {
      return pathname === route || pathname.startsWith(route + '/');
    });
  }
  
  // Check if route should be ignored
  static isIgnoredRoute(pathname: string): boolean {
    return SECURITY_MIDDLEWARE_CONFIG.ignoredRoutes.some(route => {
      return pathname.startsWith(route);
    });
  }
  
  // Check for suspicious patterns
  static hasSuspiciousPatterns(input: string): boolean {
    return SECURITY_MIDDLEWARE_CONFIG.suspiciousPatterns.some(pattern => {
      return pattern.test(input);
    });
  }
  
  // Check for suspicious user agent
  static hasSuspiciousUserAgent(userAgent: string): boolean {
    return SECURITY_MIDDLEWARE_CONFIG.suspiciousUserAgents.some(pattern => {
      return pattern.test(userAgent);
    });
  }
  
  // Validate file upload
  static validateFileUpload(file: {
    name: string;
    type: string;
    size: number;
  }): { valid: boolean; error?: string } {
    const config = SECURITY_CONFIG.fileUpload;
    
    // Check file size
    if (file.size > config.maxSize) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${config.maxSize / (1024 * 1024)}MB`
      };
    }
    
    // Check file type
    if (!config.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} is not allowed`
      };
    }
    
    // Check file extension
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!config.allowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: `File extension ${extension} is not allowed`
      };
    }
    
    return { valid: true };
  }
  
  // Validate password strength
  static validatePassword(password: string): {
    valid: boolean;
    score: number;
    errors: string[];
  } {
    const config = SECURITY_CONFIG.password;
    const errors: string[] = [];
    let score = 0;
    
    // Check length
    if (password.length < config.minLength) {
      errors.push(`Password must be at least ${config.minLength} characters long`);
    } else {
      score += 20;
    }
    
    if (password.length > config.maxLength) {
      errors.push(`Password must not exceed ${config.maxLength} characters`);
    }
    
    // Check for uppercase
    if (config.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else if (/[A-Z]/.test(password)) {
      score += 20;
    }
    
    // Check for lowercase
    if (config.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else if (/[a-z]/.test(password)) {
      score += 20;
    }
    
    // Check for numbers
    if (config.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    } else if (/\d/.test(password)) {
      score += 20;
    }
    
    // Check for symbols
    if (config.requireSymbols && !/[^a-zA-Z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    } else if (/[^a-zA-Z0-9]/.test(password)) {
      score += 20;
    }
    
    return {
      valid: errors.length === 0,
      score: Math.min(score, 100),
      errors
    };
  }
}

// Export default configuration
export default {
  SECURITY_CONFIG,
  SECURITY_MIDDLEWARE_CONFIG,
  SecurityConfig
};