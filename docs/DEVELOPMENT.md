# Development Guide

This guide outlines the development practices, coding standards, and workflows for the Bali DMC project.

## 🏗️ Architecture Overview

### Frontend Architecture

```
app/                    # Next.js App Router
├── (routes)/          # Route groups
│   ├── (auth)/        # Authentication routes
│   ├── (dashboard)/   # Dashboard routes
│   └── (public)/      # Public routes
├── api/               # API routes
├── globals.css        # Global styles
├── layout.tsx         # Root layout
└── page.tsx           # Home page

components/            # React components
├── ui/                # Base UI components (shadcn/ui)
├── forms/             # Form components
├── layout/            # Layout components
├── sections/          # Page sections
└── providers/         # Context providers

lib/                   # Utility libraries
├── utils.ts           # General utilities
├── validations.ts     # Zod schemas
├── error-handling.ts  # Error utilities
├── env-validation.ts  # Environment validation
└── api.ts             # API client

hooks/                 # Custom React hooks
types/                 # TypeScript definitions
```

### Backend Architecture

```
app/api/               # API routes
├── auth/              # Authentication endpoints
├── packages/          # Package management
├── bookings/          # Booking system
├── payments/          # Payment processing
├── contact/           # Contact forms
└── webhooks/          # Webhook handlers

prisma/                # Database
├── schema.prisma      # Database schema
├── migrations/        # Database migrations
└── seed.ts            # Database seeding
```

## 📝 Coding Standards

### TypeScript Guidelines

#### 1. Type Definitions

```typescript
// ✅ Good: Use interfaces for object shapes
interface User {
  id: string
  name: string
  email: string
  createdAt: Date
}

// ✅ Good: Use type aliases for unions and primitives
type Status = 'pending' | 'confirmed' | 'cancelled'
type UserId = string

// ❌ Avoid: Using any
const data: any = fetchData() // Bad

// ✅ Good: Use proper typing
const data: User[] = await fetchUsers()
```

#### 2. Function Signatures

```typescript
// ✅ Good: Explicit return types for public functions
export async function createUser(userData: CreateUserInput): Promise<User> {
  // implementation
}

// ✅ Good: Use generic constraints
function updateEntity<T extends { id: string }>(
  entity: T,
  updates: Partial<T>
): T {
  return { ...entity, ...updates }
}
```

#### 3. Error Handling

```typescript
// ✅ Good: Use custom error types
class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public code: string
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

// ✅ Good: Handle errors explicitly
try {
  const result = await riskyOperation()
  return { success: true, data: result }
} catch (error) {
  if (error instanceof ValidationError) {
    return { success: false, error: error.message }
  }
  throw error // Re-throw unexpected errors
}
```

### React Component Guidelines

#### 1. Component Structure

```typescript
// ✅ Good: Component structure
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import type { User } from '@/types'

interface UserProfileProps {
  user: User
  onUpdate?: (user: User) => void
}

export function UserProfile({ user, onUpdate }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    try {
      // Save logic
      toast({ title: 'Profile updated successfully' })
      onUpdate?.(updatedUser)
    } catch (error) {
      toast({ 
        title: 'Error updating profile',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Component JSX */}
    </div>
  )
}
```

#### 2. Custom Hooks

```typescript
// ✅ Good: Custom hook pattern
export function usePackages(filters?: PackageFilters) {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setLoading(true)
        const data = await api.packages.list(filters)
        setPackages(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchPackages()
  }, [filters])

  return { packages, loading, error, refetch: fetchPackages }
}
```

#### 3. Form Handling

```typescript
// ✅ Good: Form with validation
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { contactFormSchema, type ContactFormData } from '@/lib/validations'

export function ContactForm() {
  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      message: ''
    }
  })

  const onSubmit = async (data: ContactFormData) => {
    try {
      await api.contact.submit(data)
      form.reset()
      toast({ title: 'Message sent successfully' })
    } catch (error) {
      handleFormError(error, form.setError)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form fields */}
      </form>
    </Form>
  )
}
```

### API Route Guidelines

#### 1. Route Structure

