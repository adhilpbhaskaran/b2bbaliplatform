# Testing Guide

This guide covers testing strategies, patterns, and best practices for the Bali DMC project.

## 🧪 Testing Strategy

### Testing Pyramid

```
        E2E Tests (Few)
       /              \
    Integration Tests (Some)
   /                        \
Unit Tests (Many)           Component Tests (Many)
```

### Test Types

1. **Unit Tests** (70%)
   - Individual functions and utilities
   - Business logic
   - API route handlers
   - Custom hooks

2. **Component Tests** (20%)
   - React component behavior
   - User interactions
   - Accessibility
   - Visual regression

3. **Integration Tests** (8%)
   - API endpoints
   - Database operations
   - Third-party integrations

4. **End-to-End Tests** (2%)
   - Critical user journeys
   - Cross-browser compatibility
   - Performance testing

## 🛠️ Testing Tools

### Core Testing Stack

- **Jest**: Test runner and assertion library
- **React Testing Library**: Component testing
- **Playwright**: End-to-end testing
- **MSW**: API mocking
- **Prisma Mock**: Database mocking
- **Testing Library User Event**: User interaction simulation

### Additional Tools

- **Storybook**: Component documentation and testing
- **Chromatic**: Visual regression testing
- **Lighthouse CI**: Performance testing
- **Axe**: Accessibility testing

## 📁 Test Structure

```
__tests__/
├── components/           # Component tests
│   ├── ui/              # UI component tests
│   ├── forms/           # Form component tests
│   └── layout/          # Layout component tests
├── pages/               # Page component tests
├── api/                 # API route tests
├── lib/                 # Utility function tests
├── hooks/               # Custom hook tests
├── e2e/                 # End-to-end tests
├── fixtures/            # Test data
├── mocks/               # Mock implementations
└── utils/               # Test utilities
```

## 🔧 Test Configuration

### Jest Configuration

```javascript
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './'
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1'
  },
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    'app/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testMatch: [
    '**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/__tests__/e2e/'
  ]
}

module.exports = createJestConfig(customJestConfig)
```

### Jest Setup

```javascript
// jest.setup.js
import '@testing-library/jest-dom'
import { server } from './__tests__/mocks/server'
import { TextEncoder, TextDecoder } from 'util'

// Polyfills
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/'
  })
}))

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn()
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams()
}))

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
    userId: 'user_123'
  }),
  useUser: () => ({
    isLoaded: true,
    user: {
      id: 'user_123',
      firstName: 'John',
      lastName: 'Doe',
      emailAddresses: [{ emailAddress: 'john@example.com' }]
    }
  }),
  SignedIn: ({ children }) => children,
  SignedOut: () => null,
  RedirectToSignIn: () => null
}))

// Setup MSW
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}))
```

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] }
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI
  }
})
```

## 🧩 Unit Testing

### Testing Utilities

```typescript
// __tests__/lib/utils.test.ts
import {
  formatPrice,
  formatDate,
  generateSlug,
  calculateDuration,
  validateEmail
} from '@/lib/utils'

describe('Utils', () => {
  describe('formatPrice', () => {
    it('formats USD currency correctly', () => {
      expect(formatPrice(1234.56, 'USD')).toBe('$1,234.56')
    })

    it('formats IDR currency correctly', () => {
      expect(formatPrice(1000000, 'IDR')).toBe('Rp 1,000,000')
    })

    it('handles zero values', () => {
      expect(formatPrice(0, 'USD')).toBe('$0.00')
    })

    it('handles negative values', () => {
      expect(formatPrice(-100, 'USD')).toBe('-$100.00')
    })
  })

  describe('formatDate', () => {
    it('formats date correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      expect(formatDate(date)).toBe('January 15, 2024')
    })

    it('formats date with custom format', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      expect(formatDate(date, 'short')).toBe('Jan 15, 2024')
    })
  })

  describe('generateSlug', () => {
    it('converts title to slug', () => {
      expect(generateSlug('Bali Cultural Experience')).toBe('bali-cultural-experience')
    })

    it('handles special characters', () => {
      expect(generateSlug('Package #1: Ubud & Temples')).toBe('package-1-ubud-temples')
    })

    it('handles multiple spaces', () => {
      expect(generateSlug('Multiple   Spaces   Here')).toBe('multiple-spaces-here')
    })

    it('handles empty string', () => {
      expect(generateSlug('')).toBe('')
    })
  })

  describe('calculateDuration', () => {
    it('calculates duration in days', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-01-05')
      expect(calculateDuration(start, end)).toBe(4)
    })

    it('handles same day', () => {
      const date = new Date('2024-01-01')
      expect(calculateDuration(date, date)).toBe(0)
    })
  })

  describe('validateEmail', () => {
    it('validates correct email', () => {
      expect(validateEmail('test@example.com')).toBe(true)
    })

    it('rejects invalid email', () => {
      expect(validateEmail('invalid-email')).toBe(false)
    })

    it('rejects empty string', () => {
      expect(validateEmail('')).toBe(false)
    })
  })
})
```

### Testing Custom Hooks

```typescript
// __tests__/hooks/use-packages.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { usePackages } from '@/hooks/use-packages'
import { server } from '../mocks/server'
import { rest } from 'msw'

