import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AgentDashboard } from '@/components/dashboard/AgentDashboard'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  if (session.user.role !== 'AGENT') {
    redirect('/unauthorized')
  }

  return <AgentDashboard />
}