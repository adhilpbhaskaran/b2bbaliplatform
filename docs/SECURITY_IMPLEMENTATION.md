# Security Implementation Guide

This document provides a comprehensive guide for implementing the security features outlined in the SECURITY.md file.

## 📋 Implementation Checklist

### ✅ Authentication & Authorization

- [x] **Clerk Integration**
  - [x] Middleware configuration in `middleware.ts`
  - [x] Route protection (public, protected, admin)
  - [x] Authentication utilities in `lib/auth/security.ts`
  - [x] Role-based access control (RBAC)
  - [x] Permission-based authorization

- [x] **API Route Protection**
  - [x] `withApiAuth` wrapper for API routes
  - [x] Role and permission checking
  - [x] Standardized error responses
  - [x] Security event logging

### ✅ Input Validation & Sanitization

- [x] **Validation Utilities** (`lib/security/validation.ts`)
  - [x] HTML sanitization (XSS prevention)
  - [x] Email validation and sanitization
  - [x] Phone number sanitization
  - [x] SQL injection prevention
  - [x] Path traversal prevention
  - [x] Command injection prevention
  - [x] File upload validation
  - [x] Zod schemas for common inputs

### ✅ Rate Limiting

- [x] **Rate Limiting System** (`lib/security/rate-limit.ts`)
  - [x] LRU cache-based rate limiter
  - [x] Sliding window rate limiter
  - [x] Predefined rate limiters (API, auth, contact, payment)
  - [x] Adaptive rate limiting
  - [x] IP whitelisting
  - [x] Higher-order functions for API routes

### ✅ Database Security

- [x] **Database Security** (`lib/security/db-security.ts`)
  - [x] Row-level security helpers
  - [x] Secure user data retrieval
  - [x] Audit logging
  - [x] Data anonymization (GDPR)
  - [x] Secure data export
  - [x] Parameter validation
  - [x] Secure transaction wrapper
  - [x] Data retention policies

### ✅ Encryption & Hashing

- [x] **Crypto Utilities** (`lib/security/crypto.ts`)
  - [x] AES-256-GCM encryption/decryption
  - [x] Password hashing with bcrypt
  - [x] JWT token utilities
  - [x] Secure random generators
  - [x] HMAC signatures
  - [x] Data masking for logging
  - [x] Key derivation functions
  - [x] Secure storage utilities

### ✅ Payment Security

- [x] **Payment Security** (`lib/security/payment-security.ts`)
  - [x] Stripe webhook signature verification
  - [x] Secure payment intent creation
  - [x] PCI compliance helpers
  - [x] Payment data sanitization
  - [x] Fraud detection utilities
  - [x] Velocity limit checking
  - [x] Card validation (without storage)

### ✅ Security Monitoring

- [x] **Monitoring System** (`lib/security/monitoring.ts`)
  - [x] Security event logging
  - [x] Critical alert system
  - [x] Pattern analysis (brute force, API abuse)
  - [x] Security metrics dashboard
  - [x] IP blocking logic
  - [x] Log cleanup utilities

### ✅ Network Security

- [x] **Security Headers** (in `middleware.ts`)
  - [x] Content Security Policy (CSP)
  - [x] X-Content-Type-Options
  - [x] X-Frame-Options
  - [x] X-XSS-Protection
  - [x] Referrer-Policy
  - [x] Permissions-Policy
  - [x] Strict-Transport-Security (HTTPS)

### ✅ API Security

- [x] **API Protection** (`lib/api/security.ts`)
  - [x] Standardized API responses
  - [x] Error code constants
  - [x] Suspicious activity detection
  - [x] Method validation
  - [x] Input validation integration
  - [x] CORS configuration
  - [x] Security wrapper functions

## 🚀 Implementation Steps

### Step 1: Environment Configuration

1. **Add required environment variables:**

```bash
# Security
ENCRYPTION_KEY=your_64_character_hex_key
JWT_SECRET=your_jwt_secret_key
SECURITY_WEBHOOK_URL=https://your-security-service.com/webhook
SECURITY_WEBHOOK_TOKEN=your_webhook_token
SECURITY_EMAIL=security@yourdomain.com

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Database
DATABASE_URL=postgresql://...
```

### Step 2: Database Schema Updates

1. **Add security-related tables to your Prisma schema:**