describe('usePackages', () => {
  it('fetches packages successfully', async () => {
    const { result } = renderHook(() => usePackages())

    expect(result.current.loading).toBe(true)
    expect(result.current.packages).toEqual([])
    expect(result.current.error).toBe(null)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.packages).toHaveLength(2)
    expect(result.current.error).toBe(null)
  })

  it('handles fetch error', async () => {
    server.use(
      rest.get('/api/packages', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Server error' }))
      })
    )

    const { result } = renderHook(() => usePackages())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.packages).toEqual([])
    expect(result.current.error).toBe('Server error')
  })

  it('refetches packages', async () => {
    const { result } = renderHook(() => usePackages())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.packages).toHaveLength(2)

    // Trigger refetch
    result.current.refetch()

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.packages).toHaveLength(2)
  })
})
```

### Testing API Routes

```typescript
// __tests__/api/packages.test.ts
import { createMocks } from 'node-mocks-http'
import { GET, POST } from '@/app/api/packages/route'
import { prismaMock } from '../mocks/prisma'

// Mock Clerk auth
jest.mock('@clerk/nextjs', () => ({
  auth: () => ({ userId: 'user_123' })
}))

describe('/api/packages', () => {
  describe('GET', () => {
    it('returns packages list', async () => {
      const mockPackages = [
        {
          id: '1',
          title: 'Bali Cultural Tour',
          price: 150,
          duration: 3,
          category: 'cultural'
        },
        {
          id: '2',
          title: 'Adventure Package',
          price: 200,
          duration: 5,
          category: 'adventure'
        }
      ]

      prismaMock.package.findMany.mockResolvedValue(mockPackages)

      const request = new Request('http://localhost:3000/api/packages')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockPackages)
    })

    it('filters packages by category', async () => {
      const mockPackages = [
        {
          id: '1',
          title: 'Cultural Tour',
          category: 'cultural'
        }
      ]

      prismaMock.package.findMany.mockResolvedValue(mockPackages)

      const request = new Request('http://localhost:3000/api/packages?category=cultural')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual(mockPackages)
      expect(prismaMock.package.findMany).toHaveBeenCalledWith({
        where: { category: 'cultural' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' }
      })
    })

    it('handles database error', async () => {
      prismaMock.package.findMany.mockRejectedValue(new Error('Database error'))

      const request = new Request('http://localhost:3000/api/packages')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('POST', () => {
    it('creates new package', async () => {
      const newPackage = {
        title: 'New Package',
        description: 'Test description',
        price: 100,
        duration: 2,
        category: 'adventure'
      }

      const createdPackage = {
        id: '3',
        ...newPackage,
        slug: 'new-package',
        createdAt: new Date()
      }

      prismaMock.package.create.mockResolvedValue(createdPackage)

      const request = new Request('http://localhost:3000/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPackage)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(createdPackage)
    })

    it('validates required fields', async () => {
      const invalidPackage = {
        title: '', // Invalid: empty title
        price: -10 // Invalid: negative price
      }

      const request = new Request('http://localhost:3000/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPackage)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('validation')
    })

    it('requires authentication', async () => {
      // Mock unauthenticated user
      jest.mocked(require('@clerk/nextjs').auth).mockReturnValue({ userId: null })

      const request = new Request('http://localhost:3000/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
    })
  })
})
```

## 🎭 Component Testing

### Testing UI Components

```typescript
// __tests__/components/ui/button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>)
    
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('bg-primary')
  })

  it('renders different variants', () => {
    const { rerender } = render(<Button variant="destructive">Delete</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-destructive')

    rerender(<Button variant="outline">Cancel</Button>)
    expect(screen.getByRole('button')).toHaveClass('border')
  })

  it('renders different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-9')

    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-11')
  })

  it('handles click events', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()
    
    render(<Button onClick={handleClick}>Click me</Button>)
    
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('shows loading state', () => {
    render(<Button loading>Loading</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('opacity-50')
  })

  it('renders as different HTML elements', () => {
    render(<Button asChild><a href="/test">Link</a></Button>)
    
    const link = screen.getByRole('link')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/test')
  })

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLButtonElement>()
    render(<Button ref={ref}>Button</Button>)
    
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('applies custom className', () => {
    render(<Button className="custom-class">Button</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
    expect(button).toHaveClass('bg-primary') // Still has default classes
  })
})
```

### Testing Forms

```typescript
// __tests__/components/contact-form.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContactForm } from '@/components/contact-form'
import { server } from '../mocks/server'
import { rest } from 'msw'

// Mock toast
const mockToast = jest.fn()
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}))

describe('ContactForm', () => {
  beforeEach(() => {
    mockToast.mockClear()
  })

  it('renders all form fields', () => {
    render(<ContactForm />)
    
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<ContactForm />)
    
    const submitButton = screen.getByRole('button', { name: /send message/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/message is required/i)).toBeInTheDocument()
    })
  })

  it('validates email format', async () => {
    const user = userEvent.setup()
    render(<ContactForm />)
    
    const emailInput = screen.getByLabelText(/email/i)
    await user.type(emailInput, 'invalid-email')
    
    const submitButton = screen.getByRole('button', { name: /send message/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
    })
  })

  it('submits form successfully', async () => {
    const user = userEvent.setup()
    render(<ContactForm />)
    
    // Fill out form
    await user.type(screen.getByLabelText(/name/i), 'John Doe')
    await user.type(screen.getByLabelText(/email/i), 'john@example.com')
    await user.type(screen.getByLabelText(/message/i), 'Hello, I need help with booking.')
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /send message/i }))
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Message sent successfully',
        description: 'We\'ll get back to you soon.'
      })
    })
    
    // Form should be reset
    expect(screen.getByLabelText(/name/i)).toHaveValue('')
    expect(screen.getByLabelText(/email/i)).toHaveValue('')
    expect(screen.getByLabelText(/message/i)).toHaveValue('')
  })

  it('handles submission error', async () => {
    const user = userEvent.setup()
    
    // Mock API error
    server.use(
      rest.post('/api/contact', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Server error' }))
      })
    )
    
    render(<ContactForm />)
    
    // Fill and submit form
    await user.type(screen.getByLabelText(/name/i), 'John Doe')
    await user.type(screen.getByLabelText(/email/i), 'john@example.com')
    await user.type(screen.getByLabelText(/message/i), 'Test message')
    await user.click(screen.getByRole('button', { name: /send message/i }))
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error sending message',
        description: 'Please try again later.',
        variant: 'destructive'
      })
    })
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    
    // Mock slow API response
    server.use(
      rest.post('/api/contact', (req, res, ctx) => {
        return res(ctx.delay(1000), ctx.json({ success: true }))
      })
    )
    
    render(<ContactForm />)
    
    // Fill and submit form
    await user.type(screen.getByLabelText(/name/i), 'John Doe')
    await user.type(screen.getByLabelText(/email/i), 'john@example.com')
    await user.type(screen.getByLabelText(/message/i), 'Test message')
    
    const submitButton = screen.getByRole('button', { name: /send message/i })
    await user.click(submitButton)
    
    // Button should show loading state
    expect(submitButton).toBeDisabled()
    expect(screen.getByText(/sending/i)).toBeInTheDocument()
  })

  it('is accessible', async () => {
    const { container } = render(<ContactForm />)
    
    // Check for proper labels
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument()
    
    // Check for form structure
    const form = container.querySelector('form')
    expect(form).toBeInTheDocument()
    
    // Check for proper ARIA attributes
    const nameInput = screen.getByLabelText(/name/i)
    expect(nameInput).toHaveAttribute('aria-required', 'true')
  })
})
```

## 🎬 End-to-End Testing

### Critical User Journeys

```typescript
// __tests__/e2e/booking-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('complete booking journey', async ({ page }) => {
    // Navigate to packages
    await page.click('text=Packages')
    await expect(page).toHaveURL('/packages')

    // Filter packages
    await page.selectOption('[data-testid="category-filter"]', 'cultural')
    await page.waitForLoadState('networkidle')

    // Select a package
    await page.click('[data-testid="package-card"]:first-child')
    await expect(page.locator('h1')).toContainText('Bali Cultural Experience')

    // Start booking
    await page.click('text=Book Now')
    await expect(page).toHaveURL(/\/book\/.*$/)

    // Fill booking form
    await page.fill('[name="firstName"]', 'John')
    await page.fill('[name="lastName"]', 'Doe')
    await page.fill('[name="email"]', 'john@example.com')
    await page.fill('[name="phone"]', '+1234567890')
    await page.selectOption('[name="groupSize"]', '2')
    await page.fill('[name="startDate"]', '2024-06-01')
    await page.fill('[name="specialRequests"]', 'Vegetarian meals please')

    // Proceed to payment
    await page.click('text=Proceed to Payment')
    await expect(page.locator('text=Payment Details')).toBeVisible()

    // Fill payment details (test mode)
    await page.fill('[data-testid="card-number"]', '4242424242424242')
    await page.fill('[data-testid="card-expiry"]', '12/25')
    await page.fill('[data-testid="card-cvc"]', '123')
    await page.fill('[data-testid="card-name"]', 'John Doe')

    // Complete booking
    await page.click('text=Complete Booking')
    
    // Wait for success page
    await expect(page.locator('text=Booking Confirmed')).toBeVisible()
    await expect(page.locator('[data-testid="booking-reference"]')).toBeVisible()

    // Check confirmation email notification
    await expect(page.locator('text=confirmation email')).toBeVisible()
  })

  test('handles payment failure gracefully', async ({ page }) => {
    // Navigate to booking
    await page.goto('/packages/bali-cultural-experience')
    await page.click('text=Book Now')

    // Fill booking form
    await page.fill('[name="firstName"]', 'John')
    await page.fill('[name="lastName"]', 'Doe')
    await page.fill('[name="email"]', 'john@example.com')
    await page.fill('[name="phone"]', '+1234567890')
    await page.selectOption('[name="groupSize"]', '2')
    await page.fill('[name="startDate"]', '2024-06-01')

    await page.click('text=Proceed to Payment')

    // Use declined card
    await page.fill('[data-testid="card-number"]', '4000000000000002')
    await page.fill('[data-testid="card-expiry"]', '12/25')
    await page.fill('[data-testid="card-cvc"]', '123')
    await page.fill('[data-testid="card-name"]', 'John Doe')

    await page.click('text=Complete Booking')

    // Should show error message
    await expect(page.locator('text=Payment failed')).toBeVisible()
    await expect(page.locator('text=Please try again')).toBeVisible()

    // Should stay on payment page
    await expect(page.locator('text=Payment Details')).toBeVisible()
  })

  test('validates form fields', async ({ page }) => {
    await page.goto('/packages/bali-cultural-experience')
    await page.click('text=Book Now')

    // Try to submit without filling required fields
    await page.click('text=Proceed to Payment')

    // Should show validation errors
    await expect(page.locator('text=First name is required')).toBeVisible()
    await expect(page.locator('text=Email is required')).toBeVisible()
    await expect(page.locator('text=Phone is required')).toBeVisible()
  })

  test('calculates pricing correctly', async ({ page }) => {
    await page.goto('/packages/bali-cultural-experience')
    await page.click('text=Book Now')

    // Fill basic info
    await page.fill('[name="firstName"]', 'John')
    await page.fill('[name="lastName"]', 'Doe')
    await page.fill('[name="email"]', 'john@example.com')
    await page.fill('[name="phone"]', '+1234567890')
    await page.fill('[name="startDate"]', '2024-06-01')

    // Change group size and verify price update
    await page.selectOption('[name="groupSize"]', '1')
    await expect(page.locator('[data-testid="total-price"]')).toContainText('$150')

    await page.selectOption('[name="groupSize"]', '2')
    await expect(page.locator('[data-testid="total-price"]')).toContainText('$300')

    await page.selectOption('[name="groupSize"]', '4')
    await expect(page.locator('[data-testid="total-price"]')).toContainText('$600')
  })
})
```

### Authentication Flow

```typescript
// __tests__/e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('user can sign up and sign in', async ({ page }) => {
    // Go to sign up page
    await page.goto('/sign-up')
    
    // Fill sign up form
    await page.fill('[name="firstName"]', 'John')
    await page.fill('[name="lastName"]', 'Doe')
    await page.fill('[name="emailAddress"]', 'john.doe@example.com')
    await page.fill('[name="password"]', 'SecurePassword123!')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('text=Welcome, John')).toBeVisible()
    
    // Sign out
    await page.click('[data-testid="user-menu"]')
    await page.click('text=Sign Out')
    
    // Should redirect to home
    await expect(page).toHaveURL('/')
    
    // Sign in again
    await page.goto('/sign-in')
    await page.fill('[name="emailAddress"]', 'john.doe@example.com')
    await page.fill('[name="password"]', 'SecurePassword123!')
    await page.click('button[type="submit"]')
    
    // Should be signed in
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('text=Welcome, John')).toBeVisible()
  })

  test('protects authenticated routes', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto('/dashboard')
    
    // Should redirect to sign in
    await expect(page).toHaveURL('/sign-in')
  })

  test('handles invalid credentials', async ({ page }) => {
    await page.goto('/sign-in')
    
    await page.fill('[name="emailAddress"]', 'invalid@example.com')
    await page.fill('[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    // Should show error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible()
    
    // Should stay on sign in page
    await expect(page).toHaveURL('/sign-in')
  })
})
```

## 🎨 Visual Testing

### Storybook Integration

```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/nextjs'

