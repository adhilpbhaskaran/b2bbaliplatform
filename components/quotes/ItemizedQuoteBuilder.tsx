'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2, Calculator, Save, Send } from 'lucide-react'

interface QuoteItem {
  id?: string
  itemType: string
  itemId: string
  itemName: string
  description?: string
  quantity: number
  nights?: number
  pax: number
  unitPrice: number
  totalPrice: number
  date?: string
  startDate?: string
  endDate?: string
  notes?: string
  customizations?: Record<string, any>
}

interface QuoteBuilderProps {
  onSave?: (quote: any) => void
  onSend?: (quote: any) => void
  initialData?: {
    clientName?: string
    clientEmail?: string
    clientPhone?: string
    duration?: number
    startDate?: string
    endDate?: string
    paxDetails?: Record<string, any>
  }
}

export default function ItemizedQuoteBuilder({ 
  onSave, 
  onSend, 
  initialData 
}: QuoteBuilderProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  
  // Quote basic info
  const [clientName, setClientName] = useState(initialData?.clientName || '')
  const [clientEmail, setClientEmail] = useState(initialData?.clientEmail || '')
  const [clientPhone, setClientPhone] = useState(initialData?.clientPhone || '')
  const [duration, setDuration] = useState(initialData?.duration || 1)
  const [startDate, setStartDate] = useState(initialData?.startDate || '')
  const [endDate, setEndDate] = useState(initialData?.endDate || '')
  const [paxDetails, setPaxDetails] = useState(initialData?.paxDetails || { adults: 2, children: 0 })
  const [markupType, setMarkupType] = useState<'percentage' | 'fixed'>('percentage')
  const [markupValue, setMarkupValue] = useState(10)
  const [notes, setNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  
  // Quote items
  const [items, setItems] = useState<QuoteItem[]>([])
  const [showItemSelector, setShowItemSelector] = useState(false)
  
  // Pricing
  const [pricing, setPricing] = useState({
    subtotal: 0,
    agentDiscount: 0,
    markup: 0,
    total: 0,
    commission: 0
  })
  
  // Available items for selection
  const [availableHotels, setAvailableHotels] = useState([])
  const [availableActivities, setAvailableActivities] = useState([])
  const [availableAddons, setAvailableAddons] = useState([])
  
  useEffect(() => {
    loadAvailableItems()
  }, [])
  
  useEffect(() => {
    if (items.length > 0) {
      calculateTotalPricing()
    }
  }, [items, markupType, markupValue])
  
  const loadAvailableItems = async () => {
    try {
      const [hotelsRes, activitiesRes, addonsRes] = await Promise.all([
        fetch('/api/hotels'),
        fetch('/api/activities'),
        fetch('/api/add-ons')
      ])
      
      const [hotels, activities, addons] = await Promise.all([
        hotelsRes.json(),
        activitiesRes.json(),
        addonsRes.json()
      ])
      
      setAvailableHotels(hotels.data?.hotels || [])
      setAvailableActivities(activities.data?.activities || [])
      setAvailableAddons(addons.data?.addons || [])
    } catch (error) {
      console.error('Error loading available items:', error)
      toast({
        title: 'Error',
        description: 'Failed to load available items',
        variant: 'destructive'
      })
    }
  }
  
  const calculateTotalPricing = async () => {
    if (items.length === 0) {
      setPricing({ subtotal: 0, agentDiscount: 0, markup: 0, total: 0, commission: 0 })
      return
    }
    
    setCalculating(true)
    
    try {
      const response = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(item => ({
            itemType: item.itemType,
            itemId: item.itemId,
            date: item.date || item.startDate || startDate,
            pax: item.pax,
            nights: item.nights,
            markupType,
            markupValue
          }))
        })
      })
      
      const result = await response.json()
      
      if (result.success && result.data.total) {
        setPricing({
          subtotal: result.data.total.subtotal,
          agentDiscount: result.data.total.agentDiscount,
          markup: markupValue,
          total: result.data.total.total,
          commission: result.data.total.total * 0.1 // 10% commission
        })
      }
    } catch (error) {
      console.error('Error calculating pricing:', error)
      toast({
        title: 'Error',
        description: 'Failed to calculate pricing',
        variant: 'destructive'
      })
    } finally {
      setCalculating(false)
    }
  }
  
  const addItem = async (itemType: string, itemId: string, itemData: any) => {
    try {
      // Calculate pricing for this item
      const response = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType,
          itemId,
          date: startDate,
          pax: Object.values(paxDetails).reduce((sum: number, count: any) => sum + count, 0),
          nights: itemType === 'hotel_room' ? duration : undefined
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        const newItem: QuoteItem = {
          itemType,
          itemId,
          itemName: itemData.name,
          description: itemData.description,
          quantity: 1,
          nights: itemType === 'hotel_room' ? duration : undefined,
          pax: Object.values(paxDetails).reduce((sum: number, count: any) => sum + count, 0),
          unitPrice: result.data.pricing.seasonalPrice,
          totalPrice: result.data.pricing.finalPrice,
          date: startDate,
          startDate: startDate,
          endDate: endDate
        }
        
        setItems([...items, newItem])
        setShowItemSelector(false)
        
        toast({
          title: 'Success',
          description: `${itemData.name} added to quote`
        })
      }
    } catch (error) {
      console.error('Error adding item:', error)
      toast({
        title: 'Error',
        description: 'Failed to add item to quote',
        variant: 'destructive'
      })
    }
  }
  
  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    setItems(newItems)
  }
  
  const updateItem = (index: number, updates: Partial<QuoteItem>) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], ...updates }
    setItems(newItems)
  }
  
  const saveQuote = async () => {
    if (!clientName || !clientEmail || items.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in client details and add at least one item',
        variant: 'destructive'
      })
      return
    }
    
    setLoading(true)
    
    try {
      const response = await fetch('/api/quotes/itemized', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          clientEmail,
          clientPhone,
          duration,
          startDate,
          endDate,
          paxDetails,
          markupType,
          markupValue,
          notes,
          internalNotes,
          items: items.map(item => ({
            itemType: item.itemType,
            itemId: item.itemId,
            itemName: item.itemName,
            description: item.description,
            quantity: item.quantity,
            nights: item.nights,
            pax: item.pax,
            date: item.date,
            startDate: item.startDate,
            endDate: item.endDate,
            notes: item.notes,
            customizations: item.customizations
          }))
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Quote saved successfully'
        })
        
        if (onSave) {
          onSave(result.data)
        }
      } else {
        throw new Error(result.error || 'Failed to save quote')
      }
    } catch (error) {
      console.error('Error saving quote:', error)
      toast({
        title: 'Error',
        description: 'Failed to save quote',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Client Information */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Client Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Client Name *</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="Enter client name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="Enter email address"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="Enter phone number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Duration (days)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-full p-2 border rounded-md"
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>
      </Card>
      
      {/* Quote Items */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Quote Items</h3>
          <Button
            onClick={() => setShowItemSelector(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
        </div>
        
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No items added yet. Click "Add Item" to start building your quote.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{item.itemName}</h4>
                      <Badge variant="outline">{item.itemType}</Badge>
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Quantity:</span> {item.quantity}
                      </div>
                      <div>
                        <span className="font-medium">Pax:</span> {item.pax}
                      </div>
                      {item.nights && (
                        <div>
                          <span className="font-medium">Nights:</span> {item.nights}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Price:</span> ${item.totalPrice.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeItem(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      
      {/* Pricing Summary */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Pricing Summary</h3>
          {calculating && <LoadingSpinner />}
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>${pricing.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-green-600">
            <span>Agent Discount:</span>
            <span>-${pricing.agentDiscount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Markup ({markupType}):</span>
            <span>${pricing.markup.toFixed(2)}</span>
          </div>
          <hr />
          <div className="flex justify-between font-semibold text-lg">
            <span>Total:</span>
            <span>${pricing.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Your Commission:</span>
            <span>${pricing.commission.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Markup Type</label>
            <select
              value={markupType}
              onChange={(e) => setMarkupType(e.target.value as 'percentage' | 'fixed')}
              className="w-full p-2 border rounded-md"
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed Amount</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Markup Value {markupType === 'percentage' ? '(%)' : '($)'}
            </label>
            <input
              type="number"
              value={markupValue}
              onChange={(e) => setMarkupValue(parseFloat(e.target.value))}
              className="w-full p-2 border rounded-md"
              min="0"
              step={markupType === 'percentage' ? '0.1' : '1'}
            />
          </div>
        </div>
      </Card>
      
      {/* Notes */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Notes</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Client Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 border rounded-md"
              rows={3}
              placeholder="Notes visible to client"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Internal Notes</label>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              className="w-full p-2 border rounded-md"
              rows={3}
              placeholder="Internal notes (not visible to client)"
            />
          </div>
        </div>
      </Card>
      
      {/* Actions */}
      <div className="flex gap-4">
        <Button
          onClick={saveQuote}
          disabled={loading || items.length === 0}
          className="flex items-center gap-2"
        >
          {loading ? <LoadingSpinner /> : <Save className="w-4 h-4" />}
          Save Quote
        </Button>
        <Button
          variant="outline"
          onClick={() => onSend && onSend({ pricing, items })}
          disabled={loading || items.length === 0}
          className="flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          Send to Client
        </Button>
      </div>
    </div>
  )
}