import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    email: string
    role: string
    agentId?: string
    adminId?: string
  }
}

export async function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
  options: {
    requireRole?: string[]
    requireAgent?: boolean
    requireAdmin?: boolean
  } = {}
) {
  return async (req: NextRequest) => {
    try {
      // Try Clerk authentication first
      const { userId } = auth()
      
      if (userId) {
        // Get user from database
        const user = await prisma.user.findUnique({
          where: { clerkId: userId },
          include: {
            agent: true,
            admin: true
          }
        })

        if (!user) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          )
        }

        // Check role requirements
        if (options.requireRole && !options.requireRole.includes(user.role)) {
          return NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403 }
          )
        }

        if (options.requireAgent && !user.agent) {
          return NextResponse.json(
            { error: 'Agent access required' },
            { status: 403 }
          )
        }

        if (options.requireAdmin && !user.admin) {
          return NextResponse.json(
            { error: 'Admin access required' },
            { status: 403 }
          )
        }

        // Attach user to request
        const authenticatedReq = req as AuthenticatedRequest
        authenticatedReq.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          agentId: user.agent?.id,
          adminId: user.admin?.id
        }

        return handler(authenticatedReq)
      }

      // Fallback to JWT authentication for API compatibility
      const authHeader = req.headers.get('authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      const token = authHeader.substring(7)
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

      const user = await prisma.user.findUnique({
        where: { id: decoded.sub },
        include: {
          agent: true,
          admin: true
        }
      })

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      // Check role requirements
      if (options.requireRole && !options.requireRole.includes(user.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }

      if (options.requireAgent && !user.agent) {
        return NextResponse.json(
          { error: 'Agent access required' },
          { status: 403 }
        )
      }

      if (options.requireAdmin && !user.admin) {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        )
      }

      // Attach user to request
      const authenticatedReq = req as AuthenticatedRequest
      authenticatedReq.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        agentId: user.agent?.id,
        adminId: user.admin?.id
      }

      return handler(authenticatedReq)
    } catch (error) {
      console.error('Authentication error:', error)
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    }
  }
}

export function withAgent(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return withAuth(handler, { requireRole: ['AGENT', 'ADMIN'], requireAgent: true })
}

export function withAdmin(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return withAuth(handler, { requireRole: ['ADMIN'], requireAdmin: true })
}

export function withCustomer(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return withAuth(handler, { requireRole: ['CUSTOMER', 'AGENT', 'ADMIN'] })
}

// Utility function to get current user
export async function getCurrentUser(req: NextRequest) {
  try {
    const { userId } = auth()
    
    if (userId) {
      return await prisma.user.findUnique({
        where: { clerkId: userId },
        include: {
          agent: true,
          admin: true
        }
      })
    }

    // Fallback to JWT
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    return await prisma.user.findUnique({
      where: { id: decoded.sub },
      include: {
        agent: true,
        admin: true
      }
    })
  } catch (error) {
    return null
  }
}

// Error handling utility
export function handleApiError(error: any) {
  console.error('API Error:', error)
  
  if (error.code === 'P2002') {
    return NextResponse.json(
      { error: 'Resource already exists' },
      { status: 409 }
    )
  }
  
  if (error.code === 'P2025') {
    return NextResponse.json(
      { error: 'Resource not found' },
      { status: 404 }
    )
  }
  
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}

// Validation utility
export function validateRequest(data: any, schema: any) {
  try {
    return schema.parse(data)
  } catch (error) {
    throw new Error(`Validation failed: ${error}`)
  }
}

// Pagination utility
export function getPaginationParams(req: NextRequest) {
  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '10')
  const skip = (page - 1) * limit
  
  return { page, limit, skip }
}

// Response formatting utility
export function formatPaginatedResponse<T>(data: T[], total: number, page: number, limit: number) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  }
}