'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { QuoteManagement } from '@/components/quotes/QuoteManagement'
import { 
  TrendingUp, 
  DollarSign, 
  FileText, 
  Calendar, 
  Users, 
  Award, 
  Target,
  Activity,
  Star,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface AgentProfile {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  bio?: string
  specializations?: string[]
  languages?: string[]
  profileImage?: string
  socialMedia?: {
    website?: string
    linkedin?: string
    instagram?: string
    facebook?: string
  }
  joinedAt: string
  lastActive: string
  tier?: {
    id: string
    name: string
    level: number
    commissionRate: number
    discountPercentage: number
    creditLimit: number
    benefits?: string[]
    requirements?: string[]
  }
  stats: {
    totalQuotes: number
    totalBookings: number
    totalCommission: number
    conversionRate: number
    monthlyQuotes: number
    monthlyRevenue: number
    monthlyCommission: number
  }
  tierProgress?: {
    current: number
    target: number
    percentage: number
  }
  recentQuotes: Array<{
    id: string
    status: string
    totalAmount: number
    commission: number
    createdAt: string
  }>
  recentBookings: Array<{
    id: string
    status: string
    totalAmount: number
    createdAt: string
  }>
}

interface QuoteStats {
  totalQuotes: number
  totalValue: number
  totalCommission: number
  conversionRate: number
  averageQuoteValue: number
  itemizedQuotes: number
  packageQuotes: number
  statusBreakdown: {
    DRAFT: number
    SENT: number
    VIEWED: number
    ACCEPTED: number
    REJECTED: number
    EXPIRED: number
  }
  monthlyTrend: Array<{
    month: string
    quotes: number
    value: number
    commission: number
  }>
}

export function AgentDashboard() {
  const [profile, setProfile] = useState<AgentProfile | null>(null)
  const [quoteStats, setQuoteStats] = useState<QuoteStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch agent profile and quote stats in parallel
      const [profileResponse, statsResponse] = await Promise.all([
        fetch('/api/agents/profile'),
        fetch('/api/quotes/stats')
      ])

      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        setProfile(profileData.data)
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setQuoteStats(statsData.data)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return 'bg-green-500'
      case 'SENT': return 'bg-blue-500'
      case 'VIEWED': return 'bg-yellow-500'
      case 'REJECTED': return 'bg-red-500'
      case 'EXPIRED': return 'bg-gray-500'
      default: return 'bg-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return <CheckCircle className="h-4 w-4" />
      case 'SENT': return <Clock className="h-4 w-4" />
      case 'VIEWED': return <Activity className="h-4 w-4" />
      case 'REJECTED': return <AlertCircle className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Profile Not Found</h3>
              <p className="text-muted-foreground mb-4">
                Unable to load your agent profile. Please contact support.
              </p>
              <Button onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile.profileImage} alt={profile.name} />
            <AvatarFallback>
              {profile.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {profile.name}!</h1>
            <p className="text-muted-foreground">
              {profile.tier?.name} Agent • Member since {formatDate(profile.joinedAt)}
            </p>
          </div>
        </div>
        {profile.tier && (
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Award className="h-4 w-4 mr-2" />
            {profile.tier.name}
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quotes">Quote Management</TabsTrigger>
          <TabsTrigger value="profile">Profile & Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{profile.stats.totalQuotes}</div>
                <p className="text-xs text-muted-foreground">
                  {profile.stats.monthlyQuotes} this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(quoteStats?.totalValue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(profile.stats.monthlyRevenue)} this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Commission Earned</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(profile.stats.totalCommission)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(profile.stats.monthlyCommission)} this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {profile.stats.conversionRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {profile.stats.totalBookings} bookings total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tier Progress */}
          {profile.tierProgress && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Tier Progress
                </CardTitle>
                <CardDescription>
                  Your progress towards the next tier level
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Current: {formatCurrency(profile.tierProgress.current)}</span>
                  <span>Target: {formatCurrency(profile.tierProgress.target)}</span>
                </div>
                <Progress value={profile.tierProgress.percentage} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  {profile.tierProgress.percentage.toFixed(1)}% complete
                </p>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Recent Quotes */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Quotes</CardTitle>
                <CardDescription>Your latest quote activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {profile.recentQuotes.length > 0 ? (
                    profile.recentQuotes.map((quote) => (
                      <div key={quote.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full ${getStatusColor(quote.status)}`}>
                            {getStatusIcon(quote.status)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">Quote #{quote.id.slice(-6)}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(quote.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {formatCurrency(quote.totalAmount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(quote.commission)} commission
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No recent quotes
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Bookings */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Bookings</CardTitle>
                <CardDescription>Your latest booking confirmations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {profile.recentBookings.length > 0 ? (
                    profile.recentBookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full ${getStatusColor(booking.status)}`}>
                            {getStatusIcon(booking.status)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">Booking #{booking.id.slice(-6)}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(booking.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {formatCurrency(booking.totalAmount)}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {booking.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No recent bookings
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quote Statistics */}
          {quoteStats && (
            <Card>
              <CardHeader>
                <CardTitle>Quote Performance</CardTitle>
                <CardDescription>Detailed breakdown of your quote activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Quote Types</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Itemized:</span>
                        <span>{quoteStats.itemizedQuotes}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Package:</span>
                        <span>{quoteStats.packageQuotes}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Status Breakdown</p>
                    <div className="space-y-1">
                      {Object.entries(quoteStats.statusBreakdown).map(([status, count]) => (
                        <div key={status} className="flex justify-between text-sm">
                          <span>{status}:</span>
                          <span>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Averages</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Quote Value:</span>
                        <span>{formatCurrency(quoteStats.averageQuoteValue)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Conversion:</span>
                        <span>{quoteStats.conversionRate.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="quotes">
          <QuoteManagement />
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Your agent profile details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <p className="text-sm text-muted-foreground">{profile.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <p className="text-sm text-muted-foreground">{profile.phone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Address</label>
                  <p className="text-sm text-muted-foreground">{profile.address || 'Not provided'}</p>
                </div>
              </div>
              
              {profile.bio && (
                <div>
                  <label className="text-sm font-medium">Bio</label>
                  <p className="text-sm text-muted-foreground">{profile.bio}</p>
                </div>
              )}
              
              {profile.specializations && profile.specializations.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Specializations</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {profile.specializations.map((spec, index) => (
                      <Badge key={index} variant="secondary">{spec}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {profile.languages && profile.languages.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Languages</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {profile.languages.map((lang, index) => (
                      <Badge key={index} variant="outline">{lang}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tier Information */}
          {profile.tier && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Tier Information
                </CardTitle>
                <CardDescription>Your current agent tier and benefits</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Tier Level</label>
                    <p className="text-sm text-muted-foreground">Level {profile.tier.level}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Commission Rate</label>
                    <p className="text-sm text-muted-foreground">{profile.tier.commissionRate}%</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Discount Percentage</label>
                    <p className="text-sm text-muted-foreground">{profile.tier.discountPercentage}%</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Credit Limit</label>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(profile.tier.creditLimit)}
                    </p>
                  </div>
                </div>
                
                {profile.tier.benefits && profile.tier.benefits.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Benefits</label>
                    <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                      {profile.tier.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <Star className="h-3 w-3 text-yellow-500" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}