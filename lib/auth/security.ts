import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export type UserRole = 'admin' | 'staff' | 'customer';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  permissions: string[];
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { userId } = auth();
  
  if (!userId) {
    return null;
  }
  
  try {
    // Get user from database with role and permissions
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    });
    
    if (!user) {
      return null;
    }
    
    return {
      id: user.id,
      email: user.email,
      role: user.role?.name as UserRole || 'customer',
      permissions: user.role?.permissions?.map(p => p.name) || []
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/sign-in');
  }
  
  return user;
}

export async function requireRole(role: UserRole): Promise<AuthUser> {
  const user = await requireAuth();
  
  if (user.role !== role) {
    throw new Error('Insufficient permissions');
  }
  
  return user;
}

export async function requirePermission(permission: string): Promise<AuthUser> {
  const user = await requireAuth();
  
  if (!user.permissions.includes(permission)) {
    throw new Error('Insufficient permissions');
  }
  
  return user;
}

// Higher-order component for protecting pages
export function withAuth<T extends object>(
  Component: React.ComponentType<T>,
  requiredRole?: UserRole
) {
  return function AuthenticatedComponent(props: T) {
    const { useAuth, useUser, RedirectToSignIn } = require('@clerk/nextjs');
    const { isLoaded, isSignedIn } = useAuth();
    const { user } = useUser();
    
    if (!isLoaded) {
      return <div>Loading...</div>;
    }
    
    if (!isSignedIn) {
      return <RedirectToSignIn />;
    }
    
    if (requiredRole && user?.publicMetadata?.role !== requiredRole) {
      return <div>Access denied</div>;
    }
    
    return <Component {...props} />;
  };
}

// API Route Protection
export async function withApiAuth(
  handler: (req: NextRequest, user: AuthUser) => Promise<NextResponse>,
  options: {
    requiredRole?: UserRole;
    requiredPermission?: string;
  } = {}
) {
  return async (req: NextRequest) => {
    try {
      const { userId } = auth();
      
      if (!userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      const user = await getCurrentUser();
      
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      
      // Check role requirement
      if (options.requiredRole && user.role !== options.requiredRole) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
      
      // Check permission requirement
      if (options.requiredPermission && !user.permissions.includes(options.requiredPermission)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
      
      return await handler(req, user);
    } catch (error) {
      console.error('API Auth Error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

// Permission checking utilities
export function hasPermission(user: AuthUser, permission: string): boolean {
  return user.permissions.includes(permission);
}

export function hasRole(user: AuthUser, role: UserRole): boolean {
  return user.role === role;
}

export function hasAnyRole(user: AuthUser, roles: UserRole[]): boolean {
  return roles.includes(user.role);
}

export function hasAnyPermission(user: AuthUser, permissions: string[]): boolean {
  return permissions.some(permission => user.permissions.includes(permission));
}

// Admin utilities
export async function requireAdmin(): Promise<AuthUser> {
  return requireRole('admin');
}

export async function requireStaff(): Promise<AuthUser> {
  const user = await requireAuth();
  
  if (!hasAnyRole(user, ['admin', 'staff'])) {
    throw new Error('Staff access required');
  }
  
  return user;
}

// Session management
export async function invalidateUserSessions(userId: string): Promise<void> {
  // This would typically involve invalidating sessions in your session store
  // For Clerk, you might need to use their API to revoke sessions
  console.log(`Invalidating sessions for user: ${userId}`);
}

// Audit logging for authentication events
export async function logAuthEvent(
  userId: string,
  event: 'login' | 'logout' | 'permission_denied' | 'role_change',
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action: event,
        resource: 'auth',
        metadata,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Failed to log auth event:', error);
  }
}