import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

// Sanitize HTML input
export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
}

// Sanitize and validate email
export function sanitizeEmail(email: string): string {
  const sanitized = validator.normalizeEmail(email.trim().toLowerCase()) || '';
  if (!validator.isEmail(sanitized)) {
    throw new Error('Invalid email format');
  }
  return sanitized;
}

// Sanitize phone number
export function sanitizePhone(phone: string): string {
  const cleaned = phone.replace(/[^+\d]/g, '');
  if (!validator.isMobilePhone(cleaned)) {
    throw new Error('Invalid phone number');
  }
  return cleaned;
}

// SQL injection prevention (Prisma handles this automatically)
export const safeUserQuery = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  phone: z.string().optional()
});

// XSS prevention for user-generated content
export function sanitizeUserContent(content: string): string {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
    ALLOWED_ATTR: [],
    FORBID_SCRIPTS: true,
    FORBID_TAGS: ['script', 'object', 'embed', 'link', 'style'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
  });
}

// Advanced input sanitization
export function sanitizeInput(input: string, type: 'text' | 'html' | 'url' | 'filename'): string {
  switch (type) {
    case 'text':
      return input
        .trim()
        .replace(/[<>"'&]/g, (char) => {
          const entities: Record<string, string> = {
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '&': '&amp;'
          };
          return entities[char] || char;
        });
    
    case 'html':
      return sanitizeHtml(input);
    
    case 'url':
      try {
        const url = new URL(input);
        // Only allow http and https protocols
        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new Error('Invalid protocol');
        }
        return url.toString();
      } catch {
        throw new Error('Invalid URL');
      }
    
    case 'filename':
      return input
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_{2,}/g, '_')
        .substring(0, 255);
    
    default:
      return input.trim();
  }
}

// Validate file uploads
export function validateFileUpload(file: File, options: {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
}): { isValid: boolean; error?: string } {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf']
  } = options;
  
  // Check file size
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size exceeds ${maxSize / 1024 / 1024}MB limit`
    };
  }
  
  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File type ${file.type} is not allowed`
    };
  }
  
  // Check file extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    return {
      isValid: false,
      error: `File extension ${extension} is not allowed`
    };
  }
  
  // Check for suspicious file names
  const suspiciousPatterns = [
    /\.(exe|bat|cmd|scr|pif|com)$/i,
    /\.(php|asp|jsp|js)$/i,
    /\.htaccess$/i,
    /^\./,
    /\.\./, // Path traversal
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
    return {
      isValid: false,
      error: 'Suspicious file name detected'
    };
  }
  
  return { isValid: true };
}