```prisma
model SecurityLog {
  id        String   @id @default(cuid())
  userId    String?
  eventType String
  severity  String
  resource  String
  action    String
  ipAddress String?
  userAgent String?
  metadata  Json?
  timestamp DateTime @default(now())
  
  user User? @relation(fields: [userId], references: [id])
  
  @@map("security_logs")
}

model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  action    String
  resource  String
  metadata  Json?
  ipAddress String?
  userAgent String?
  timestamp DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id])
  
  @@map("audit_logs")
}

model Role {
  id          String @id @default(cuid())
  name        String @unique
  description String?
  
  users       User[]
  permissions RolePermission[]
  
  @@map("roles")
}

model Permission {
  id          String @id @default(cuid())
  name        String @unique
  description String?
  
  roles RolePermission[]
  
  @@map("permissions")
}

model RolePermission {
  roleId       String
  permissionId String
  
  role       Role       @relation(fields: [roleId], references: [id])
  permission Permission @relation(fields: [permissionId], references: [id])
  
  @@id([roleId, permissionId])
  @@map("role_permissions")
}

// Add to existing User model
model User {
  // ... existing fields
  roleId String?
  role   Role?   @relation(fields: [roleId], references: [id])
  
  securityLogs SecurityLog[]
  auditLogs    AuditLog[]
  
  // ... rest of model
}
```

2. **Run database migration:**

```bash
npx prisma db push
# or
npx prisma migrate dev --name add-security-tables
```

### Step 3: Seed Default Roles and Permissions