const config: StorybookConfig = {
  stories: ['../components/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@storybook/addon-viewport',
    '@storybook/addon-docs'
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {}
  },
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript'
  }
}

export default config
```

```typescript
// components/ui/button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './button'

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link']
    },
    size: {
      control: { type: 'select' },
      options: ['default', 'sm', 'lg', 'icon']
    }
  }
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'Button'
  }
}

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Delete'
  }
}

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Cancel'
  }
}

export const Loading: Story = {
  args: {
    loading: true,
    children: 'Please wait'
  }
}

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled'
  }
}

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 12l-4-4h8l-4 4z" />
        </svg>
        Download
      </>
    )
  }
}
```

## 📊 Test Coverage

### Coverage Configuration

```javascript
// jest.config.js (coverage section)
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  },
  './lib/**/*.ts': {
    branches: 90,
    functions: 90,
    lines: 90,
    statements: 90
  },
  './components/**/*.tsx': {
    branches: 75,
    functions: 75,
    lines: 75,
    statements: 75
  }
},
coverageReporters: ['text', 'lcov', 'html'],
collectCoverageFrom: [
  'components/**/*.{js,jsx,ts,tsx}',
  'lib/**/*.{js,jsx,ts,tsx}',
  'hooks/**/*.{js,jsx,ts,tsx}',
  'app/**/*.{js,jsx,ts,tsx}',
  '!**/*.d.ts',
  '!**/node_modules/**',
  '!**/*.stories.{js,jsx,ts,tsx}',
  '!**/coverage/**'
]
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- button.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="validation"

