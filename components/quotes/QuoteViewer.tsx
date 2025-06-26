'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  Calendar, 
  Users, 
  MapPin, 
  Phone, 
  Mail, 
  Download, 
  Send, 
  Edit,
  Clock,
  Bed,
  Activity
} from 'lucide-react'

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
  markupType?: string
  markupValue?: number
  notes?: string
  internalNotes?: string
  createdAt: string
  updatedAt: string
  items?: QuoteItem[]
  package?: {
    id: string
    name: string
    description?: string
  }
  agent?: {
    id: string
    name: string
    email: string
    phone?: string
  }
}

interface QuoteItem {
  id: string
  itemType: string
  itemName: string
  description?: string
  quantity: number
  unitPrice: number
  totalPrice: number
  nights?: number
  pax: number
  date?: string
  startDate?: string
  endDate?: string
  notes?: string
  customizations?: Record<string, any>
}

interface QuoteViewerProps {
  quote: Quote
  isOpen: boolean
  onClose: () => void
  onEdit?: () => void
  onSend?: () => void
  onExport?: () => void
}

export default function QuoteViewer({ 
  quote, 
  isOpen, 
  onClose, 
  onEdit, 
  onSend, 
  onExport 
}: QuoteViewerProps) {
  if (!isOpen) return null
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
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
  
  const getItemIcon = (itemType: string) => {
    switch (itemType) {
      case 'hotel_room': return <Bed className="w-4 h-4" />
      case 'bookable_activity': return <Activity className="w-4 h-4" />
      case 'add_on': return <MapPin className="w-4 h-4" />
      default: return <MapPin className="w-4 h-4" />
    }
  }
  
  const calculateSubtotal = () => {
    if (quote.isItemized && quote.items) {
      return quote.items.reduce((sum, item) => sum + item.totalPrice, 0)
    }
    return quote.totalAmount
  }
  
  const calculateMarkup = () => {
    const subtotal = calculateSubtotal()
    if (quote.markupType === 'percentage') {
      return subtotal * (quote.markupValue || 0) / 100
    }
    return quote.markupValue || 0
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold">Quote {quote.quoteNumber}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={getStatusColor(quote.status)}>
                {quote.status}
              </Badge>
              <Badge variant="outline">
                {quote.isItemized ? 'Itemized' : 'Package'}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}
            {onSend && (
              <Button variant="outline" size="sm" onClick={onSend}>
                <Send className="w-4 h-4 mr-1" />
                Send
              </Button>
            )}
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Client & Trip Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client Information */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Client Information</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">{quote.clientName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span>{quote.clientEmail}</span>
                </div>
                {quote.clientPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span>{quote.clientPhone}</span>
                  </div>
                )}
              </div>
            </Card>
            
            {/* Trip Information */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Trip Information</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>{formatDate(quote.startDate)} - {formatDate(quote.endDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span>{quote.duration} days</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span>
                    {Object.entries(quote.paxDetails).map(([type, count]) => 
                      `${count} ${type}`
                    ).join(', ')}
                  </span>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Package Information (for package quotes) */}
          {!quote.isItemized && quote.package && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Package Details</h3>
              <div>
                <h4 className="font-medium">{quote.package.name}</h4>
                {quote.package.description && (
                  <p className="text-gray-600 mt-1">{quote.package.description}</p>
                )}
              </div>
            </Card>
          )}
          
          {/* Itemized Details (for itemized quotes) */}
          {quote.isItemized && quote.items && quote.items.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Quote Items</h3>
              <div className="space-y-4">
                {quote.items.map((item, index) => (
                  <div key={item.id || index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getItemIcon(item.itemType)}
                          <h4 className="font-medium">{item.itemName}</h4>
                          <Badge variant="outline" className="text-xs">
                            {item.itemType.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        {item.description && (
                          <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                        )}
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Quantity:</span>
                            <span className="ml-1 font-medium">{item.quantity}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Pax:</span>
                            <span className="ml-1 font-medium">{item.pax}</span>
                          </div>
                          {item.nights && (
                            <div>
                              <span className="text-gray-500">Nights:</span>
                              <span className="ml-1 font-medium">{item.nights}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-500">Unit Price:</span>
                            <span className="ml-1 font-medium">{formatCurrency(item.unitPrice)}</span>
                          </div>
                        </div>
                        
                        {item.date && (
                          <div className="text-sm text-gray-600 mt-2">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {formatDate(item.date)}
                          </div>
                        )}
                        
                        {item.notes && (
                          <div className="text-sm text-gray-600 mt-2">
                            <strong>Notes:</strong> {item.notes}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-semibold">
                          {formatCurrency(item.totalPrice)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
          
          {/* Pricing Summary */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Pricing Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(calculateSubtotal())}</span>
              </div>
              
              {quote.markupValue && quote.markupValue > 0 && (
                <div className="flex justify-between">
                  <span>
                    Markup ({quote.markupType === 'percentage' ? `${quote.markupValue}%` : 'Fixed'}):
                  </span>
                  <span>{formatCurrency(calculateMarkup())}</span>
                </div>
              )}
              
              <hr className="my-2" />
              
              <div className="flex justify-between font-semibold text-lg">
                <span>Total Amount:</span>
                <span>{formatCurrency(quote.totalAmount)}</span>
              </div>
              
              <div className="flex justify-between text-sm text-gray-600">
                <span>Agent Commission:</span>
                <span>{formatCurrency(quote.commission)}</span>
              </div>
            </div>
          </Card>
          
          {/* Notes */}
          {(quote.notes || quote.internalNotes) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {quote.notes && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Client Notes</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
                </Card>
              )}
              
              {quote.internalNotes && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Internal Notes</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{quote.internalNotes}</p>
                </Card>
              )}
            </div>
          )}
          
          {/* Agent Information */}
          {quote.agent && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Agent Information</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">{quote.agent.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span>{quote.agent.email}</span>
                </div>
                {quote.agent.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span>{quote.agent.phone}</span>
                  </div>
                )}
              </div>
            </Card>
          )}
          
          {/* Quote Metadata */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Quote Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Created:</span>
                <span className="ml-2">{formatDate(quote.createdAt)}</span>
              </div>
              <div>
                <span className="text-gray-500">Last Updated:</span>
                <span className="ml-2">{formatDate(quote.updatedAt)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}