1. **Create a seed script** (`prisma/seed.ts`):

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create permissions
  const permissions = await Promise.all([
    prisma.permission.upsert({
      where: { name: 'read:users' },
      update: {},
      create: { name: 'read:users', description: 'Read user data' }
    }),
    prisma.permission.upsert({
      where: { name: 'write:users' },
      update: {},
      create: { name: 'write:users', description: 'Modify user data' }
    }),
    prisma.permission.upsert({
      where: { name: 'read:bookings' },
      update: {},
      create: { name: 'read:bookings', description: 'Read booking data' }
    }),
    prisma.permission.upsert({
      where: { name: 'write:bookings' },
      update: {},
      create: { name: 'write:bookings', description: 'Modify booking data' }
    }),
    prisma.permission.upsert({
      where: { name: 'admin:all' },
      update: {},
      create: { name: 'admin:all', description: 'Full admin access' }
    })
  ]);

  // Create roles
  const userRole = await prisma.role.upsert({
    where: { name: 'user' },
    update: {},
    create: { name: 'user', description: 'Regular user' }
  });

  const staffRole = await prisma.role.upsert({
    where: { name: 'staff' },
    update: {},
    create: { name: 'staff', description: 'Staff member' }
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin', description: 'Administrator' }
  });

  // Assign permissions to roles
  await prisma.rolePermission.createMany({
    data: [
      // User permissions
      { roleId: userRole.id, permissionId: permissions[2].id }, // read:bookings
      
      // Staff permissions
      { roleId: staffRole.id, permissionId: permissions[0].id }, // read:users
      { roleId: staffRole.id, permissionId: permissions[2].id }, // read:bookings
      { roleId: staffRole.id, permissionId: permissions[3].id }, // write:bookings
      
      // Admin permissions
      { roleId: adminRole.id, permissionId: permissions[4].id }, // admin:all
    ],
    skipDuplicates: true
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

2. **Run the seed:**

```bash
npx prisma db seed
```

### Step 4: Update API Routes

1. **Protect existing API routes with security wrappers:**

```typescript
// Example: app/api/bookings/route.ts
import { withAuth, withRateLimit } from '@/lib/api/security';
import { NextRequest } from 'next/server';

async function handler(request: NextRequest) {
  // Your existing logic here
}

// Apply security wrappers
export const GET = withAuth(withRateLimit(handler, 50, 15 * 60 * 1000));
export const POST = withAuth(withRateLimit(handler, 10, 60 * 60 * 1000));
```

2. **Add input validation:**

```typescript
import { withValidation } from '@/lib/api/security';
import { z } from 'zod';

const createBookingSchema = z.object({
  packageId: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  guests: z.number().min(1).max(20)
});

export const POST = withAuth(
  withValidation(
    withRateLimit(handler, 5, 60 * 60 * 1000),
    createBookingSchema
  )
);
```

### Step 5: Frontend Security Integration

1. **Add CSRF protection to forms:**

```typescript
// components/forms/ContactForm.tsx
import { generateCSRFToken } from '@/lib/security/crypto';

export function ContactForm() {
  const [csrfToken, setCsrfToken] = useState('');
  
  useEffect(() => {
    setCsrfToken(generateCSRFToken());
  }, []);
  
  // Include CSRF token in form submission
}
```

2. **Implement client-side validation:**

```typescript
import { validateEmail, validatePhone } from '@/lib/security/validation';

// Use validation functions in form components
```

### Step 6: Security Monitoring Setup

1. **Create security dashboard page:**

```typescript
// app/admin/security/page.tsx
import { getDashboardData } from '@/lib/security/monitoring';
import { requireRole } from '@/lib/auth/security';

export default async function SecurityDashboard() {
  await requireRole('admin');
  
  const dashboardData = await getDashboardData();
  
  return (
    <div>
      {/* Security metrics and alerts */}
    </div>
  );
}
```

2. **Set up automated security tasks:**

```typescript
// lib/cron/security.ts
import { cleanupExpiredData } from '@/lib/security/db-security';
import { cleanupOldLogs } from '@/lib/security/monitoring';

// Run daily cleanup
export async function dailySecurityCleanup() {
  await cleanupExpiredData();
  await cleanupOldLogs();
}
```

## 🔧 Configuration

### Security Headers Configuration

The security headers are automatically applied through the middleware. You can customize them in `lib/security/index.ts`:

```typescript
export const SECURITY_CONFIG = {
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    // ... other headers
  },
  csp: {
    'default-src': ["'self'"],
    // ... CSP directives
  }
};
```

### Rate Limiting Configuration

Customize rate limits in `lib/security/index.ts`:

```typescript
export const SECURITY_CONFIG = {
  rateLimits: {
    api: { windowMs: 15 * 60 * 1000, max: 100 },
    auth: { windowMs: 15 * 60 * 1000, max: 5 },
    // ... other limits
  }
};
```

## 🚨 Security Alerts

### Setting Up External Monitoring

1. **Configure webhook endpoint** for security alerts
2. **Set up email notifications** for critical events
3. **Integrate with monitoring services** (Sentry, DataDog, etc.)

### Alert Thresholds

Configure alert thresholds in `lib/security/index.ts`:

```typescript
export const SECURITY_CONFIG = {
  monitoring: {
    alertThresholds: {
      failedLogins: 5,
      apiRequests: 100,
      dataAccess: 50
    }
  }
};
```

## 📊 Security Metrics

### Available Metrics

- Total security events
- Events by type and severity
- Top IP addresses
- Top users by activity
- Suspicious activities count
- Failed login attempts
- Rate limit violations

### Accessing Metrics

```typescript
import { getSecurityMetrics } from '@/lib/security/monitoring';

const metrics = await getSecurityMetrics('day');
```

## 🧪 Testing Security Features

### Unit Tests

```typescript
// __tests__/security/validation.test.ts
import { sanitizeHtml, validateEmail } from '@/lib/security/validation';

describe('Input Validation', () => {
  test('should sanitize HTML', () => {
    const malicious = '<script>alert("xss")</script>';
    const sanitized = sanitizeHtml(malicious);
    expect(sanitized).not.toContain('<script>');
  });
});
```

### Integration Tests

```typescript
// __tests__/api/security.test.ts
import { testApiHandler } from 'next-test-api-route-handler';
import handler from '@/app/api/bookings/route';

describe('/api/bookings', () => {
  test('should require authentication', async () => {
    await testApiHandler({
      handler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'GET' });
        expect(res.status).toBe(401);
      }
    });
  });
});
```

## 🔍 Security Audit

### Regular Security Checks

1. **Review security logs** weekly
2. **Update dependencies** monthly
3. **Conduct penetration testing** quarterly
4. **Review access permissions** monthly
5. **Update security policies** as needed

### Security Checklist for Deployment

- [ ] All environment variables are set
- [ ] HTTPS is enforced
- [ ] Security headers are configured
- [ ] Rate limiting is active
- [ ] Monitoring is set up
- [ ] Backup and recovery procedures are tested
- [ ] Security incident response plan is in place

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)
- [Clerk Security](https://clerk.dev/docs/security)
- [Stripe Security](https://stripe.com/docs/security)
- [Prisma Security](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/connection-management#security)

## 🆘 Security Incident Response

### Immediate Actions

1. **Identify and contain** the security incident
2. **Assess the impact** and affected systems
3. **Notify stakeholders** and relevant authorities
4. **Document the incident** for future reference
5. **Implement fixes** and preventive measures
6. **Monitor for additional threats**

### Contact Information

- **Security Team**: security@yourdomain.com
- **Emergency Contact**: +1-XXX-XXX-XXXX
- **Incident Response Team**: incident-response@yourdomain.com

---

**Note**: This implementation guide should be regularly updated as new security features are added or existing ones are modified. Always follow the principle of defense in depth and regularly review and test your security measures.