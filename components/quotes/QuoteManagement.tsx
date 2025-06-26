'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToast } from '@/hooks/use-toast'
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit, 
  Send, 
  Copy, 
  Trash2, 
  Download,
  Calendar,
  User,
  DollarSign,
  Clock,
  MoreVertical
} from 'lucide-react'
import ItemizedQuoteBuilder from './ItemizedQuoteBuilder'
import QuoteViewer from './QuoteViewer'

interface Quote {
  id: string
  quoteNumber: string
  clientName: string
  clientEmail: string
  clientPhone?: string
  status: string
  isItemized: boolean
  duration: number
  startDate: string
  endDate: string
  paxDetails: Record<string, any>
  totalAmount: number
  commission: number
  createdAt: string
  updatedAt: string
  items?: QuoteItem[]
  package?: {
    id: string
    name: string
  }
}

interface QuoteItem {
  id: string
  itemType: string
  itemName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  nights?: number
  pax: number
}

interface QuoteManagementProps {
  agentId?: string
}

export default function QuoteManagement({ agentId }: QuoteManagementProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([])
  
  // UI State
  const [showQuoteBuilder, setShowQuoteBuilder] = useState(false)
  const [showQuoteViewer, setShowQuoteViewer] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('') // itemized, package, all
  const [dateFilter, setDateFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalQuotes, setTotalQuotes] = useState(0)
  const quotesPerPage = 20
  
  // Stats
  const [stats, setStats] = useState({
    totalQuotes: 0,
    pendingQuotes: 0,
    acceptedQuotes: 0,
    totalValue: 0,
    totalCommission: 0
  })
  
  useEffect(() => {
    loadQuotes()
    loadStats()
  }, [currentPage, sortBy, sortOrder])
  
  useEffect(() => {
    applyFilters()
  }, [quotes, searchTerm, statusFilter, typeFilter, dateFilter])
  
  const loadQuotes = async () => {
    setLoading(true)
    
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: quotesPerPage.toString(),
        sortBy,
        sortOrder,
        ...(agentId && { agentId })
      })
      
      const response = await fetch(`/api/quotes?${params}`)
      const result = await response.json()
      
      if (result.success) {
        setQuotes(result.data.quotes || [])
        setTotalPages(Math.ceil((result.data.total || 0) / quotesPerPage))
        setTotalQuotes(result.data.total || 0)
      }
    } catch (error) {
      console.error('Error loading quotes:', error)
      toast({
        title: 'Error',
        description: 'Failed to load quotes',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  const loadStats = async () => {
    try {
      const params = new URLSearchParams({
        ...(agentId && { agentId })
      })
      
      const response = await fetch(`/api/quotes/stats?${params}`)
      const result = await response.json()
      
      if (result.success) {
        setStats(result.data)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }
  
  const applyFilters = () => {
    let filtered = [...quotes]
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(quote => 
        quote.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.clientEmail.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(quote => quote.status === statusFilter)
    }
    
    // Type filter
    if (typeFilter) {
      if (typeFilter === 'itemized') {
        filtered = filtered.filter(quote => quote.isItemized)
      } else if (typeFilter === 'package') {
        filtered = filtered.filter(quote => !quote.isItemized)
      }
    }
    
    // Date filter
    if (dateFilter) {
      const filterDate = new Date(dateFilter)
      filtered = filtered.filter(quote => {
        const quoteDate = new Date(quote.startDate)
        return quoteDate >= filterDate
      })
    }
    
    setFilteredQuotes(filtered)
  }
  
  const handleViewQuote = async (quote: Quote) => {
    try {
      // Load full quote details including items
      const response = await fetch(`/api/quotes/${quote.id}`)
      const result = await response.json()
      
      if (result.success) {
        setSelectedQuote(result.data)
        setShowQuoteViewer(true)
      }
    } catch (error) {
      console.error('Error loading quote details:', error)
      toast({
        title: 'Error',
        description: 'Failed to load quote details',
        variant: 'destructive'
      })
    }
  }
  
  const handleEditQuote = (quote: Quote) => {
    setEditingQuote(quote)
    setShowQuoteBuilder(true)
  }
  
  const handleDuplicateQuote = async (quote: Quote) => {
    try {
      const response = await fetch(`/api/quotes/${quote.id}/duplicate`, {
        method: 'POST'
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Quote duplicated successfully'
        })
        loadQuotes()
      }
    } catch (error) {
      console.error('Error duplicating quote:', error)
      toast({
        title: 'Error',
        description: 'Failed to duplicate quote',
        variant: 'destructive'
      })
    }
  }
  
  const handleDeleteQuote = async (quote: Quote) => {
    if (!confirm(`Are you sure you want to delete quote ${quote.quoteNumber}?`)) {
      return
    }
    
    try {
      const response = await fetch(`/api/quotes/${quote.id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Quote deleted successfully'
        })
        loadQuotes()
      }
    } catch (error) {
      console.error('Error deleting quote:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete quote',
        variant: 'destructive'
      })
    }
  }
  
  const handleSendQuote = async (quote: Quote) => {
    try {
      const response = await fetch(`/api/quotes/${quote.id}/send`, {
        method: 'POST'
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Quote sent to client successfully'
        })
        loadQuotes()
      }
    } catch (error) {
      console.error('Error sending quote:', error)
      toast({
        title: 'Error',
        description: 'Failed to send quote',
        variant: 'destructive'
      })
    }
  }
  
  const handleExportQuote = async (quote: Quote) => {
    try {
      const response = await fetch(`/api/quotes/${quote.id}/export`)
      const blob = await response.blob()
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `quote-${quote.quoteNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting quote:', error)
      toast({
        title: 'Error',
        description: 'Failed to export quote',
        variant: 'destructive'
      })
    }
  }
  
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'sent': return 'bg-blue-100 text-blue-800'
      case 'viewed': return 'bg-yellow-100 text-yellow-800'
      case 'accepted': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'expired': return 'bg-gray-100 text-gray-600'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
  
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Quotes</p>
              <p className="text-2xl font-bold">{stats.totalQuotes}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold">{stats.pendingQuotes}</p>
            </div>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Accepted</p>
              <p className="text-2xl font-bold">{stats.acceptedQuotes}</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <User className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
            </div>
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Commission</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalCommission)}</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Quote Management</h1>
        <Button
          onClick={() => {
            setEditingQuote(null)
            setShowQuoteBuilder(true)
          }}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Itemized Quote
        </Button>
      </div>
      
      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search quotes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="viewed">Viewed</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="">All Types</option>
            <option value="itemized">Itemized</option>
            <option value="package">Package</option>
          </select>
          
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border rounded-md"
            placeholder="Start date from"
          />
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="createdAt">Created Date</option>
            <option value="updatedAt">Updated Date</option>
            <option value="startDate">Start Date</option>
            <option value="totalAmount">Total Amount</option>
            <option value="clientName">Client Name</option>
          </select>
          
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            className="px-3 py-2 border rounded-md"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
      </Card>
      
      {/* Quotes Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Quote #</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Client</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Travel Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Amount</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Commission</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Created</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center">
                    <LoadingSpinner />
                  </td>
                </tr>
              ) : filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    No quotes found
                  </td>
                </tr>
              ) : (
                filteredQuotes.map(quote => (
                  <tr key={quote.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{quote.quoteNumber}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium">{quote.clientName}</div>
                        <div className="text-sm text-gray-600">{quote.clientEmail}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">
                        {quote.isItemized ? 'Itemized' : 'Package'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getStatusColor(quote.status)}>
                        {quote.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="w-3 h-3" />
                        {formatDate(quote.startDate)}
                      </div>
                      <div className="text-xs text-gray-600">
                        {quote.duration} days
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{formatCurrency(quote.totalAmount)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-green-600">
                        {formatCurrency(quote.commission)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-600">
                        {formatDate(quote.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewQuote(quote)}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditQuote(quote)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendQuote(quote)}
                          disabled={quote.status === 'sent'}
                        >
                          <Send className="w-3 h-3" />
                        </Button>
                        <div className="relative group">
                          <Button variant="outline" size="sm">
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                          <div className="absolute right-0 top-8 bg-white border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            <button
                              onClick={() => handleDuplicateQuote(quote)}
                              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 w-full text-left"
                            >
                              <Copy className="w-3 h-3" />
                              Duplicate
                            </button>
                            <button
                              onClick={() => handleExportQuote(quote)}
                              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 w-full text-left"
                            >
                              <Download className="w-3 h-3" />
                              Export PDF
                            </button>
                            <button
                              onClick={() => handleDeleteQuote(quote)}
                              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 w-full text-left text-red-600"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * quotesPerPage) + 1} to {Math.min(currentPage * quotesPerPage, totalQuotes)} of {totalQuotes} quotes
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
      
      {/* Quote Builder Modal */}
      {showQuoteBuilder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">
                  {editingQuote ? 'Edit Quote' : 'Create New Itemized Quote'}
                </h2>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowQuoteBuilder(false)
                    setEditingQuote(null)
                  }}
                >
                  Close
                </Button>
              </div>
              <ItemizedQuoteBuilder
                initialData={editingQuote ? {
                  clientName: editingQuote.clientName,
                  clientEmail: editingQuote.clientEmail,
                  clientPhone: editingQuote.clientPhone,
                  duration: editingQuote.duration,
                  startDate: editingQuote.startDate,
                  endDate: editingQuote.endDate,
                  paxDetails: editingQuote.paxDetails
                } : undefined}
                onSave={(quote) => {
                  setShowQuoteBuilder(false)
                  setEditingQuote(null)
                  loadQuotes()
                  toast({
                    title: 'Success',
                    description: editingQuote ? 'Quote updated successfully' : 'Quote created successfully'
                  })
                }}
                onSend={(quote) => {
                  setShowQuoteBuilder(false)
                  setEditingQuote(null)
                  loadQuotes()
                  toast({
                    title: 'Success',
                    description: 'Quote sent to client successfully'
                  })
                }}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Quote Viewer Modal */}
      {showQuoteViewer && selectedQuote && (
        <QuoteViewer
          quote={selectedQuote}
          isOpen={showQuoteViewer}
          onClose={() => {
            setShowQuoteViewer(false)
            setSelectedQuote(null)
          }}
        />
      )}
    </div>
  )
}