'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import QuoteManagement from '@/components/quotes/QuoteManagement'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export default function QuotesPage() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [agentData, setAgentData] = useState<any>(null)
  
  useEffect(() => {
    if (status === 'loading') return
    
    if (status === 'unauthenticated') {
      redirect('/auth/signin')
      return
    }
    
    if (session?.user) {
      loadAgentData()
    }
  }, [session, status])
  
  const loadAgentData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Check if user is an agent
      if (session?.user?.role !== 'AGENT') {
        setError('Access denied. This page is only available for agents.')
        return
      }
      
      // Load agent profile data
      const response = await fetch('/api/agents/profile')
      const result = await response.json()
      
      if (result.success) {
        setAgentData(result.data)
      } else {
        setError(result.error || 'Failed to load agent data')
      }
    } catch (error) {
      console.error('Error loading agent data:', error)
      setError('Failed to load agent data')
    } finally {
      setLoading(false)
    }
  }
  
  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }
  
  if (!session?.user || session.user.role !== 'AGENT') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Access denied. This page is only available for agents.
          </AlertDescription>
        </Alert>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quote Management</h1>
            <p className="text-gray-600 mt-2">
              Create, manage, and track your itemized quotes for clients
            </p>
          </div>
          
          {agentData && (
            <Card className="p-4">
              <div className="text-sm">
                <div className="font-medium">{agentData.name}</div>
                <div className="text-gray-600">{agentData.email}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Tier: {agentData.tier?.name || 'Standard'} • 
                  Commission: {agentData.tier?.commissionRate || 10}%
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
      
      {/* Agent Tier Information */}
      {agentData?.tier && (
        <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">
                {agentData.tier.name} Agent Benefits
              </h3>
              <p className="text-blue-700 text-sm mt-1">
                Commission Rate: {agentData.tier.commissionRate}% • 
                Discount: {agentData.tier.discountPercentage}% • 
                Credit Limit: ${agentData.tier.creditLimit?.toLocaleString() || 'Unlimited'}
              </p>
            </div>
            {agentData.tier.benefits && (
              <div className="text-xs text-blue-600">
                {agentData.tier.benefits.slice(0, 2).map((benefit: string, index: number) => (
                  <div key={index}>• {benefit}</div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
      
      {/* Quote Management Component */}
      <QuoteManagement agentId={agentData?.id} />
      
      {/* Help Section */}
      <Card className="p-6 mt-8 bg-gray-50">
        <h3 className="font-semibold mb-4">Getting Started with Itemized Quotes</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <h4 className="font-medium mb-2">1. Create Quote</h4>
            <p className="text-gray-600">
              Click "New Itemized Quote" to start building a custom quote. 
              Add client information and travel details.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">2. Add Items</h4>
            <p className="text-gray-600">
              Browse and select hotels, activities, and add-ons. 
              Pricing is automatically calculated with your tier discounts.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">3. Send & Track</h4>
            <p className="text-gray-600">
              Send quotes to clients and track their status. 
              Export PDFs and manage all quotes from the dashboard.
            </p>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="font-medium mb-2">Key Features:</h4>
          <div className="flex flex-wrap gap-2">
            {[
              'Real-time pricing with seasonal rates',
              'Automatic tier-based discounts',
              'Flexible markup options',
              'Professional PDF exports',
              'Client communication tracking',
              'Commission calculations'
            ].map((feature, index) => (
              <span key={index} className="bg-white px-2 py-1 rounded text-xs border">
                {feature}
              </span>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}