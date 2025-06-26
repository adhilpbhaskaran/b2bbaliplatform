# Deployment Guide

This guide covers deployment strategies and configurations for the Bali DMC project across different environments.

## 🌍 Environment Overview

### Development
- **Purpose**: Local development and testing
- **Database**: Local PostgreSQL or SQLite
- **Authentication**: Clerk development keys
- **Payments**: Stripe test mode
- **File Storage**: Local or development cloud storage

### Staging
- **Purpose**: Pre-production testing and client demos
- **Database**: Hosted PostgreSQL (Supabase/PlanetScale)
- **Authentication**: Clerk staging environment
- **Payments**: Stripe test mode
- **File Storage**: Cloud storage (staging bucket)

### Production
- **Purpose**: Live application
- **Database**: Production PostgreSQL with backups
- **Authentication**: Clerk production environment
- **Payments**: Stripe live mode
- **File Storage**: Production cloud storage with CDN

## 🚀 Vercel Deployment (Recommended)

### Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Code must be in a GitHub repository
3. **Environment Variables**: Prepare all required environment variables

### Step 1: Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Select the `balidmc` repository

### Step 2: Configure Build Settings

```bash
# Build Command (auto-detected)
npm run build

# Output Directory (auto-detected)
.next

# Install Command (auto-detected)
npm install

# Development Command
npm run dev
```

### Step 3: Environment Variables

Add these environment variables in Vercel dashboard:

#### Database
```bash
DATABASE_URL=postgresql://username:password@host:port/database
DIRECT_URL=postgresql://username:password@host:port/database # For migrations
```

#### Authentication (Clerk)
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

#### Payments (Stripe)
```bash
STRIPE_SECRET_KEY=sk_test_... # or sk_live_... for production
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # or pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### File Storage (Cloudinary)
```bash
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

#### Email (Resend)
```bash
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@yourdomain.com
```

#### WhatsApp Integration
```bash
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_VERIFY_TOKEN=your-verify-token
```

#### Application Settings
```bash
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_APP_NAME="Bali DMC"
NEXT_PUBLIC_CONTACT_EMAIL=info@yourdomain.com
NEXT_PUBLIC_CONTACT_PHONE="+62 123 456 7890"
```

### Step 4: Deploy

1. Click "Deploy" in Vercel dashboard
2. Wait for the build to complete
3. Your app will be available at `https://your-project.vercel.app`

### Step 5: Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. SSL certificate will be automatically provisioned

## 🐳 Docker Deployment

### Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/balidmc
      - NEXT_PUBLIC_APP_URL=http://localhost:3000
    depends_on:
      - db
    volumes:
      - ./uploads:/app/uploads

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=balidmc
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Build and Run

```bash
# Build and start services
docker-compose up -d

# Run database migrations
docker-compose exec app npx prisma migrate deploy

# Seed database (optional)
docker-compose exec app npx prisma db seed

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

## ☁️ AWS Deployment

### Using AWS Amplify

1. **Connect Repository**
   - Go to AWS Amplify Console
   - Connect your GitHub repository
   - Select the main branch

2. **Build Settings**
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
           - npx prisma generate
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: .next
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```

3. **Environment Variables**
   - Add all required environment variables in Amplify console
   - Use AWS Systems Manager Parameter Store for sensitive values

### Using AWS ECS with Fargate

1. **Create ECR Repository**
   ```bash
   aws ecr create-repository --repository-name balidmc
   ```

2. **Build and Push Docker Image**
   ```bash
   # Get login token
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
   
   # Build image
   docker build -t balidmc .
   
   # Tag image
   docker tag balidmc:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/balidmc:latest
   
   # Push image
   docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/balidmc:latest
   ```

3. **Create ECS Task Definition**
   ```json
   {
     "family": "balidmc",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "256",
     "memory": "512",
     "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
     "containerDefinitions": [
       {
         "name": "balidmc",
         "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/balidmc:latest",
         "portMappings": [
           {
             "containerPort": 3000,
             "protocol": "tcp"
           }
         ],
         "environment": [
           {
             "name": "NODE_ENV",
             "value": "production"
           }
         ],
         "secrets": [
           {
             "name": "DATABASE_URL",
             "valueFrom": "arn:aws:ssm:us-east-1:123456789012:parameter/balidmc/database-url"
           }
         ]
       }
     ]
   }
   ```