```typescript
// app/api/packages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { packageSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/error-handling'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filters = {
      category: searchParams.get('category'),
      minPrice: Number(searchParams.get('minPrice')) || undefined,
      maxPrice: Number(searchParams.get('maxPrice')) || undefined
    }

    const packages = await getPackages(filters)
    
    return NextResponse.json({
      success: true,
      data: packages
    })
  } catch (error) {
    const apiError = handleApiError(error)
    return NextResponse.json(
      { success: false, ...apiError },
      { status: apiError.statusCode }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = packageSchema.parse(body)
    
    const package = await createPackage(validatedData)
    
    return NextResponse.json(
      { success: true, data: package },
      { status: 201 }
    )
  } catch (error) {
    const apiError = handleApiError(error)
    return NextResponse.json(
      { success: false, ...apiError },
      { status: apiError.statusCode }
    )
  }
}
```

#### 2. Database Operations

```typescript
// lib/db/packages.ts
import { prisma } from '@/lib/prisma'
import type { Package, PackageFilters } from '@/types'

export async function getPackages(filters: PackageFilters = {}): Promise<Package[]> {
  const where = {
    ...(filters.category && { category: filters.category }),
    ...(filters.minPrice && { price: { gte: filters.minPrice } }),
    ...(filters.maxPrice && { price: { lte: filters.maxPrice } })
  }

  return prisma.package.findMany({
    where,
    include: {
      images: true,
      reviews: {
        select: {
          rating: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
}

export async function createPackage(data: CreatePackageInput): Promise<Package> {
  return prisma.package.create({
    data: {
      ...data,
      slug: generateSlug(data.title)
    },
    include: {
      images: true
    }
  })
}
```

## 🧪 Testing Guidelines

### Unit Testing

```typescript
// __tests__/lib/utils.test.ts
import { formatPrice, generateSlug } from '@/lib/utils'

describe('Utils', () => {
  describe('formatPrice', () => {
    it('formats USD currency correctly', () => {
      expect(formatPrice(1234.56, 'USD')).toBe('$1,234.56')
    })

    it('handles zero values', () => {
      expect(formatPrice(0, 'USD')).toBe('$0.00')
    })
  })

  describe('generateSlug', () => {
    it('converts title to slug', () => {
      expect(generateSlug('Bali Cultural Experience')).toBe('bali-cultural-experience')
    })

    it('handles special characters', () => {
      expect(generateSlug('Package #1: Ubud & Temples')).toBe('package-1-ubud-temples')
    })
  })
})
```

### Component Testing

```typescript
// __tests__/components/package-card.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { PackageCard } from '@/components/package-card'
import { mockPackage } from '@/test/mocks'

describe('PackageCard', () => {
  it('renders package information', () => {
    render(<PackageCard package={mockPackage} />)
    
    expect(screen.getByText(mockPackage.title)).toBeInTheDocument()
    expect(screen.getByText(`$${mockPackage.price}`)).toBeInTheDocument()
    expect(screen.getByText(`${mockPackage.duration} days`)).toBeInTheDocument()
  })

  it('calls onSelect when clicked', () => {
    const onSelect = jest.fn()
    render(<PackageCard package={mockPackage} onSelect={onSelect} />)
    
    fireEvent.click(screen.getByRole('button', { name: /select package/i }))
    expect(onSelect).toHaveBeenCalledWith(mockPackage.id)
  })
})
```

### API Testing

```typescript
// __tests__/api/packages.test.ts
import { createMocks } from 'node-mocks-http'
import handler from '@/app/api/packages/route'
import { prismaMock } from '@/test/prisma-mock'

describe('/api/packages', () => {
  it('returns packages list', async () => {
    const mockPackages = [{ id: '1', title: 'Test Package' }]
    prismaMock.package.findMany.mockResolvedValue(mockPackages)

    const { req, res } = createMocks({ method: 'GET' })
    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(JSON.parse(res._getData())).toEqual({
      success: true,
      data: mockPackages
    })
  })
})
```

## 🎨 Styling Guidelines

### Tailwind CSS Best Practices

