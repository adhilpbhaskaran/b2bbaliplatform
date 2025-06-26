# Security Implementation Guide

This document provides a comprehensive overview of the security features implemented in the Bali DMC application.

## 🔒 Security Features Implemented

### 1. Authentication & Authorization
- **Enhanced Middleware**: Comprehensive security headers, CSP, and authentication checks
- **Role-Based Access Control**: Granular permissions system with roles and permissions
- **API Route Protection**: Secure API endpoints with authentication and authorization
- **Session Management**: Secure session handling with Clerk integration

### 2. Input Validation & Sanitization
- **XSS Prevention**: HTML sanitization using DOMPurify
- **SQL Injection Protection**: Parameterized queries with Prisma
- **Input Validation**: Comprehensive validation using Zod schemas
- **File Upload Security**: Secure file upload with type and size validation

### 3. Rate Limiting
- **Multiple Rate Limiters**: API, authentication, contact, payment, and search endpoints
- **Adaptive Rate Limiting**: Different limits based on user type
- **IP-based Protection**: Suspicious IP detection and blocking
- **Sliding Window**: Precise rate limiting with sliding window algorithm

### 4. Database Security
- **Row-Level Security**: User-specific data access controls
- **Audit Logging**: Comprehensive audit trail for all actions
- **Data Anonymization**: GDPR-compliant data anonymization
- **Secure Transactions**: Protected database operations

### 5. Encryption & Hashing
- **AES-256-GCM Encryption**: Strong encryption for sensitive data
- **Password Hashing**: bcrypt for secure password storage
- **JWT Tokens**: Secure token generation and verification
- **Data Masking**: Sensitive information masking for logs

### 6. Payment Security
- **Stripe Integration**: Secure payment processing with webhook verification
- **PCI Compliance**: Payment data sanitization and validation
- **Fraud Detection**: Suspicious payment pattern detection
- **Secure Refunds**: Protected refund processing

### 7. Security Monitoring
- **Event Logging**: Comprehensive security event tracking
- **Real-time Alerts**: Critical security event notifications
- **Pattern Analysis**: Automated threat detection
- **Security Dashboard**: Administrative security overview

### 8. Network Security
- **HTTPS Enforcement**: Strict transport security
- **Security Headers**: Comprehensive security header implementation
- **Content Security Policy**: Strict CSP with violation reporting
- **CORS Protection**: Controlled cross-origin resource sharing

## 📁 File Structure

```
lib/
├── security/
│   ├── index.ts              # Central security configuration
│   ├── validation.ts         # Input validation and sanitization
│   ├── rate-limit.ts         # Rate limiting utilities
│   ├── crypto.ts             # Encryption and hashing
│   ├── db-security.ts        # Database security utilities
│   ├── payment-security.ts   # Payment security features
│   └── monitoring.ts         # Security monitoring and logging
├── api/
│   └── security.ts           # API route protection utilities
├── auth/
│   └── security.ts           # Enhanced authentication utilities
middleware.ts                 # Enhanced security middleware
app/api/security/             # Security API endpoints
docs/
├── SECURITY.md               # Security documentation
└── SECURITY_IMPLEMENTATION.md # Implementation guide
```

## 🚀 Quick Start

### 1. Environment Setup

Copy the environment variables from `.env.example` and configure:

```bash
# Security
JWT_SECRET="your-jwt-secret-key"
ENCRYPTION_KEY="your-32-character-encryption-key"
SECURITY_WEBHOOK_URL="https://your-monitoring-service.com/webhook"
SECURITY_ALERT_EMAIL="security@yourdomain.com"
```

### 2. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed default roles and permissions
npm run db:seed
```

### 3. Install Dependencies

```bash
npm install --legacy-peer-deps
```

## 🛡️ Usage Examples

### Protecting API Routes

```typescript
import { withApiSecurity } from '@/lib/api/security'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
})

async function handler(req: NextRequest) {
  // Your API logic here
  return NextResponse.json({ success: true })
}