## 🗄️ Database Setup

### PostgreSQL on Supabase

1. **Create Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Note down the database URL

2. **Configure Connection**
   ```bash
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
   DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
   ```

3. **Run Migrations**
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

### PostgreSQL on PlanetScale

1. **Create Database**
   - Go to [planetscale.com](https://planetscale.com)
   - Create new database
   - Create production and development branches

2. **Configure Connection**
   ```bash
   DATABASE_URL="mysql://username:password@host/database?sslaccept=strict"
   ```

3. **Deploy Schema**
   ```bash
   npx prisma db push
   ```

## 🔐 Security Configuration

### SSL/TLS Setup

```javascript
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ]
  }
}
```

### Content Security Policy

```javascript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  response.headers.set(
    'Content-Security-Policy',
    `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      font-src 'self' https://fonts.gstatic.com;
      img-src 'self' data: https: blob:;
      connect-src 'self' https://api.stripe.com https://api.clerk.dev;
      frame-src https://js.stripe.com;
    `.replace(/\s+/g, ' ').trim()
  )
  
  return response
}
```

## 📊 Monitoring and Analytics

### Error Tracking with Sentry

1. **Install Sentry**
   ```bash
   npm install @sentry/nextjs
   ```

2. **Configure Sentry**
   ```javascript
   // sentry.client.config.ts
   import * as Sentry from '@sentry/nextjs'
   
   Sentry.init({
     dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
     environment: process.env.NODE_ENV,
     tracesSampleRate: 1.0
   })
   ```

3. **Environment Variable**
   ```bash
   NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
   ```

### Performance Monitoring

```javascript
// lib/analytics.ts
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export function AnalyticsProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Analytics />
      <SpeedInsights />
    </>
  )
}
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### Database Migrations

```yaml
# .github/workflows/migrate.yml
name: Database Migration

on:
  workflow_dispatch:
  push:
    branches: [main]
    paths: ['prisma/migrations/**']

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## 🚨 Troubleshooting

### Common Issues

#### Build Failures

```bash
# Clear Next.js cache
rm -rf .next
npm run build

# Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### Database Connection Issues

```bash
# Test database connection
npx prisma db pull

# Reset database (development only)
npx prisma migrate reset

# Check migration status
npx prisma migrate status
```

#### Environment Variable Issues

```bash
# Validate environment variables
npm run validate-env

# Check environment in Vercel
vercel env ls

# Pull environment variables
vercel env pull .env.local
```

### Performance Issues

```bash
# Analyze bundle size
npm run analyze

# Check Core Web Vitals
npm run lighthouse

# Profile application
npm run dev -- --profile
```

### Debugging Production Issues

```javascript
// Enable debug logging
const debug = require('debug')('app:*')

// Log performance metrics
console.time('api-call')
const result = await apiCall()
console.timeEnd('api-call')

// Monitor memory usage
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    const used = process.memoryUsage()
    console.log('Memory usage:', {
      rss: Math.round(used.rss / 1024 / 1024) + 'MB',
      heapTotal: Math.round(used.heapTotal / 1024 / 1024) + 'MB',
      heapUsed: Math.round(used.heapUsed / 1024 / 1024) + 'MB'
    })
  }, 30000)
}
```

## 📋 Deployment Checklist

### Pre-deployment

- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Security headers configured
- [ ] Performance optimizations applied
- [ ] Error tracking setup
- [ ] Backup strategy in place

### Post-deployment

- [ ] Application accessible
- [ ] Database migrations applied
- [ ] All features working
- [ ] Performance metrics within targets
- [ ] Error rates normal
- [ ] Monitoring alerts configured
- [ ] SSL certificate valid
- [ ] CDN cache purged if needed

### Rollback Plan

1. **Vercel**: Use deployment history to rollback
2. **Database**: Have migration rollback scripts ready
3. **DNS**: Keep previous deployment URL as backup
4. **Monitoring**: Set up alerts for critical metrics

---

**Remember**: Always test deployments in staging before production, and have a rollback plan ready.