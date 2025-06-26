'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToast } from '@/hooks/use-toast'
import { Search, MapPin, Users, Clock, Star, Plus, X } from 'lucide-react'

interface Hotel {
  id: string
  name: string
  description?: string
  location: string
  category: string
  starRating?: number
  images?: string[]
  amenities?: string[]
  rooms?: HotelRoom[]
}

interface HotelRoom {
  id: string
  name: string
  type: string
  capacity: number
  basePrice: number
  amenities?: string[]
  images?: string[]
}

interface Activity {
  id: string
  name: string
  description?: string
  category: string
  type: string
  location: string
  duration: number
  maxPax: number
  minPax: number
  basePrice: number
  images?: string[]
  highlights?: string[]
  inclusions?: string[]
  exclusions?: string[]
}

interface AddOn {
  id: string
  name: string
  description?: string
  category: string
  price: number
  unit: string
}

interface ItemSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelectItem: (itemType: string, itemId: string, itemData: any) => void
}

export default function ItemSelector({ isOpen, onClose, onSelectItem }: ItemSelectorProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'hotels' | 'activities' | 'addons'>('hotels')
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({})
  
  // Data
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [addons, setAddons] = useState<AddOn[]>([])
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 12
  
  // Filter options
  const [filterOptions, setFilterOptions] = useState({
    hotelCategories: [],
    locations: [],
    activityCategories: [],
    activityTypes: [],
    addonCategories: []
  })
  
  useEffect(() => {
    if (isOpen) {
      loadFilterOptions()
      loadItems()
    }
  }, [isOpen, activeTab, currentPage, searchTerm, selectedFilters])
  
  const loadFilterOptions = async () => {
    try {
      const [hotelsRes, activitiesRes, addonsRes] = await Promise.all([
        fetch('/api/hotels?options=true'),
        fetch('/api/activities?options=true'),
        fetch('/api/add-ons?options=true')
      ])
      
      const [hotelOptions, activityOptions, addonOptions] = await Promise.all([
        hotelsRes.json(),
        activitiesRes.json(),
        addonsRes.json()
      ])
      
      setFilterOptions({
        hotelCategories: hotelOptions.data?.categories || [],
        locations: hotelOptions.data?.locations || [],
        activityCategories: activityOptions.data?.categories || [],
        activityTypes: activityOptions.data?.types || [],
        addonCategories: addonOptions.data?.categories || []
      })
    } catch (error) {
      console.error('Error loading filter options:', error)
    }
  }
  
  const loadItems = async () => {
    setLoading(true)
    
    try {
      let url = ''
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: searchTerm,
        ...selectedFilters
      })
      
      switch (activeTab) {
        case 'hotels':
          url = `/api/hotels?${params}`
          break
        case 'activities':
          url = `/api/activities?${params}`
          break
        case 'addons':
          url = `/api/add-ons?${params}`
          break
      }
      
      const response = await fetch(url)
      const result = await response.json()
      
      if (result.success) {
        switch (activeTab) {
          case 'hotels':
            setHotels(result.data.hotels || [])
            break
          case 'activities':
            setActivities(result.data.activities || [])
            break
          case 'addons':
            setAddons(result.data.addons || [])
            break
        }
        setTotalPages(Math.ceil((result.data.total || 0) / itemsPerPage))
      }
    } catch (error) {
      console.error('Error loading items:', error)
      toast({
        title: 'Error',
        description: 'Failed to load items',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  const handleFilterChange = (filterKey: string, value: string) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterKey]: value
    }))
    setCurrentPage(1)
  }
  
  const clearFilters = () => {
    setSelectedFilters({})
    setSearchTerm('')
    setCurrentPage(1)
  }
  
  const handleSelectHotelRoom = (hotel: Hotel, room: HotelRoom) => {
    onSelectItem('hotel_room', room.id, {
      name: `${hotel.name} - ${room.name}`,
      description: `${room.type} room at ${hotel.name}, ${hotel.location}`,
      hotel,
      room
    })
  }
  
  const handleSelectActivity = (activity: Activity) => {
    onSelectItem('bookable_activity', activity.id, {
      name: activity.name,
      description: activity.description,
      activity
    })
  }
  
  const handleSelectAddon = (addon: AddOn) => {
    onSelectItem('add_on', addon.id, {
      name: addon.name,
      description: addon.description,
      addon
    })
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">Select Items for Quote</h2>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b">
          {[
            { key: 'hotels', label: 'Hotels & Rooms' },
            { key: 'activities', label: 'Activities' },
            { key: 'addons', label: 'Add-ons' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as any)
                setCurrentPage(1)
              }}
              className={`px-6 py-3 font-medium ${
                activeTab === tab.key
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Filters */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Dynamic filters based on active tab */}
            {activeTab === 'hotels' && (
              <>
                <select
                  value={selectedFilters.category || ''}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="">All Categories</option>
                  {filterOptions.hotelCategories.map((cat: string) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <select
                  value={selectedFilters.location || ''}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="">All Locations</option>
                  {filterOptions.locations.map((loc: string) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </>
            )}
            
            {activeTab === 'activities' && (
              <>
                <select
                  value={selectedFilters.category || ''}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="">All Categories</option>
                  {filterOptions.activityCategories.map((cat: string) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <select
                  value={selectedFilters.type || ''}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="">All Types</option>
                  {filterOptions.activityTypes.map((type: string) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </>
            )}
            
            {activeTab === 'addons' && (
              <select
                value={selectedFilters.category || ''}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="">All Categories</option>
                {filterOptions.addonCategories.map((cat: string) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}
            
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Hotels */}
              {activeTab === 'hotels' && hotels.map(hotel => (
                <Card key={hotel.id} className="p-4">
                  <div className="mb-3">
                    <h3 className="font-semibold">{hotel.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <MapPin className="w-3 h-3" />
                      <span>{hotel.location}</span>
                      {hotel.starRating && (
                        <>
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span>{hotel.starRating}</span>
                        </>
                      )}
                    </div>
                    <Badge variant="outline" className="mt-1">{hotel.category}</Badge>
                  </div>
                  
                  {hotel.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {hotel.description}
                    </p>
                  )}
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Available Rooms:</h4>
                    {hotel.rooms?.map(room => (
                      <div key={room.id} className="flex justify-between items-center p-2 border rounded">
                        <div>
                          <div className="font-medium text-sm">{room.name}</div>
                          <div className="text-xs text-gray-600">
                            {room.type} • <Users className="w-3 h-3 inline" /> {room.capacity}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">${room.basePrice}</div>
                          <Button
                            size="sm"
                            onClick={() => handleSelectHotelRoom(hotel, room)}
                            className="mt-1"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
              
              {/* Activities */}
              {activeTab === 'activities' && activities.map(activity => (
                <Card key={activity.id} className="p-4">
                  <div className="mb-3">
                    <h3 className="font-semibold">{activity.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <MapPin className="w-3 h-3" />
                      <span>{activity.location}</span>
                      <Clock className="w-3 h-3" />
                      <span>{activity.duration}h</span>
                    </div>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="outline">{activity.category}</Badge>
                      <Badge variant="outline">{activity.type}</Badge>
                    </div>
                  </div>
                  
                  {activity.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {activity.description}
                    </p>
                  )}
                  
                  <div className="text-sm text-gray-600 mb-3">
                    <Users className="w-3 h-3 inline mr-1" />
                    {activity.minPax}-{activity.maxPax} pax
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-lg font-semibold">${activity.basePrice}</div>
                    <Button
                      size="sm"
                      onClick={() => handleSelectActivity(activity)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </Card>
              ))}
              
              {/* Add-ons */}
              {activeTab === 'addons' && addons.map(addon => (
                <Card key={addon.id} className="p-4">
                  <div className="mb-3">
                    <h3 className="font-semibold">{addon.name}</h3>
                    <Badge variant="outline" className="mt-1">{addon.category}</Badge>
                  </div>
                  
                  {addon.description && (
                    <p className="text-sm text-gray-600 mb-3">
                      {addon.description}
                    </p>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <div className="text-lg font-semibold">
                      ${addon.price} <span className="text-sm font-normal">/ {addon.unit}</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSelectAddon(addon)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
          
          {/* Empty state */}
          {!loading && (
            (activeTab === 'hotels' && hotels.length === 0) ||
            (activeTab === 'activities' && activities.length === 0) ||
            (activeTab === 'addons' && addons.length === 0)
          ) && (
            <div className="text-center py-12 text-gray-500">
              No items found. Try adjusting your search or filters.
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 p-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}