# Run E2E tests
npm run test:e2e

# Run E2E tests in UI mode
npm run test:e2e:ui

# Run Storybook
npm run storybook

# Build Storybook
npm run build-storybook
```

## 🚀 Continuous Integration

### GitHub Actions Test Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      
      - name: Setup test database
        run: |
          npx prisma migrate deploy
          npx prisma db seed
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
      
      - name: Run linting
        run: npm run lint
      
      - name: Run type checking
        run: npm run type-check
      
      - name: Run unit tests
        run: npm run test:ci
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
      
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

## 📚 Best Practices

### Test Organization

1. **Follow AAA Pattern**: Arrange, Act, Assert
2. **One assertion per test**: Keep tests focused
3. **Descriptive test names**: Explain what is being tested
4. **Use data-testid**: For reliable element selection
5. **Mock external dependencies**: Keep tests isolated
6. **Test user behavior**: Not implementation details

### Performance Testing

```typescript
// __tests__/performance/lighthouse.test.ts
import { test, expect } from '@playwright/test'

test.describe('Performance', () => {
  test('homepage meets performance targets', async ({ page }) => {
    await page.goto('/')
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle')
    
    // Check Core Web Vitals
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          resolve(entries)
        }).observe({ entryTypes: ['navigation', 'paint'] })
      })
    })
    
    // Assert performance metrics
    expect(metrics).toBeDefined()
  })
})
```

### Accessibility Testing

```typescript
// __tests__/accessibility/a11y.test.ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility', () => {
  test('homepage is accessible', async ({ page }) => {
    await page.goto('/')
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    
    expect(accessibilityScanResults.violations).toEqual([])
  })
  
  test('contact form is accessible', async ({ page }) => {
    await page.goto('/contact')
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('#contact-form')
      .analyze()
    
    expect(accessibilityScanResults.violations).toEqual([])
  })
})
```

---

**Remember**: Good tests are your safety net. Write tests that give you confidence to refactor and deploy with peace of mind.