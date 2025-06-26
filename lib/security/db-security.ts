import { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';

// Row-level security helper
export async function getUserBookings(userId: string) {
  return prisma.booking.findMany({
    where: {
      userId: userId, // Ensure user can only access their own bookings
      deletedAt: null // Soft delete check
    },
    select: {
      id: true,
      packageId: true,
      status: true,
      startDate: true,
      endDate: true,
      totalPrice: true,
      createdAt: true,
      updatedAt: true,
      // Exclude sensitive fields like payment details
      package: {
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          images: true
        }
      }
    }
  });
}

// Secure user data retrieval
export async function getUserProfile(userId: string, requestingUserId: string) {
  // Users can only access their own profile unless they're admin
  if (userId !== requestingUserId) {
    const requestingUser = await prisma.user.findUnique({
      where: { id: requestingUserId },
      include: { role: true }
    });
    
    if (!requestingUser || requestingUser.role?.name !== 'admin') {
      throw new Error('Unauthorized access to user profile');
    }
  }
  
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
      // Exclude sensitive fields
      role: {
        select: {
          name: true,
          permissions: {
            select: {
              name: true
            }
          }
        }
      }
    }
  });
}

// Audit logging
export async function logUserAction(
  userId: string,
  action: string,
  resource: string,
  metadata?: Record<string, any>
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        metadata,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Failed to log user action:', error);
    // Don't throw error to avoid breaking the main operation
  }
}

// Enhanced audit logging with context
export async function logSecurityEvent(
  userId: string | null,
  eventType: 'login' | 'logout' | 'failed_login' | 'permission_denied' | 'data_access' | 'data_modification' | 'suspicious_activity',
  details: {
    resource?: string;
    action?: string;
    ipAddress?: string;
    userAgent?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    metadata?: Record<string, any>;
  }
) {
  try {
    await prisma.securityLog.create({
      data: {
        userId,
        eventType,
        resource: details.resource || 'unknown',
        action: details.action || 'unknown',
        ipAddress: details.ipAddress,
        userAgent: details.userAgent,
        severity: details.severity || 'medium',
        metadata: details.metadata,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

// Data anonymization for GDPR compliance
export async function anonymizeUserData(userId: string, reason: string = 'USER_REQUEST') {
  const anonymizedEmail = `deleted-${Date.now()}@example.com`;
  const anonymizedName = 'Deleted User';
  
  try {
    // Start transaction
    await prisma.$transaction(async (tx) => {
      // Anonymize user data
      await tx.user.update({
        where: { id: userId },
        data: {
          email: anonymizedEmail,
          firstName: anonymizedName,
          lastName: '',
          phone: null,
          deletedAt: new Date()
        }
      });
      
      // Anonymize related data
      await tx.booking.updateMany({
        where: { userId },
        data: {
          customerName: anonymizedName,
          customerEmail: anonymizedEmail,
          customerPhone: null
        }
      });
      
      // Log the anonymization
      await tx.auditLog.create({
        data: {
          userId,
          action: 'ANONYMIZE',
          resource: 'user',
          metadata: { reason },
          timestamp: new Date()
        }
      });
    });
    
    console.log(`User ${userId} data anonymized successfully`);
  } catch (error) {
    console.error('Failed to anonymize user data:', error);
    throw new Error('Data anonymization failed');
  }
}

// Secure data export for GDPR compliance
export async function exportUserData(userId: string, requestingUserId: string) {
  // Verify user can export this data
  if (userId !== requestingUserId) {
    const requestingUser = await prisma.user.findUnique({
      where: { id: requestingUserId },
      include: { role: true }
    });
    
    if (!requestingUser || requestingUser.role?.name !== 'admin') {
      throw new Error('Unauthorized data export request');
    }
  }
  
  try {
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        bookings: {
          include: {
            package: true
          }
        },
        reviews: true,
        quotes: true
      }
    });
    
    if (!userData) {
      throw new Error('User not found');
    }
    
    // Log the export
    await logUserAction(requestingUserId, 'EXPORT', 'user_data', {
      exportedUserId: userId,
      timestamp: new Date().toISOString()
    });
    
    // Remove sensitive fields
    const { clerkId, ...exportData } = userData;
    
    return exportData;
  } catch (error) {
    console.error('Failed to export user data:', error);
    throw new Error('Data export failed');
  }
}

// Secure database queries with parameter validation
export class SecureQuery {
  // Validate UUID parameters
  static validateUUID(id: string): string {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error('Invalid UUID format');
    }
    return id;
  }
  
  // Validate email parameters
  static validateEmail(email: string): string {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
    return email.toLowerCase().trim();
  }
  
  // Validate pagination parameters
  static validatePagination(page?: number, limit?: number): { page: number; limit: number } {
    const validatedPage = Math.max(1, page || 1);
    const validatedLimit = Math.min(100, Math.max(1, limit || 10));
    
    return { page: validatedPage, limit: validatedLimit };
  }
  
  // Secure user search with proper escaping
  static async searchUsers(
    query: string,
    requestingUserId: string,
    pagination: { page: number; limit: number }
  ) {
    // Verify requesting user has permission
    const requestingUser = await prisma.user.findUnique({
      where: { id: requestingUserId },
      include: { role: true }
    });
    
    if (!requestingUser || !['admin', 'staff'].includes(requestingUser.role?.name || '')) {
      throw new Error('Insufficient permissions for user search');
    }
    
    // Sanitize search query
    const sanitizedQuery = query.replace(/[^a-zA-Z0-9\s@.-]/g, '').trim();
    
    if (sanitizedQuery.length < 2) {
      throw new Error('Search query too short');
    }
    
    const { page, limit } = this.validatePagination(pagination.page, pagination.limit);
    const skip = (page - 1) * limit;
    
    return prisma.user.findMany({
      where: {
        OR: [
          { firstName: { contains: sanitizedQuery, mode: 'insensitive' } },
          { lastName: { contains: sanitizedQuery, mode: 'insensitive' } },
          { email: { contains: sanitizedQuery, mode: 'insensitive' } }
        ],
        deletedAt: null
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
        role: {
          select: {
            name: true
          }
        }
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc'
      }
    });
  }
}

// Database connection security
export function createSecurePrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    },
    errorFormat: 'minimal' // Don't expose internal details in production
  });
}

