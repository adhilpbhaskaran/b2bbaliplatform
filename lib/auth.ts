import { auth, currentUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { db } from './db'
import { UserRole, UserStatus } from '@prisma/client'

// Get current authenticated user
export async function getCurrentUser() {
  const { userId } = auth()
  
  if (!userId) {
    return null
  }
  
  const clerkUser = await currentUser()
  
  if (!clerkUser) {
    return null
  }
  
  // Find or create user in database
  let user = await db.user.findUnique({
    where: { clerkId: userId },
    include: {
      agent: true,
      admin: true,
    },
  })
  
  if (!user) {
    // Create new user if doesn't exist
    user = await db.user.create({
      data: {
        clerkId: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        firstName: clerkUser.firstName || '',
        lastName: clerkUser.lastName || '',
        avatar: clerkUser.imageUrl,
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
      },
      include: {
        agent: true,
        admin: true,
      },
    })
  }
  
  return user
}

// Require authentication
export async function requireAuth() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/sign-in')
  }
  
  return user
}

// Require specific role
export async function requireRole(allowedRoles: UserRole[]) {
  const user = await requireAuth()
  
  if (!allowedRoles.includes(user.role)) {
    redirect('/unauthorized')
  }
  
  return user
}

// Require admin access
export async function requireAdmin() {
  return await requireRole([UserRole.ADMIN, UserRole.SUPER_ADMIN])
}

// Require agent access
export async function requireAgent() {
  return await requireRole([UserRole.AGENT, UserRole.ADMIN, UserRole.SUPER_ADMIN])
}

// Check if user has permission
export async function hasPermission(permission: string) {
  const user = await getCurrentUser()
  
  if (!user) {
    return false
  }
  
  // Define role-based permissions
  const rolePermissions: Record<UserRole, string[]> = {
    [UserRole.CUSTOMER]: [
      'view:packages',
      'create:quote',
      'view:own-quotes',
      'view:own-bookings',
      'create:review',
    ],
    [UserRole.AGENT]: [
      'view:packages',
      'create:package',
      'edit:own-packages',
      'view:quotes',
      'edit:quotes',
      'view:bookings',
      'edit:bookings',
      'view:commissions',
    ],
    [UserRole.ADMIN]: [
      'view:*',
      'create:*',
      'edit:*',
      'delete:*',
      'manage:users',
      'manage:agents',
      'view:analytics',
    ],
    [UserRole.SUPER_ADMIN]: [
      'view:*',
      'create:*',
      'edit:*',
      'delete:*',
      'manage:*',
      'system:*',
    ],
  }
  
  const userPermissions = rolePermissions[user.role] || []
  
  return (
    userPermissions.includes(permission) ||
    userPermissions.includes('*') ||
    userPermissions.some(p => p.endsWith(':*') && permission.startsWith(p.split(':')[0]))
  )
}

// Check if user can access resource
export async function canAccessResource(
  resourceType: string,
  resourceId: string,
  action: 'view' | 'edit' | 'delete' = 'view'
) {
  const user = await getCurrentUser()
  
  if (!user) {
    return false
  }
  
  // Super admin can access everything
  if (user.role === UserRole.SUPER_ADMIN) {
    return true
  }
  
  // Admin can access most things
  if (user.role === UserRole.ADMIN) {
    return true
  }
  
  // Check resource-specific permissions
  switch (resourceType) {
    case 'package':
      if (user.role === UserRole.AGENT) {
        const pkg = await db.package.findUnique({
          where: { id: resourceId },
          select: { agentId: true },
        })
        return pkg?.agentId === user.agent?.id
      }
      return action === 'view'
      
    case 'quote':
      const quote = await db.quote.findUnique({
        where: { id: resourceId },
        select: { customerId: true, agentId: true },
      })
      
      if (user.role === UserRole.CUSTOMER) {
        return quote?.customerId === user.id && action === 'view'
      }
      
      if (user.role === UserRole.AGENT) {
        return quote?.agentId === user.agent?.id
      }
      
      return false
      
    case 'booking':
      const booking = await db.booking.findUnique({
        where: { id: resourceId },
        select: { customerId: true, agentId: true },
      })
      
      if (user.role === UserRole.CUSTOMER) {
        return booking?.customerId === user.id && action === 'view'
      }
      
      if (user.role === UserRole.AGENT) {
        return booking?.agentId === user.agent?.id
      }
      
      return false
      
    default:
      return false
  }
}

// Get user's tier level
export async function getUserTier() {
  const user = await getCurrentUser()
  
  if (!user) {
    return null
  }
  
  return user.tier
}

// Check if user is active
export async function isUserActive() {
  const user = await getCurrentUser()
  
  if (!user) {
    return false
  }
  
  return user.status === UserStatus.ACTIVE && user.isActive
}

// Update user's last activity
export async function updateUserActivity() {
  const user = await getCurrentUser()
  
  if (!user) {
    return
  }
  
  await db.user.update({
    where: { id: user.id },
    data: { updatedAt: new Date() },
  })
}

// Create activity log
export async function createActivityLog(
  type: string,
  description: string,
  metadata?: Record<string, any>
) {
  const user = await getCurrentUser()
  
  if (!user) {
    return
  }
  
  await db.activity.create({
    data: {
      type,
      description,
      metadata,
      userId: user.id,
    },
  })
}

// Session helpers
export async function createUserSession(userId: string) {
  // This would typically involve creating a session record
  // For now, we'll just update the user's last login
  await db.user.update({
    where: { id: userId },
    data: { updatedAt: new Date() },
  })
}

export async function destroyUserSession(userId: string) {
  // This would typically involve destroying the session record
  // For now, we'll just log the activity
  await createActivityLog('USER_LOGOUT', 'User logged out')
}

// Rate limiting helpers
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const key = identifier
  
  const record = rateLimitMap.get(key)
  
  if (!record || now > record.resetTime) {
    // Reset or create new record
    const resetTime = now + windowMs
    rateLimitMap.set(key, { count: 1, resetTime })
    return { allowed: true, remaining: limit - 1, resetTime }
  }
  
  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime }
  }
  
  record.count++
  return {
    allowed: true,
    remaining: limit - record.count,
    resetTime: record.resetTime,
  }
}

export function clearRateLimit(identifier: string) {
  rateLimitMap.delete(identifier)
}