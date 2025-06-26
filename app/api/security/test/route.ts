import { NextRequest, NextResponse } from 'next/server'
import { withApiSecurity } from '@/lib/api/security'
import { z } from 'zod'

const testSchema = z.object({
  message: z.string().min(1).max(100),
})

async function handler(req: NextRequest) {
  const body = await req.json()
  const { message } = testSchema.parse(body)
  
  return NextResponse.json({
    success: true,
    message: `Security test successful: ${message}`,
    timestamp: new Date().toISOString(),
  })
}

export const POST = withApiSecurity(handler, {
  requireAuth: true,
  allowedRoles: ['CUSTOMER', 'AGENT', 'ADMIN', 'SUPER_ADMIN'],
  rateLimit: {
    requests: 10,
    window: '1m',
  },
  validation: {
    body: testSchema,
  },
})