'use client'

import { useFormContext } from 'react-hook-form'
import { useState } from 'react'
import { Check, Star, Wifi, Car, Utensils, MapPin, Users, Bed, Plus, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePackages } from '@/hooks/useApi'
import { Hotel, AddOn } from '@/types'
import { formatCurrency, calculateRoomsNeeded } from '@/lib/utils'

// Mock data for hotels and add-ons (in real app, these would come from API)
const mockHotels: Hotel[] = [
  {
    id: 'hotel-1',
    name: 'Ubud Luxury Resort',
    category: 'luxury',
    location: 'Ubud',
    rating: 5,
    pricePerNight: 250,
    amenities: ['Pool', 'Spa', 'Restaurant', 'WiFi', 'Gym'],
    description: 'Luxury resort nestled in the heart of Ubud with stunning rice terrace views.',
    images: ['/api/placeholder/400/300'],
    roomTypes: [
      { type: 'Deluxe Room', maxOccupancy: 2, pricePerNight: 250 },
      { type: 'Suite', maxOccupancy: 3, pricePerNight: 350 },
      { type: 'Villa', maxOccupancy: 4, pricePerNight: 500 }
    ]
  },
  {
    id: 'hotel-2',
    name: 'Seminyak Beach Hotel',
    category: 'mid-range',
    location: 'Seminyak',
    rating: 4,
    pricePerNight: 150,
    amenities: ['Pool', 'Restaurant', 'WiFi', 'Beach Access'],
    description: 'Modern beachfront hotel with direct access to Seminyak Beach.',
    images: ['/api/placeholder/400/300'],
    roomTypes: [
      { type: 'Standard Room', maxOccupancy: 2, pricePerNight: 150 },
      { type: 'Ocean View', maxOccupancy: 3, pricePerNight: 200 }
    ]
  },
  {
    id: 'hotel-3',
    name: 'Canggu Surf Lodge',
    category: 'budget',
    location: 'Canggu',
    rating: 3,
    pricePerNight: 80,
    amenities: ['Pool', 'WiFi', 'Surf Lessons'],
    description: 'Cozy surf lodge perfect for adventure seekers and budget travelers.',
    images: ['/api/placeholder/400/300'],
    roomTypes: [
      { type: 'Shared Dorm', maxOccupancy: 1, pricePerNight: 40 },
      { type: 'Private Room', maxOccupancy: 2, pricePerNight: 80 }
    ]
  }
]

const mockAddOns: AddOn[] = [
  {
    id: 'addon-1',
    name: 'Airport Transfer',
    category: 'transport',
    price: 25,
    unit: 'per trip',
    description: 'Private airport transfer with professional driver',
    included: false
  },
  {
    id: 'addon-2',
    name: 'Spa Treatment',
    category: 'wellness',
    price: 80,
    unit: 'per person',
    description: 'Traditional Balinese massage and spa treatment',
    included: false
  },
  {
    id: 'addon-3',
    name: 'Cooking Class',
    category: 'activity',
    price: 45,
    unit: 'per person',
    description: 'Learn to cook authentic Balinese cuisine',
    included: false
  },
  {
    id: 'addon-4',
    name: 'Volcano Sunrise Trek',
    category: 'activity',
    price: 65,
    unit: 'per person',
    description: 'Early morning trek to Mount Batur for sunrise viewing',
    included: false
  }
]