// Comprehensive input validation
export class InputValidator {
  // Check for XSS patterns
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
    ];
    
    return xssPatterns.some(pattern => pattern.test(input));
  }
  
  // Check for SQL injection patterns
  static checkSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /('|(\-\-)|(;)|(\||\|)|(\*|\*))/gi,
      /(union.*select|select.*from|insert.*into|delete.*from|drop.*table|create.*table|alter.*table)/gi,
      /(exec|execute|sp_|xp_)/gi,
      /(script|javascript|vbscript)/gi
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input));
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
    ];
    
    return pathPatterns.some(pattern => pattern.test(input));
  }
  
  // Check for command injection
  static checkCommandInjection(input: string): boolean {
    const commandPatterns = [
      /[;&|`$(){}\[\]]/,
      /\b(cat|ls|pwd|whoami|id|uname|ps|netstat|ifconfig|ping|wget|curl|nc|telnet|ssh|ftp)\b/gi,
      /\b(rm|mv|cp|chmod|chown|kill|killall|sudo|su)\b/gi
    ];
    
    return commandPatterns.some(pattern => pattern.test(input));
  }
  
  // Check for LDAP injection
  static checkLDAPInjection(input: string): boolean {
    const ldapPatterns = [
      /[()&|!]/,
      /\*.*\*/,
      /\\[0-9a-fA-F]{2}/
    ];
    
    return ldapPatterns.some(pattern => pattern.test(input));
  }
  
  // Comprehensive input validation
  static validateInput(input: string, type: 'email' | 'url' | 'text' | 'html'): {
    isValid: boolean;
    threats: string[];
    sanitized: string;
  } {
    const threats: string[] = [];
    let sanitized = input;
    
    // Check for various injection types
    if (this.checkXSS(input)) {
      threats.push('XSS');
    }
    
    if (this.checkSQLInjection(input)) {
      threats.push('SQL_INJECTION');
    }
    
    if (this.checkPathTraversal(input)) {
      threats.push('PATH_TRAVERSAL');
    }
    
    if (this.checkCommandInjection(input)) {
      threats.push('COMMAND_INJECTION');
    }
    
    if (this.checkLDAPInjection(input)) {
      threats.push('LDAP_INJECTION');
    }
    
    // Type-specific validation
    switch (type) {
      case 'email':
        try {
          sanitized = sanitizeEmail(input);
        } catch {
          threats.push('INVALID_EMAIL');
        }
        break;
        
      case 'url':
        try {
          sanitized = sanitizeInput(input, 'url');
        } catch {
          threats.push('INVALID_URL');
        }
        break;
        
      case 'html':
        sanitized = sanitizeHtml(input);
        // Additional HTML-specific checks
        if (/<script|<object|<embed|<iframe/gi.test(input)) {
          threats.push('DANGEROUS_HTML');
        }
        break;
        
      case 'text':
      default:
        sanitized = sanitizeInput(input, 'text');
        break;
    }
    
    return {
      isValid: threats.length === 0,
      threats,
      sanitized
    };
  }
}

// Validation schemas for common inputs
export const secureSchemas = {
  email: z.string().email().transform(sanitizeEmail),
  
  phone: z.string().transform(sanitizePhone),
  
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Invalid characters in name')
    .transform(val => sanitizeInput(val, 'text')),
  
  message: z.string()
    .min(1, 'Message is required')
    .max(5000, 'Message too long')
    .transform(val => sanitizeUserContent(val)),
  
  url: z.string().url().transform(val => sanitizeInput(val, 'url')),
  
  filename: z.string()
    .min(1, 'Filename is required')
    .max(255, 'Filename too long')
    .transform(val => sanitizeInput(val, 'filename')),
  
  id: z.string().uuid('Invalid ID format'),
  
  slug: z.string()
    .min(1, 'Slug is required')
    .max(100, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Password must contain uppercase, lowercase, number and special character'),
  
  amount: z.number()
    .positive('Amount must be positive')
    .max(1000000, 'Amount too large')
    .multipleOf(0.01, 'Invalid amount precision'),
  
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
    .transform(val => {
      const date = new Date(val);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
      return val;
    })
};

// Rate limiting validation
export function validateRateLimit(ip: string, endpoint: string): boolean {
  // This would typically integrate with your rate limiting system
  // For now, return true as a placeholder
  return true;
}

// Content Security Policy validation
export function validateCSP(content: string): boolean {
  // Check if content violates CSP
  const violations = [
    /<script/gi,
    /javascript:/gi,
    /data:text\/html/gi,
    /vbscript:/gi
  ];
  
  return !violations.some(pattern => pattern.test(content));
}

// File content validation
export async function validateFileContent(file: File): Promise<{
  isValid: boolean;
  threats: string[];
}> {
  const threats: string[] = [];
  
  try {
    // Read file content for text files
    if (file.type.startsWith('text/') || file.type === 'application/json') {
      const content = await file.text();
      const validation = InputValidator.validateInput(content, 'text');
      threats.push(...validation.threats);
    }
    
    // Check for embedded scripts in images (basic check)
    if (file.type.startsWith('image/')) {
      const arrayBuffer = await file.arrayBuffer();
      const content = new TextDecoder().decode(arrayBuffer);
      
      if (content.includes('<script') || content.includes('javascript:')) {
        threats.push('EMBEDDED_SCRIPT');
      }
    }
    
    return {
      isValid: threats.length === 0,
      threats
    };
  } catch (error) {
    return {
      isValid: false,
      threats: ['FILE_READ_ERROR']
    };
  }
}

// Export validation utilities
export const validationUtils = {
  sanitizeHtml,
  sanitizeEmail,
  sanitizePhone,
  sanitizeInput,
  sanitizeUserContent,
  validateFileUpload,
  validateFileContent,
  validateCSP,
  InputValidator
};