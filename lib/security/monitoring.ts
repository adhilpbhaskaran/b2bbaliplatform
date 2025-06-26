import { prisma } from '@/lib/prisma';
import { DataMasking } from './crypto';

// Security event types
export type SecurityEventType = 
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'data_modification'
  | 'suspicious_activity'
  | 'system_error'
  | 'configuration_change'
  | 'payment_activity'
  | 'file_access'
  | 'api_abuse';

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

// Security event interface
export interface SecurityEvent {
  userId?: string;
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  resource: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

// Security monitoring class
export class SecurityMonitoring {
  // Log security events
  static async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Sanitize sensitive data in metadata
      const sanitizedMetadata = event.metadata 
        ? DataMasking.maskSensitiveData(event.metadata)
        : null;
      
      // Store in database
      await prisma.securityLog.create({
        data: {
          userId: event.userId || null,
          eventType: event.eventType,
          severity: event.severity,
          resource: event.resource,
          action: event.action,
          ipAddress: event.ipAddress || null,
          userAgent: event.userAgent || null,
          metadata: sanitizedMetadata,
          timestamp: event.timestamp || new Date()
        }
      });
      
      // Send alerts for critical events
      if (event.severity === 'critical') {
        await this.sendCriticalAlert(event);
      }
      
      // Check for patterns that might indicate attacks
      await this.analyzeSecurityPatterns(event);
      
    } catch (error) {
      console.error('Failed to log security event:', error);
      // Don't throw to avoid breaking the main operation
    }
  }
  
  // Send critical security alerts
  static async sendCriticalAlert(event: SecurityEvent): Promise<void> {
    try {
      const alertData = {
        timestamp: new Date().toISOString(),
        severity: event.severity,
        eventType: event.eventType,
        resource: event.resource,
        action: event.action,
        userId: event.userId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent ? DataMasking.maskSensitiveData({ userAgent: event.userAgent }).userAgent : null,
        metadata: event.metadata ? DataMasking.maskSensitiveData(event.metadata) : null
      };
      
      // In production, send to external security service
      if (process.env.SECURITY_WEBHOOK_URL) {
        await fetch(process.env.SECURITY_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SECURITY_WEBHOOK_TOKEN}`
          },
          body: JSON.stringify(alertData)
        });
      }
      
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('🚨 CRITICAL SECURITY EVENT:', alertData);
      }
      
      // Send email alert to security team
      if (process.env.SECURITY_EMAIL) {
        await this.sendSecurityEmail(alertData);
      }
      
    } catch (error) {
      console.error('Failed to send critical alert:', error);
    }
  }
  
  // Analyze security patterns for potential attacks
  static async analyzeSecurityPatterns(event: SecurityEvent): Promise<void> {
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      // Check for brute force attacks (multiple failed logins)
      if (event.eventType === 'authentication' && event.action === 'failed_login') {
        const recentFailures = await prisma.securityLog.count({
          where: {
            eventType: 'authentication',
            action: 'failed_login',
            ipAddress: event.ipAddress,
            timestamp: {
              gte: fiveMinutesAgo
            }
          }
        });
        
        if (recentFailures >= 5) {
          await this.logSecurityEvent({
            eventType: 'suspicious_activity',
            severity: 'high',
            resource: 'authentication',
            action: 'brute_force_detected',
            ipAddress: event.ipAddress,
            userAgent: event.userAgent,
            metadata: {
              failureCount: recentFailures,
              timeWindow: '5 minutes'
            }
          });
        }
      }
      
      // Check for API abuse (too many requests)
      if (event.eventType === 'api_abuse') {
        const recentRequests = await prisma.securityLog.count({
          where: {
            eventType: 'api_abuse',
            ipAddress: event.ipAddress,
            timestamp: {
              gte: oneHourAgo
            }
          }
        });
        
        if (recentRequests >= 100) {
          await this.logSecurityEvent({
            eventType: 'suspicious_activity',
            severity: 'high',
            resource: 'api',
            action: 'rate_limit_exceeded',
            ipAddress: event.ipAddress,
            userAgent: event.userAgent,
            metadata: {
              requestCount: recentRequests,
              timeWindow: '1 hour'
            }
          });
        }
      }
      
      // Check for suspicious data access patterns
      if (event.eventType === 'data_access' && event.userId) {
        const recentAccess = await prisma.securityLog.count({
          where: {
            eventType: 'data_access',
            userId: event.userId,
            timestamp: {
              gte: oneHourAgo
            }
          }
        });
        
        if (recentAccess >= 50) {
          await this.logSecurityEvent({
            userId: event.userId,
            eventType: 'suspicious_activity',
            severity: 'medium',
            resource: 'data_access',
            action: 'excessive_data_access',
            ipAddress: event.ipAddress,
            userAgent: event.userAgent,
            metadata: {
              accessCount: recentAccess,
              timeWindow: '1 hour'
            }
          });
        }
      }
      
    } catch (error) {
      console.error('Failed to analyze security patterns:', error);
    }
  }
  
  // Send security email alerts
  static async sendSecurityEmail(alertData: any): Promise<void> {
    try {
      // This would integrate with your email service (SendGrid, AWS SES, etc.)
      // For now, we'll just log the alert
      console.log('Security email alert would be sent:', {
        to: process.env.SECURITY_EMAIL,
        subject: `🚨 Critical Security Event - ${alertData.eventType}`,
        body: JSON.stringify(alertData, null, 2)
      });
    } catch (error) {
      console.error('Failed to send security email:', error);
    }
  }
  
  // Get security metrics
  static async getSecurityMetrics(timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<{
    totalEvents: number;
    eventsByType: Record<SecurityEventType, number>;
    eventsBySeverity: Record<SecuritySeverity, number>;
    topIpAddresses: Array<{ ip: string; count: number }>;
    topUsers: Array<{ userId: string; count: number }>;
    suspiciousActivities: number;
  }> {
    try {
      const now = new Date();
      let startTime: Date;
      
      switch (timeRange) {
        case 'hour':
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case 'day':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }
      
      // Get total events
      const totalEvents = await prisma.securityLog.count({
        where: {
          timestamp: {
            gte: startTime
          }
        }
      });
      
      // Get events by type
      const eventsByTypeRaw = await prisma.securityLog.groupBy({
        by: ['eventType'],
        where: {
          timestamp: {
            gte: startTime
          }
        },
        _count: {
          eventType: true
        }
      });
      
      const eventsByType: Record<SecurityEventType, number> = {} as any;
      eventsByTypeRaw.forEach(item => {
        eventsByType[item.eventType as SecurityEventType] = item._count.eventType;
      });
      
      // Get events by severity
      const eventsBySeverityRaw = await prisma.securityLog.groupBy({
        by: ['severity'],
        where: {
          timestamp: {
            gte: startTime
          }
        },
        _count: {
          severity: true
        }
      });
      
      const eventsBySeverity: Record<SecuritySeverity, number> = {} as any;
      eventsBySeverityRaw.forEach(item => {
        eventsBySeverity[item.severity as SecuritySeverity] = item._count.severity;
      });
      
      // Get top IP addresses
      const topIpAddressesRaw = await prisma.securityLog.groupBy({
        by: ['ipAddress'],
        where: {
          timestamp: {
            gte: startTime
          },
          ipAddress: {
            not: null
          }
        },
        _count: {
          ipAddress: true
        },
        orderBy: {
          _count: {
            ipAddress: 'desc'
          }
        },
        take: 10
      });
      
      const topIpAddresses = topIpAddressesRaw.map(item => ({
        ip: item.ipAddress!,
        count: item._count.ipAddress
      }));
      
      // Get top users
      const topUsersRaw = await prisma.securityLog.groupBy({
        by: ['userId'],
        where: {
          timestamp: {
            gte: startTime
          },
          userId: {
            not: null
          }
        },
        _count: {
          userId: true
        },
        orderBy: {
          _count: {
            userId: 'desc'
          }
        },
        take: 10
      });
      
      const topUsers = topUsersRaw.map(item => ({
        userId: item.userId!,
        count: item._count.userId
      }));
      
      // Get suspicious activities count
      const suspiciousActivities = await prisma.securityLog.count({
        where: {
          timestamp: {
            gte: startTime
          },
          eventType: 'suspicious_activity'
        }
      });
      
      return {
        totalEvents,
        eventsByType,
        eventsBySeverity,
        topIpAddresses,
        topUsers,
        suspiciousActivities
      };
      
    } catch (error) {
      console.error('Failed to get security metrics:', error);
      throw error;
    }
  }
  
  // Get recent security events
  static async getRecentSecurityEvents(
    limit: number = 50,
    severity?: SecuritySeverity,
    eventType?: SecurityEventType
  ): Promise<any[]> {
    try {
      const where: any = {};
      
      if (severity) {
        where.severity = severity;
      }
      
      if (eventType) {
        where.eventType = eventType;
      }
      
      const events = await prisma.securityLog.findMany({
        where,
        orderBy: {
          timestamp: 'desc'
        },
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });
      
      // Mask sensitive data
      return events.map(event => ({
        ...event,
        user: event.user ? {
          ...event.user,
          email: DataMasking.maskEmail(event.user.email)
        } : null,
        ipAddress: event.ipAddress ? DataMasking.maskSensitiveData({ ip: event.ipAddress }).ip : null,
        metadata: event.metadata ? DataMasking.maskSensitiveData(event.metadata) : null
      }));
      
    } catch (error) {
      console.error('Failed to get recent security events:', error);
      throw error;
    }
  }
  
  // Check if IP is blocked
  static async isIpBlocked(ipAddress: string): Promise<boolean> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      // Check for recent brute force attempts
      const recentFailures = await prisma.securityLog.count({
        where: {
          eventType: 'authentication',
          action: 'failed_login',
          ipAddress,
          timestamp: {
            gte: fiveMinutesAgo
          }
        }
      });
      
      // Block IP if more than 10 failed attempts in 5 minutes
      return recentFailures >= 10;
      
    } catch (error) {
      console.error('Failed to check IP block status:', error);
      return false;
    }
  }
  
  // Clean up old security logs
  static async cleanupOldLogs(retentionDays: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      const deletedCount = await prisma.securityLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      });
      
      console.log(`Cleaned up ${deletedCount.count} old security logs`);
      
    } catch (error) {
      console.error('Failed to cleanup old security logs:', error);
    }
  }
}

// Security dashboard utilities
export class SecurityDashboard {
  // Get security dashboard data
  static async getDashboardData(): Promise<{
    overview: {
      totalEvents24h: number;
      criticalEvents24h: number;
      suspiciousActivities24h: number;
      blockedIps: number;
    };
    recentEvents: any[];
    metrics: any;
    alerts: any[];
  }> {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // Get overview stats
      const totalEvents24h = await prisma.securityLog.count({
        where: {
          timestamp: {
            gte: twentyFourHoursAgo
          }
        }
      });
      
      const criticalEvents24h = await prisma.securityLog.count({
        where: {
          timestamp: {
            gte: twentyFourHoursAgo
          },
          severity: 'critical'
        }
      });
      
      const suspiciousActivities24h = await prisma.securityLog.count({
        where: {
          timestamp: {
            gte: twentyFourHoursAgo
          },
          eventType: 'suspicious_activity'
        }
      });
      
      // Get blocked IPs (simplified - in production, you'd have a separate blocked IPs table)
      const blockedIps = 0; // This would be calculated based on your blocking logic
      
      // Get recent events
      const recentEvents = await SecurityMonitoring.getRecentSecurityEvents(10);
      
      // Get metrics
      const metrics = await SecurityMonitoring.getSecurityMetrics('day');
      
      // Get recent alerts (critical and high severity events)
      const alerts = await SecurityMonitoring.getRecentSecurityEvents(
        20,
        undefined,
        'suspicious_activity'
      );
      
      return {
        overview: {
          totalEvents24h,
          criticalEvents24h,
          suspiciousActivities24h,
          blockedIps
        },
        recentEvents,
        metrics,
        alerts
      };
      
    } catch (error) {
      console.error('Failed to get security dashboard data:', error);
      throw error;
    }
  }
}

// Export utilities
export const securityMonitoring = {
  SecurityMonitoring,
  SecurityDashboard
};

// Default exports for common operations
export const {
  logSecurityEvent,
  getSecurityMetrics,
  getRecentSecurityEvents,
  isIpBlocked
} = SecurityMonitoring;

export const {
  getDashboardData
} = SecurityDashboard;