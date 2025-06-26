import { NextRequest } from 'next/server'
import { createApiHandler } from '../../../lib/api/base-handler'
import { ResponseFormatter } from '../../../lib/api/response-formatter'
import { z } from 'zod'

// Input validation schemas
const createExampleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email format'),
  age: z.number().min(18, 'Must be at least 18').max(120, 'Invalid age'),
  category: z.enum(['personal', 'business', 'other']).optional()
})

const querySchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
  limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
  search: z.string().optional(),
  category: z.enum(['personal', 'business', 'other']).optional()
})

// Mock data for demonstration
const mockData = [
  { id: 1, name: 'John Doe', email: 'john@example.com', age: 30, category: 'personal' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25, category: 'business' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', age: 35, category: 'other' }
]

// GET handler - List examples with pagination and filtering
export const GET = createApiHandler(
  async (context) => {
    const { query } = context.validatedData || {}
    const page = query?.page || 1
    const limit = query?.limit || 10
    const search = query?.search
    const category = query?.category

    // Simulate database query with performance tracking
    const startTime = Date.now()
    
    // Filter data based on query parameters
    let filteredData = [...mockData]
    
    if (search) {
      filteredData = filteredData.filter(item => 
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.email.toLowerCase().includes(search.toLowerCase())
      )
    }
    
    if (category) {
      filteredData = filteredData.filter(item => item.category === category)
    }

    // Simulate pagination
    const total = filteredData.length
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedData = filteredData.slice(startIndex, endIndex)

    // Record database query performance
    const queryDuration = Date.now() - startTime
    context.performanceTracker?.recordDbQuery(
      `SELECT * FROM examples WHERE ... LIMIT ${limit} OFFSET ${startIndex}`,
      queryDuration
    )

    // Simulate cache operations
    const cacheKey = `examples:${page}:${limit}:${search || ''}:${category || ''}`
    if (Math.random() > 0.3) {
      context.performanceTracker?.recordCacheHit()
    } else {
      context.performanceTracker?.recordCacheMiss()
    }

    return ResponseFormatter.paginated(
      paginatedData,
      { page, limit, total },
      {
        message: `Found ${total} examples`,
        meta: {
          requestId: context.requestId,
          version: '1.0'
        }
      }
    )
  },
  {
    method: 'GET',
    validation: {
      query: querySchema
    },
    rateLimit: {
      requests: 100,
      window: 60000 // 1 minute
    },
    enablePerformanceMonitoring: true
  }
)

// POST handler - Create new example
export const POST = createApiHandler(
  async (context) => {
    const { body } = context.validatedData || {}
    
    if (!body) {
      return ResponseFormatter.badRequest('Request body is required')
    }

    // Simulate database operation
    const startTime = Date.now()
    
    // Check for duplicate email
    const existingItem = mockData.find(item => item.email === body.email)
    if (existingItem) {
      return ResponseFormatter.conflict('Email already exists', {
        field: 'email',
        details: { existingId: existingItem.id }
      })
    }

    // Create new item
    const newItem = {
      id: mockData.length + 1,
      ...body,
      category: body.category || 'other'
    }
    
    mockData.push(newItem)

    // Record database query performance
    const queryDuration = Date.now() - startTime
    context.performanceTracker?.recordDbQuery(
      'INSERT INTO examples (name, email, age, category) VALUES (?, ?, ?, ?)',
      queryDuration
    )

    return ResponseFormatter.created(
      newItem,
      {
        message: 'Example created successfully',
        location: `/api/example/${newItem.id}`,
        meta: {
          requestId: context.requestId
        }
      }
    )
  },
  {
    method: 'POST',
    requireAuth: true,
    validation: {
      body: createExampleSchema
    },
    rateLimit: {
      requests: 20,
      window: 60000 // 1 minute
    },
    enablePerformanceMonitoring: true
  }
)

// PUT handler - Update example (admin only)
export const PUT = createApiHandler(
  async (context) => {
    const { body } = context.validatedData || {}
    
    if (!body) {
      return ResponseFormatter.badRequest('Request body is required')
    }

    // Extract ID from URL (in a real app, you'd get this from route params)
    const url = new URL(context.request.url)
    const id = parseInt(url.searchParams.get('id') || '0', 10)
    
    if (!id) {
      return ResponseFormatter.badRequest('ID parameter is required')
    }

    // Simulate database operation
    const startTime = Date.now()
    
    const itemIndex = mockData.findIndex(item => item.id === id)
    if (itemIndex === -1) {
      return ResponseFormatter.notFound('Example not found')
    }

    // Update item
    mockData[itemIndex] = {
      ...mockData[itemIndex],
      ...body
    }

    // Record database query performance
    const queryDuration = Date.now() - startTime
    context.performanceTracker?.recordDbQuery(
      'UPDATE examples SET name = ?, email = ?, age = ?, category = ? WHERE id = ?',
      queryDuration
    )

    return ResponseFormatter.updated(
      mockData[itemIndex],
      {
        message: 'Example updated successfully',
        meta: {
          requestId: context.requestId
        }
      }
    )
  },
  {
    method: 'PUT',
    requireAuth: true,
    requiredRole: 'admin',
    validation: {
      body: createExampleSchema.partial() // Allow partial updates
    },
    rateLimit: {
      requests: 10,
      window: 60000 // 1 minute
    },
    enablePerformanceMonitoring: true
  }
)

// DELETE handler - Delete example (admin only)
export const DELETE = createApiHandler(
  async (context) => {
    // Extract ID from URL
    const url = new URL(context.request.url)
    const id = parseInt(url.searchParams.get('id') || '0', 10)
    
    if (!id) {
      return ResponseFormatter.badRequest('ID parameter is required')
    }

    // Simulate database operation
    const startTime = Date.now()
    
    const itemIndex = mockData.findIndex(item => item.id === id)
    if (itemIndex === -1) {
      return ResponseFormatter.notFound('Example not found')
    }

    // Delete item
    mockData.splice(itemIndex, 1)

    // Record database query performance
    const queryDuration = Date.now() - startTime
    context.performanceTracker?.recordDbQuery(
      'DELETE FROM examples WHERE id = ?',
      queryDuration
    )

    return ResponseFormatter.deleted({
      message: 'Example deleted successfully',
      meta: {
        requestId: context.requestId
      }
    })
  },
  {
    method: 'DELETE',
    requireAuth: true,
    requiredRole: 'admin',
    rateLimit: {
      requests: 5,
      window: 60000 // 1 minute
    },
    enablePerformanceMonitoring: true
  }
)