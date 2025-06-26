import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const UpdateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  bio: z.string().optional(),
  specializations: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  profileImage: z.string().url().optional(),
  socialMedia: z.object({
    website: z.string().url().optional(),
    linkedin: z.string().url().optional(),
    instagram: z.string().url().optional(),
    facebook: z.string().url().optional()
  }).optional()
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'AGENT') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Agent access required.' },
        { status: 403 }
      )
    }

    // Get agent profile with related data
    const agent = await db.agent.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
            updatedAt: true
          }
        },
        tier: {
          include: {
            config: true
          }
        },
        quotes: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
            commission: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5 // Recent quotes
        },
        bookings: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5 // Recent bookings
        }
      }
    })

    if (!agent) {
      return NextResponse.json(
        { success: false, error: 'Agent profile not found' },
        { status: 404 }
      )
    }

    // Calculate agent statistics
    const [totalQuotes, totalBookings, totalCommission, monthlyStats] = await Promise.all([
      // Total quotes
      db.quote.count({
        where: { agentId: agent.id }
      }),
      
      // Total bookings
      db.booking.count({
        where: { agentId: agent.id }
      }),
      
      // Total commission earned
      db.quote.aggregate({
        where: { 
          agentId: agent.id,
          status: 'ACCEPTED'
        },
        _sum: {
          commission: true
        }
      }),
      
      // Monthly statistics (current month)
      db.quote.aggregate({
        where: {
          agentId: agent.id,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        },
        _count: {
          id: true
        },
        _sum: {
          totalAmount: true,
          commission: true
        }
      })
    ])

    // Calculate conversion rate
    const acceptedQuotes = await db.quote.count({
      where: {
        agentId: agent.id,
        status: 'ACCEPTED'
      }
    })
    
    const conversionRate = totalQuotes > 0 ? (acceptedQuotes / totalQuotes) * 100 : 0

    // Get tier progress (if applicable)
    let tierProgress = null
    if (agent.tier?.config) {
      const currentMonthCommission = monthlyStats._sum.commission || 0
      const nextTierRequirement = agent.tier.config.monthlyTarget || 0
      
      if (nextTierRequirement > 0) {
        tierProgress = {
          current: currentMonthCommission,
          target: nextTierRequirement,
          percentage: Math.min((currentMonthCommission / nextTierRequirement) * 100, 100)
        }
      }
    }

    // Format response data
    const profileData = {
      id: agent.id,
      name: agent.user.name,
      email: agent.user.email,
      phone: agent.phone,
      address: agent.address,
      bio: agent.bio,
      specializations: agent.specializations,
      languages: agent.languages,
      profileImage: agent.profileImage || agent.user.image,
      socialMedia: agent.socialMedia,
      joinedAt: agent.user.createdAt,
      lastActive: agent.user.updatedAt,
      
      // Tier information
      tier: agent.tier ? {
        id: agent.tier.id,
        name: agent.tier.name,
        level: agent.tier.level,
        commissionRate: agent.tier.commissionRate,
        discountPercentage: agent.tier.discountPercentage,
        creditLimit: agent.tier.creditLimit,
        benefits: agent.tier.benefits,
        requirements: agent.tier.requirements,
        config: agent.tier.config
      } : null,
      
      // Statistics
      stats: {
        totalQuotes,
        totalBookings,
        totalCommission: totalCommission._sum.commission || 0,
        conversionRate,
        monthlyQuotes: monthlyStats._count.id,
        monthlyRevenue: monthlyStats._sum.totalAmount || 0,
        monthlyCommission: monthlyStats._sum.commission || 0
      },
      
      // Tier progress
      tierProgress,
      
      // Recent activity
      recentQuotes: agent.quotes,
      recentBookings: agent.bookings
    }

    return NextResponse.json({
      success: true,
      data: profileData
    })

  } catch (error) {
    console.error('Error fetching agent profile:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'AGENT') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Agent access required.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = UpdateProfileSchema.parse(body)

    // Get current agent
    const currentAgent = await db.agent.findUnique({
      where: { userId: session.user.id }
    })

    if (!currentAgent) {
      return NextResponse.json(
        { success: false, error: 'Agent profile not found' },
        { status: 404 }
      )
    }

    // Update agent profile
    const updatedAgent = await db.agent.update({
      where: { id: currentAgent.id },
      data: {
        phone: validatedData.phone,
        address: validatedData.address,
        bio: validatedData.bio,
        specializations: validatedData.specializations,
        languages: validatedData.languages,
        profileImage: validatedData.profileImage,
        socialMedia: validatedData.socialMedia
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        tier: true
      }
    })

    // Update user name if provided
    if (validatedData.name && validatedData.name !== updatedAgent.user.name) {
      await db.user.update({
        where: { id: session.user.id },
        data: { name: validatedData.name }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedAgent.id,
        name: validatedData.name || updatedAgent.user.name,
        email: updatedAgent.user.email,
        phone: updatedAgent.phone,
        address: updatedAgent.address,
        bio: updatedAgent.bio,
        specializations: updatedAgent.specializations,
        languages: updatedAgent.languages,
        profileImage: updatedAgent.profileImage,
        socialMedia: updatedAgent.socialMedia,
        tier: updatedAgent.tier
      },
      message: 'Profile updated successfully'
    })

  } catch (error) {
    console.error('Error updating agent profile:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}