// Data retention policies
export async function cleanupExpiredData() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  try {
    // Clean up old audit logs (keep for 90 days)
    await prisma.auditLog.deleteMany({
      where: {
        timestamp: {
          lt: ninetyDaysAgo
        }
      }
    });
    
    // Clean up old security logs (keep for 90 days)
    await prisma.securityLog.deleteMany({
      where: {
        timestamp: {
          lt: ninetyDaysAgo
        }
      }
    });
    
    // Clean up expired sessions (keep for 30 days)
    await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: thirtyDaysAgo
        }
      }
    });
    
    console.log('Data cleanup completed successfully');
  } catch (error) {
    console.error('Data cleanup failed:', error);
  }
}

// Backup verification
export async function verifyDatabaseIntegrity() {
  try {
    // Check for orphaned records
    const orphanedBookings = await prisma.booking.count({
      where: {
        user: null
      }
    });
    
    const orphanedReviews = await prisma.review.count({
      where: {
        user: null
      }
    });
    
    // Check for data consistency
    const usersWithoutRoles = await prisma.user.count({
      where: {
        roleId: null
      }
    });
    
    const report = {
      orphanedBookings,
      orphanedReviews,
      usersWithoutRoles,
      timestamp: new Date().toISOString()
    };
    
    if (orphanedBookings > 0 || orphanedReviews > 0 || usersWithoutRoles > 0) {
      console.warn('Database integrity issues detected:', report);
    }
    
    return report;
  } catch (error) {
    console.error('Database integrity check failed:', error);
    throw error;
  }
}

// Secure transaction wrapper
export async function secureTransaction<T>(
  operation: (tx: any) => Promise<T>,
  userId?: string,
  action?: string
): Promise<T> {
  try {
    const result = await prisma.$transaction(operation);
    
    // Log successful transaction
    if (userId && action) {
      await logUserAction(userId, action, 'database', {
        success: true,
        timestamp: new Date().toISOString()
      });
    }
    
    return result;
  } catch (error) {
    // Log failed transaction
    if (userId && action) {
      await logUserAction(userId, `${action}_FAILED`, 'database', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    throw error;
  }
}

// Export all utilities
export const dbSecurity = {
  getUserBookings,
  getUserProfile,
  logUserAction,
  logSecurityEvent,
  anonymizeUserData,
  exportUserData,
  SecureQuery,
  createSecurePrismaClient,
  cleanupExpiredData,
  verifyDatabaseIntegrity,
  secureTransaction
};