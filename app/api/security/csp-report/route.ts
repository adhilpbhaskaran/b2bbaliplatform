import { NextRequest, NextResponse } from 'next/server'
import { SecurityMonitoring } from '@/lib/security/monitoring'

const securityMonitoring = new SecurityMonitoring()

export async function POST(req: NextRequest) {
  try {
    const report = await req.json()
    
    // Log CSP violation
    await securityMonitoring.logSecurityEvent({
      event: 'CSP_VIOLATION',
      severity: 'MEDIUM',
      source: 'BROWSER',
      metadata: {
        report,
        userAgent: req.headers.get('user-agent'),
        referer: req.headers.get('referer'),
      },
    })
    
    return NextResponse.json({ received: true }, { status: 204 })
  } catch (error) {
    console.error('CSP report error:', error)
    return NextResponse.json({ error: 'Invalid report' }, { status: 400 })
  }
}