export const POST = withApiSecurity(handler, {
  requireAuth: true,
  allowedRoles: ['ADMIN'],
  rateLimit: { requests: 10, window: '1m' },
  validation: { body: schema },
})
```

### Input Validation

```typescript
import { sanitizeHtml, validateEmail } from '@/lib/security/validation'

const cleanHtml = sanitizeHtml(userInput)
const isValidEmail = validateEmail(email)
```

### Rate Limiting

```typescript
import { apiRateLimit } from '@/lib/security/rate-limit'

const { allowed, remaining } = await apiRateLimit.check('user-id')
if (!allowed) {
  return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
}
```

### Security Monitoring

```typescript
import { SecurityMonitoring } from '@/lib/security/monitoring'

const monitoring = new SecurityMonitoring()
await monitoring.logSecurityEvent({
  event: 'SUSPICIOUS_LOGIN',
  severity: 'HIGH',
  source: 'AUTH',
  metadata: { ipAddress, userAgent },
})
```

## 🔧 Configuration

### Security Headers

Configured in `middleware.ts`:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Strict-Transport-Security (production)

### Content Security Policy

Strict CSP with violation reporting:
- Script sources: self, trusted CDNs
- Style sources: self, inline styles with nonce
- Image sources: self, data URLs, trusted domains
- Report violations to `/api/security/csp-report`

### Rate Limits

- **API**: 100 requests per 15 minutes
- **Authentication**: 5 requests per 15 minutes
- **Contact**: 3 requests per hour
- **Payment**: 10 requests per hour
- **Search**: 50 requests per 15 minutes

## 📊 Security Monitoring

### Dashboard

Access the security dashboard at `/api/admin/security/dashboard` (admin only):
- Security event overview
- Recent security events
- Active alerts
- Threat analysis

### Alerts

Critical security events trigger:
- Webhook notifications
- Email alerts
- Dashboard notifications

### Event Types

- Authentication events
- Authorization failures
- Rate limit violations
- Suspicious activities
- CSP violations
- Payment anomalies

## 🧪 Testing

### Security Test Endpoint

Test the security implementation:

```bash
POST /api/security/test
{
  "message": "Hello, security!"
}
```

### Rate Limit Testing

Test rate limiting by making multiple requests to any protected endpoint.

### CSP Testing

Trigger CSP violations by attempting to load unauthorized resources.

## 📋 Security Checklist

- [ ] Environment variables configured
- [ ] Database schema updated
- [ ] Default roles and permissions seeded
- [ ] Security headers enabled
- [ ] Rate limiting configured
- [ ] Monitoring alerts set up
- [ ] CSP violations reporting
- [ ] SSL/TLS certificates installed
- [ ] Security testing completed

## 🚨 Incident Response

### Critical Security Events

1. **Immediate Response**:
   - Check security dashboard
   - Review recent events
   - Identify affected systems

2. **Investigation**:
   - Analyze security logs
   - Check for data breaches
   - Assess impact scope

3. **Mitigation**:
   - Block suspicious IPs
   - Revoke compromised sessions
   - Apply security patches

4. **Recovery**:
   - Restore from backups if needed
   - Update security measures
   - Document lessons learned

### Contact Information

- **Security Team**: security@yourdomain.com
- **Emergency**: +1-XXX-XXX-XXXX
- **Incident Response**: incidents@yourdomain.com

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Clerk Security Documentation](https://clerk.com/docs/security)
- [Next.js Security Best Practices](https://nextjs.org/docs/advanced-features/security-headers)

## 🔄 Regular Maintenance

### Weekly
- Review security logs
- Check for failed login attempts
- Monitor rate limit violations

### Monthly
- Update dependencies
- Review access permissions
- Conduct security scans

### Quarterly
- Security audit
- Penetration testing
- Update security policies

---

**Note**: This security implementation provides a robust foundation, but security is an ongoing process. Regular updates, monitoring, and testing are essential for maintaining a secure application.