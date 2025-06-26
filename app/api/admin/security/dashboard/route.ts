import { NextRequest, NextResponse } from 'next/server'
import { withApiSecurity } from '@/lib/api/security'
import { SecurityDashboard } from '@/lib/security/monitoring'

const securityDashboard = new SecurityDashboard()

async function handler(req: NextRequest) {
  const overview = await securityDashboard.getSecurityOverview()
  const recentEvents = await securityDashboard.getRecentSecurityEvents(50)
  const alerts = await securityDashboard.getActiveAlerts()
  
  return NextResponse.json({
    overview,
    recentEvents,
    alerts,
    timestamp: new Date().toISOString(),
  })
}

export const GET = withApiSecurity(handler, {
  requireAuth: true,
  allowedRoles: ['ADMIN', 'SUPER_ADMIN'],
  rateLimit: {
    requests: 30,
    window: '1m',
  },
})