```typescript
// ✅ Good: Use semantic class names
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input hover:bg-accent hover:text-accent-foreground'
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

// ✅ Good: Responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {packages.map(package => (
    <PackageCard key={package.id} package={package} />
  ))}
</div>

// ✅ Good: Dark mode support
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  Content
</div>
```

### Component Styling

```typescript
// ✅ Good: Use CSS variables for theming
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
}

// ✅ Good: Component-specific styles
.package-card {
  @apply rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md;
}

.package-card-image {
  @apply aspect-video w-full rounded-t-lg object-cover;
}
```

## 🔒 Security Guidelines

### Input Validation

```typescript
// ✅ Good: Always validate input
import { z } from 'zod'

const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(50)
})

export async function createUser(input: unknown) {
  const validatedInput = createUserSchema.parse(input)
  // Safe to use validatedInput
}
```

### Authentication

```typescript
// ✅ Good: Protect API routes
import { auth } from '@clerk/nextjs'

export async function POST(request: NextRequest) {
  const { userId } = auth()
  
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  // Protected logic
}

// ✅ Good: Protect pages
import { RedirectToSignIn, SignedIn, SignedOut } from '@clerk/nextjs'

export default function ProtectedPage() {
  return (
    <>
      <SignedIn>
        <DashboardContent />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  )
}
```

### Data Sanitization

```typescript
// ✅ Good: Sanitize user input
import DOMPurify from 'isomorphic-dompurify'

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: []
  })
}

// ✅ Good: Escape SQL queries (Prisma handles this automatically)
const users = await prisma.user.findMany({
  where: {
    email: userEmail // Prisma automatically escapes this
  }
})
```

## 📊 Performance Guidelines

### Code Splitting

```typescript
// ✅ Good: Dynamic imports for large components
import dynamic from 'next/dynamic'

const HeavyComponent = dynamic(() => import('./heavy-component'), {
  loading: () => <div>Loading...</div>,
  ssr: false
})

// ✅ Good: Route-based code splitting (automatic with App Router)
app/
├── dashboard/
│   └── page.tsx     # Automatically code-split
├── packages/
│   └── page.tsx     # Automatically code-split
└── page.tsx         # Home page
```

### Image Optimization

```typescript
// ✅ Good: Use Next.js Image component
import Image from 'next/image'

<Image
  src={package.image}
  alt={package.title}
  width={400}
  height={300}
  className="rounded-lg"
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
/>

// ✅ Good: Responsive images
<Image
  src={package.image}
  alt={package.title}
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  className="object-cover"
/>
```

### Database Optimization

```typescript
// ✅ Good: Use select to limit fields
const packages = await prisma.package.findMany({
  select: {
    id: true,
    title: true,
    price: true,
    image: true
  }
})

// ✅ Good: Use pagination
const packages = await prisma.package.findMany({
  skip: (page - 1) * limit,
  take: limit,
  orderBy: { createdAt: 'desc' }
})

// ✅ Good: Use database indexes
// In schema.prisma
model Package {
  id       String @id @default(cuid())
  title    String
  category String
  price    Float
  
  @@index([category])
  @@index([price])
  @@index([category, price])
}
```

## 🚀 Deployment Guidelines

### Environment Configuration

```typescript
// ✅ Good: Validate environment variables
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1)
})

export const env = envSchema.parse(process.env)
```

### Build Optimization

```javascript
// next.config.js
const nextConfig = {
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons']
  },
  images: {
    formats: ['image/webp', 'image/avif'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com'
      }
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          }
        ]
      }
    ]
  }
}
```

## 📚 Resources

### Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Clerk Documentation](https://clerk.com/docs)

### Tools
- [VS Code Extensions](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)
- [Prisma Studio](https://www.prisma.io/studio)
- [React Developer Tools](https://react.dev/learn/react-developer-tools)

### Best Practices
- [React Best Practices](https://react.dev/learn/thinking-in-react)
- [TypeScript Best Practices](https://typescript-eslint.io/rules/)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Security Best Practices](https://owasp.org/www-project-top-ten/)

---

**Remember**: Code is read more often than it's written. Prioritize clarity and maintainability over cleverness.