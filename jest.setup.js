import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn()
      },
      isFallback: false,
      isLocaleDomain: true,
      isReady: true,
      defaultLocale: 'en',
      domainLocales: [],
      isPreview: false
    }
  }
}))

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn()
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  }
}))

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  useUser: () => ({
    user: {
      id: 'test-user-id',
      firstName: 'Test',
      lastName: 'User',
      emailAddresses: [{ emailAddress: 'test@example.com' }]
    },
    isLoaded: true,
    isSignedIn: true
  }),
  useAuth: () => ({
    userId: 'test-user-id',
    sessionId: 'test-session-id',
    getToken: jest.fn().mockResolvedValue('test-token'),
    isLoaded: true,
    isSignedIn: true,
    signOut: jest.fn()
  }),
  ClerkProvider: ({ children }) => children,
  SignInButton: ({ children }) => children,
  SignUpButton: ({ children }) => children,
  UserButton: () => <div>User Button</div>,
  RedirectToSignIn: () => <div>Redirect to Sign In</div>
}))

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, init) => {
    const request = {
      url,
      method: init?.method || 'GET',
      headers: new Map(Object.entries(init?.headers || {})),
      json: jest.fn().mockResolvedValue(init?.body ? JSON.parse(init.body) : {}),
      text: jest.fn().mockResolvedValue(init?.body || ''),
      formData: jest.fn().mockResolvedValue(new FormData()),
      ip: '127.0.0.1',
      nextUrl: {
        pathname: new URL(url).pathname,
        searchParams: new URL(url).searchParams
      }
    }
    return request
  }),
  NextResponse: {
    json: jest.fn().mockImplementation((data, init) => ({
      status: init?.status || 200,
      headers: new Map(Object.entries(init?.headers || {})),
      json: jest.fn().mockResolvedValue(data)
    })),
    redirect: jest.fn().mockImplementation((url, status) => ({
      status: status || 302,
      headers: new Map([['Location', url]])
    })),
    next: jest.fn().mockImplementation(() => ({
      status: 200,
      headers: new Map()
    }))
  }
}))

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'test-clerk-key'
process.env.CLERK_SECRET_KEY = 'test-clerk-secret'
process.env.DATABASE_URL = 'test-database-url'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

// Mock fetch
global.fetch = jest.fn()

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

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
})

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn()
})

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
})

// Suppress console errors during tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})