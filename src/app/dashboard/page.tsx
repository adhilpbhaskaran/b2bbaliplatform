'use client'

import { useUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  BarChart3,
  TrendingUp,
  Users,
  FileText,
  Calendar,
  DollarSign,
  Plus,
  Eye,
  Download,
  Star,
  Package,
  Calculator,
  PieChart,
  Briefcase,
  MessageCircle,
  HeadphonesIcon,
  Filter,
  Search,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAgentAnalytics, useQuotes, useBookings } from '@/hooks/useApi'
import { formatCurrency, formatDate, getTierColor } from '@/lib/utils'
import Link from 'next/link'

const DashboardPage = () => {
  const { isSignedIn, user, isLoaded } = useUser()
  
  // Redirect if not authenticated
  if (isLoaded && !isSignedIn) {
    redirect('/sign-in')
  }

  // Redirect admins to admin panel
  if (user?.publicMetadata?.role === 'admin') {
    redirect('/admin')
  }

  const { data: analytics, isLoading: analyticsLoading } = useAgentAnalytics()
  const { data: quotesData, isLoading: quotesLoading } = useQuotes({ limit: 5 })
  const { data: bookingsData, isLoading: bookingsLoading } = useBookings({ limit: 5 })

  const userTier = user?.publicMetadata?.tier as string || 'bronze'
  const tierColor = getTierColor(userTier)

  const stats = [
    {
      title: 'Quotes this week',
      value: analytics?.weeklyQuotes || 12,
      change: analytics?.quotesGrowth || 15,
      icon: FileText,
      color: 'text-[#0E7A6A]',
      bgColor: 'bg-[#0E7A6A]/10',
    },
    {
      title: 'Active bookings',
      value: analytics?.activeBookings || 8,
      change: analytics?.bookingsGrowth || 25,
      icon: Calendar,
      color: 'text-[#D4AF37]',
      bgColor: 'bg-[#D4AF37]/10',
    },
    {
      title: 'Commissions earned',
      value: formatCurrency(analytics?.monthlyCommissions || 45000),
      change: analytics?.commissionsGrowth || 18,
      icon: DollarSign,
      color: 'text-[#0E7A6A]',
      bgColor: 'bg-[#0E7A6A]/10',
    },
    {
      title: 'Conversion %',
      value: `${analytics?.conversionRate || 68}%`,
      change: analytics?.conversionGrowth || 12,
      icon: TrendingUp,
      color: 'text-[#D4AF37]',
      bgColor: 'bg-[#D4AF37]/10',
    },
  ]

  const mainSections = [
    {
      title: 'Packages',
      description: 'Browse and filter Bali packages',
      href: '/dashboard/packages',
      icon: Package,
      color: 'bg-[#0E7A6A] hover:bg-[#065F46]',
      features: ['Net rates', 'Instant availability', 'Filter by location']
    },
    {
      title: 'Quote Builder',
      description: 'Create branded quotes with markup',
      href: '/quote-builder',
      icon: Calculator,
      color: 'bg-[#D4AF37] hover:bg-[#B8941F]',
      features: ['Add markup %', 'Export PDF', 'Email quotes']
    },
    {
      title: 'Analytics',
      description: 'Track performance and commissions',
      href: '/dashboard/analytics',
      icon: PieChart,
      color: 'bg-[#0E7A6A] hover:bg-[#065F46]',
      features: ['Quote trends', 'Top packages', 'Commission tracking']
    },
    {
      title: 'Media Toolkit',
      description: 'Download marketing materials',
      href: '/dashboard/media',
      icon: Briefcase,
      color: 'bg-[#D4AF37] hover:bg-[#B8941F]',
      features: ['Brochures', 'Social media', 'Print materials']
    },
  ]

  if (!isLoaded || analyticsLoading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#0E7A6A]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] bali-pattern">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg border border-[#0E7A6A]/10 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-[#0E7A6A] to-[#065F46] px-8 py-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-white flex items-center">
                    Welcome back, {user?.firstName}! 👋
                  </h1>
                  <p className="text-[#D4AF37] mt-2 font-medium">
                    Your trusted partner for Bali travel experiences
                  </p>
                </div>
                <div className="mt-4 sm:mt-0 flex items-center space-x-3">
                  <Badge className="bg-[#D4AF37] text-[#111827] hover:bg-[#B8941F] text-sm font-semibold">
                    <Star className="w-3 h-3 mr-1" />
                    {userTier.toUpperCase()} AGENT
                  </Badge>
                  <Button className="bg-white text-[#0E7A6A] hover:bg-gray-50 font-semibold">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp Support
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="quote-card group">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600 mb-2">
                          {stat.title}
                        </p>
                        <p className="text-3xl font-bold text-[#111827] mb-1">
                          {stat.value}
                        </p>
                        <p className={`text-sm font-medium ${
                          stat.change >= 0 ? 'text-[#0E7A6A]' : 'text-red-600'
                        }`}>
                          {stat.change >= 0 ? '↗' : '↘'} {Math.abs(stat.change)}% this week
                        </p>
                      </div>
                      <div className={`p-4 rounded-2xl ${stat.bgColor} group-hover:scale-110 transition-transform duration-200`}>
                        <Icon className={`w-8 h-8 ${stat.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* Main Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {mainSections.map((section, index) => {
            const Icon = section.icon
            return (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                <Link href={section.href}>
                  <Card className="quote-card group cursor-pointer h-full">
                    <CardContent className="p-8">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex-1">
                          <div className="flex items-center mb-3">
                            <div className={`p-3 rounded-2xl text-white ${section.color} mr-4 group-hover:scale-110 transition-transform duration-200`}>
                              <Icon className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-[#111827] group-hover:text-[#0E7A6A] transition-colors">
                                {section.title}
                              </h3>
                              <p className="text-gray-600 mt-1">
                                {section.description}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {section.features.map((feature, idx) => (
                              <div key={idx} className="flex items-center text-sm text-gray-600">
                                <div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full mr-3"></div>
                                {feature}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <Button className="w-full btn-secondary group-hover:bg-[#0E7A6A] transition-colors">
                        Access {section.title}
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Support Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Card className="quote-card">
              <CardHeader>
                <CardTitle className="flex items-center text-[#0E7A6A]">
                  <HeadphonesIcon className="w-5 h-5 mr-2" />
                  Support
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gradient-to-r from-[#0E7A6A] to-[#065F46] rounded-2xl p-6 text-white">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4">
                      <MessageCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold">WhatsApp Support</h4>
                      <p className="text-sm text-[#D4AF37]">Available 24/7</p>
                    </div>
                  </div>
                  <Button className="w-full bg-white text-[#0E7A6A] hover:bg-gray-100 font-semibold">
                    Chat Now
                  </Button>
                </div>
                
                <div className="bg-[#D4AF37]/10 rounded-2xl p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-[#D4AF37]/20 rounded-full flex items-center justify-center mr-4">
                      <Users className="w-6 h-6 text-[#D4AF37]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#111827]">Your Bali Rep</h4>
                      <p className="text-sm text-gray-600">Priya Sharma</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white">
                    Contact Rep
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Quotes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Recent Quotes
                  </span>
                  <Link href="/dashboard/quotes">
                    <Button variant="ghost" size="sm">
                      View All
                    </Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {quotesLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : quotesData?.data?.length ? (
                  <div className="space-y-4">
                    {quotesData.data.slice(0, 5).map((quote) => (
                      <div key={quote.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{quote.clientName}</p>
                          <p className="text-sm text-gray-600">
                            {formatDate(quote.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            {formatCurrency(quote.totalAmount)}
                          </p>
                          <Badge variant={quote.status === 'sent' ? 'success' : 'pending'}>
                            {quote.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-center py-4">
                    No quotes yet. Create your first quote!
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Bookings */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Recent Bookings
                  </span>
                  <Link href="/dashboard/bookings">
                    <Button variant="ghost" size="sm">
                      View All
                    </Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bookingsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : bookingsData?.data?.length ? (
                  <div className="space-y-4">
                    {bookingsData.data.slice(0, 5).map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{booking.clientName}</p>
                          <p className="text-sm text-gray-600">
                            {formatDate(booking.travelDate)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            {formatCurrency(booking.totalAmount)}
                          </p>
                          <Badge variant={booking.status === 'confirmed' ? 'success' : 'warning'}>
                            {booking.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-center py-4">
                    No bookings yet. Start converting quotes!
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Tier Progress */}
        {analytics?.tierProgress && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="w-5 h-5 mr-2" />
                  Tier Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">
                      Current: {userTier.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-600">
                      {analytics.tierProgress.current} / {analytics.tierProgress.target} pax
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full bg-gradient-to-r ${tierColor === 'bronze' ? 'from-amber-400 to-amber-600' :
                        tierColor === 'silver' ? 'from-gray-400 to-gray-600' :
                        tierColor === 'gold' ? 'from-yellow-400 to-yellow-600' :
                        'from-purple-400 to-purple-600'
                      }`}
                      style={{
                        width: `${Math.min((analytics.tierProgress.current / analytics.tierProgress.target) * 100, 100)}%`
                      }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600">
                    {analytics.tierProgress.target - analytics.tierProgress.current > 0
                      ? `${analytics.tierProgress.target - analytics.tierProgress.current} more pax needed for next tier`
                      : 'Congratulations! You\'ve reached the maximum tier!'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default DashboardPage