const CustomizationStep = () => {
  const { setValue, watch } = useFormContext()
  const [selectedHotelCategory, setSelectedHotelCategory] = useState<string>('all')
  
  const selectedHotels = watch('selectedHotels') || []
  const selectedAddOns = watch('selectedAddOns') || []
  const paxDetails = watch('paxDetails') || []
  const duration = watch('duration') || 3
  const packageId = watch('packageId')
  
  const totalPax = paxDetails.length
  const adults = paxDetails.filter((p: any) => p.type === 'adult').length
  const children = paxDetails.filter((p: any) => p.type === 'child').length
  const infants = paxDetails.filter((p: any) => p.type === 'infant').length
  
  const { data: packages } = usePackages()
  const selectedPackage = packages?.find(p => p.id === packageId)

  const hotelCategories = [
    { id: 'all', name: 'All Hotels' },
    { id: 'luxury', name: 'Luxury (5★)' },
    { id: 'mid-range', name: 'Mid-Range (4★)' },
    { id: 'budget', name: 'Budget (3★)' }
  ]

  const filteredHotels = mockHotels.filter(hotel => 
    selectedHotelCategory === 'all' || hotel.category === selectedHotelCategory
  )

  const addHotel = (hotel: Hotel) => {
    const roomsNeeded = calculateRoomsNeeded(adults, children)
    const newHotel = {
      hotelId: hotel.id,
      hotel: hotel,
      nights: duration - 1, // Assuming last day is departure
      roomConfiguration: {
        roomType: hotel.roomTypes[0].type,
        rooms: roomsNeeded,
        guestsPerRoom: Math.ceil((adults + children) / roomsNeeded)
      }
    }
    setValue('selectedHotels', [...selectedHotels, newHotel])
  }

  const removeHotel = (index: number) => {
    const updated = selectedHotels.filter((_: any, i: number) => i !== index)
    setValue('selectedHotels', updated)
  }

  const updateHotelNights = (index: number, nights: number) => {
    const updated = [...selectedHotels]
    updated[index].nights = Math.max(1, nights)
    setValue('selectedHotels', updated)
  }

  const updateRoomConfig = (index: number, field: string, value: any) => {
    const updated = [...selectedHotels]
    updated[index].roomConfiguration[field] = value
    setValue('selectedHotels', updated)
  }

  const toggleAddOn = (addOn: AddOn) => {
    const existing = selectedAddOns.find((a: any) => a.addOnId === addOn.id)
    if (existing) {
      const updated = selectedAddOns.filter((a: any) => a.addOnId !== addOn.id)
      setValue('selectedAddOns', updated)
    } else {
      const newAddOn = {
        addOnId: addOn.id,
        addOn: addOn,
        quantity: addOn.unit === 'per person' ? totalPax : 1
      }
      setValue('selectedAddOns', [...selectedAddOns, newAddOn])
    }
  }

  const updateAddOnQuantity = (addOnId: string, quantity: number) => {
    const updated = selectedAddOns.map((a: any) => 
      a.addOnId === addOnId ? { ...a, quantity: Math.max(0, quantity) } : a
    ).filter((a: any) => a.quantity > 0)
    setValue('selectedAddOns', updated)
  }

  const getTotalHotelCost = () => {
    return selectedHotels.reduce((total: number, hotel: any) => {
      const roomType = hotel.hotel.roomTypes.find((rt: any) => rt.type === hotel.roomConfiguration.roomType)
      const nightlyCost = (roomType?.pricePerNight || 0) * hotel.roomConfiguration.rooms
      return total + (nightlyCost * hotel.nights)
    }, 0)
  }

  const getTotalAddOnCost = () => {
    return selectedAddOns.reduce((total: number, addOn: any) => {
      return total + (addOn.addOn.price * addOn.quantity)
    }, 0)
  }

  const totalNights = selectedHotels.reduce((sum: number, hotel: any) => sum + hotel.nights, 0)

  return (
    <div className="space-y-8">
      {/* Package Summary */}
      {selectedPackage && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Selected Package: {selectedPackage.name}</h3>
          <p className="text-sm text-blue-800">{selectedPackage.description}</p>
        </div>
      )}

      {/* Hotel Selection */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Hotel Selection</h3>
          <div className="text-sm text-gray-600">
            Total nights needed: <span className="font-medium">{duration - 1}</span>
          </div>
        </div>

        {/* Hotel Category Filter */}
        <div className="flex flex-wrap gap-2">
          {hotelCategories.map((category) => (
            <Button
              key={category.id}
              type="button"
              variant={selectedHotelCategory === category.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedHotelCategory(category.id)}
            >
              {category.name}
            </Button>
          ))}
        </div>

        {/* Selected Hotels */}
        {selectedHotels.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Selected Hotels ({totalNights}/{duration - 1} nights)</h4>
            {selectedHotels.map((selectedHotel: any, index: number) => {
              const hotel = selectedHotel.hotel
              const roomType = hotel.roomTypes.find((rt: any) => rt.type === selectedHotel.roomConfiguration.roomType)
              const nightlyCost = (roomType?.pricePerNight || 0) * selectedHotel.roomConfiguration.rooms
              const totalCost = nightlyCost * selectedHotel.nights

              return (
                <Card key={index} className="border-blue-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{hotel.name}</CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeHotel(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Nights</Label>
                        <div className="flex items-center space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => updateHotelNights(index, selectedHotel.nights - 1)}
                            disabled={selectedHotel.nights <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            value={selectedHotel.nights}
                            onChange={(e) => updateHotelNights(index, parseInt(e.target.value) || 1)}
                            className="w-20 text-center"
                            min={1}
                            max={duration - 1}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => updateHotelNights(index, selectedHotel.nights + 1)}
                            disabled={totalNights >= duration - 1}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Room Type</Label>
                        <Select
                          value={selectedHotel.roomConfiguration.roomType}
                          onValueChange={(value) => updateRoomConfig(index, 'roomType', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {hotel.roomTypes.map((roomType: any) => (
                              <SelectItem key={roomType.type} value={roomType.type}>
                                {roomType.type} - {formatCurrency(roomType.pricePerNight)}/night
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Rooms</Label>
                        <Input
                          type="number"
                          value={selectedHotel.roomConfiguration.rooms}
                          onChange={(e) => updateRoomConfig(index, 'rooms', parseInt(e.target.value) || 1)}
                          min={1}
                          max={totalPax}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="text-sm text-gray-600">
                        {formatCurrency(nightlyCost)} × {selectedHotel.nights} nights
                      </div>
                      <div className="text-lg font-semibold text-blue-600">
                        {formatCurrency(totalCost)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Available Hotels */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHotels.map((hotel) => {
            const isSelected = selectedHotels.some((sh: any) => sh.hotelId === hotel.id)
            
            return (
              <Card
                key={hotel.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  isSelected ? 'ring-2 ring-blue-500 opacity-50' : 'hover:ring-1 hover:ring-gray-300'
                }`}
                onClick={() => !isSelected && totalNights < duration - 1 && addHotel(hotel)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{hotel.name}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex items-center">
                          {[...Array(hotel.rating)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                        <Badge variant="outline">{hotel.location}</Badge>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">{hotel.description}</p>
                  
                  <div className="flex flex-wrap gap-1">
                    {hotel.amenities.slice(0, 4).map((amenity, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                  </div>

                  <div className="pt-3 border-t">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Starting from</p>
                      <p className="text-lg font-bold text-blue-600">
                        {formatCurrency(hotel.pricePerNight)}/night
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    className="w-full"
                    disabled={isSelected || totalNights >= duration - 1}
                    onClick={(e) => {
                      e.stopPropagation()
                      addHotel(hotel)
                    }}
                  >
                    {isSelected ? 'Already Selected' : totalNights >= duration - 1 ? 'All Nights Booked' : 'Add Hotel'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Add-ons Selection */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-gray-900">Optional Add-ons</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mockAddOns.map((addOn) => {
            const selectedAddOn = selectedAddOns.find((a: any) => a.addOnId === addOn.id)
            const isSelected = !!selectedAddOn
            
            return (
              <Card
                key={addOn.id}
                className={`cursor-pointer transition-all duration-200 ${
                  isSelected ? 'ring-2 ring-green-500 bg-green-50' : 'hover:shadow-md'
                }`}
                onClick={() => toggleAddOn(addOn)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{addOn.name}</CardTitle>
                      <Badge variant="outline" className="mt-1">{addOn.category}</Badge>
                    </div>
                    {isSelected && (
                      <Check className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">{addOn.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-blue-600">
                        {formatCurrency(addOn.price)}
                      </p>
                      <p className="text-sm text-gray-500">{addOn.unit}</p>
                    </div>
                    
                    {isSelected && (
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            updateAddOnQuantity(addOn.id, selectedAddOn.quantity - 1)
                          }}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center">{selectedAddOn.quantity}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            updateAddOnQuantity(addOn.id, selectedAddOn.quantity + 1)
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Cost Summary */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Customization Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Hotels ({totalNights} nights)</span>
            <span className="font-medium">{formatCurrency(getTotalHotelCost())}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Add-ons ({selectedAddOns.length} items)</span>
            <span className="font-medium">{formatCurrency(getTotalAddOnCost())}</span>
          </div>
          <div className="border-t pt-3">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Customization Total</span>
              <span className="text-blue-600">{formatCurrency(getTotalHotelCost() + getTotalAddOnCost())}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Messages */}
      {totalNights < duration - 1 && (
        <div className="bg-amber-50 p-4 rounded-lg">
          <p className="text-amber-800 text-sm font-medium">
            You need to book {duration - 1 - totalNights} more night(s) to complete your itinerary.
          </p>
        </div>
      )}

      {totalNights > duration - 1 && (
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-red-800 text-sm font-medium">
            You have booked {totalNights - (duration - 1)} extra night(s). Please adjust your hotel selection.
          </p>
        </div>
      )}
    </div>
  )
}

export default CustomizationStep