'use client'

import { useFormContext } from 'react-hook-form'
import { Calendar, Users, MapPin, Hotel, Plus, Calculator, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { usePackages, useCalculateQuote } from '@/hooks/useApi'
import { formatCurrency, formatDate } from '@/lib/utils'

interface QuoteSummaryProps {
  currentStep: number
  onStepChange: (step: number) => void
}

const QuoteSummary = ({ currentStep, onStepChange }: QuoteSummaryProps) => {
  const { watch } = useFormContext()
  
  // Get form data
  const formData = watch()
  const {
    clientName,
    travelDate,
    duration,
    paxDetails = [],
    packageId,
    selectedHotels = [],
    selectedAddOns = []
  } = formData

  const { data: packages } = usePackages()
  const selectedPackage = packages?.find(p => p.id === packageId)

  // Calculate quote if we have enough data
  const shouldCalculate = packageId && paxDetails.length > 0 && duration
  const { data: calculatedQuote, isLoading: isCalculating } = useCalculateQuote(
    shouldCalculate ? {
      packageId,
      paxDetails,
      duration,
      selectedHotels,
      selectedAddOns,
      travelDate
    } : undefined
  )

  // Summary calculations
  const totalPax = paxDetails.length
  const adults = paxDetails.filter((p: any) => p.type === 'adult').length
  const children = paxDetails.filter((p: any) => p.type === 'child').length
  const infants = paxDetails.filter((p: any) => p.type === 'infant').length
  const totalNights = selectedHotels.reduce((sum: number, hotel: any) => sum + hotel.nights, 0)

  // Step completion status
  const stepStatus = {
    0: !!clientName && !!travelDate && !!duration, // Basic Info
    1: paxDetails.length > 0, // Pax Details
    2: !!packageId, // Package Selection
    3: selectedHotels.length > 0 || selectedAddOns.length > 0, // Customization
    4: true // Review (always accessible if previous steps are complete)
  }

  const canAccessStep = (step: number) => {
    for (let i = 0; i < step; i++) {
      if (!stepStatus[i as keyof typeof stepStatus]) return false
    }
    return true
  }

  const steps = [
    { id: 0, name: 'Basic Info', icon: Calendar },
    { id: 1, name: 'Passengers', icon: Users },
    { id: 2, name: 'Package', icon: MapPin },
    { id: 3, name: 'Customize', icon: Hotel },
    { id: 4, name: 'Review', icon: Calculator }
  ]

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quote Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {steps.map((step) => {
              const Icon = step.icon
              const isCompleted = stepStatus[step.id as keyof typeof stepStatus]
              const isCurrent = currentStep === step.id
              const canAccess = canAccessStep(step.id)
              
              return (
                <button
                  key={step.id}
                  onClick={() => canAccess && onStepChange(step.id)}
                  disabled={!canAccess}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors ${
                    isCurrent
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : isCompleted
                      ? 'bg-green-50 text-green-700 hover:bg-green-100'
                      : canAccess
                      ? 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{step.name}</span>
                  {isCompleted && (
                    <div className="ml-auto w-2 h-2 bg-green-500 rounded-full"></div>
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Trip Summary */}
      {(clientName || travelDate || duration || totalPax > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Trip Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {clientName && (
              <div>
                <p className="text-sm text-gray-600">Client</p>
                <p className="font-medium">{clientName}</p>
              </div>
            )}
            
            {travelDate && (
              <div>
                <p className="text-sm text-gray-600">Travel Date</p>
                <p className="font-medium">{formatDate(travelDate)}</p>
              </div>
            )}
            
            {duration && (
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="font-medium">{duration} Days / {duration - 1} Nights</p>
              </div>
            )}
            
            {totalPax > 0 && (
              <div>
                <p className="text-sm text-gray-600">Passengers</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {adults > 0 && <Badge variant="default">{adults} Adults</Badge>}
                  {children > 0 && <Badge variant="secondary">{children} Children</Badge>}
                  {infants > 0 && <Badge variant="outline">{infants} Infants</Badge>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Package Summary */}
      {selectedPackage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Selected Package</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold">{selectedPackage.name}</h3>
                <Badge variant="outline" className="mt-1">{selectedPackage.category}</Badge>
              </div>
              <p className="text-sm text-gray-600 line-clamp-3">
                {selectedPackage.description}
              </p>
              <div>
                <p className="text-sm text-gray-600">Base Price</p>
                <p className="font-medium text-blue-600">
                  {formatCurrency(selectedPackage.basePrice)} / person / day
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hotels Summary */}
      {selectedHotels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Hotel className="h-5 w-5" />
              <span>Hotels ({totalNights} nights)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedHotels.map((selectedHotel: any, index: number) => {
                const hotel = selectedHotel.hotel
                const roomType = hotel.roomTypes.find((rt: any) => rt.type === selectedHotel.roomConfiguration.roomType)
                const nightlyCost = (roomType?.pricePerNight || 0) * selectedHotel.roomConfiguration.rooms
                const totalCost = nightlyCost * selectedHotel.nights

                return (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-sm">{hotel.name}</p>
                        <p className="text-xs text-gray-600">{hotel.location}</p>
                      </div>
                      <p className="text-sm font-semibold text-blue-600">
                        {formatCurrency(totalCost)}
                      </p>
                    </div>
                    <div className="text-xs text-gray-600">
                      {selectedHotel.nights} nights • {selectedHotel.roomConfiguration.rooms} rooms
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add-ons Summary */}
      {selectedAddOns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>Add-ons ({selectedAddOns.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedAddOns.map((selectedAddOn: any, index: number) => {
                const addOn = selectedAddOn.addOn
                const totalCost = addOn.price * selectedAddOn.quantity

                return (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <p className="text-sm font-medium">{addOn.name}</p>
                      <p className="text-xs text-gray-600">Qty: {selectedAddOn.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-blue-600">
                      {formatCurrency(totalCost)}
                    </p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Price Summary */}
      {shouldCalculate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Calculator className="h-5 w-5" />
              <span>Price Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isCalculating ? (
              <div className="flex items-center space-x-2 py-4">
                <Clock className="h-4 w-4 animate-spin" />
                <span className="text-sm text-gray-600">Calculating...</span>
              </div>
            ) : calculatedQuote ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Package Cost</span>
                  <span>{formatCurrency(calculatedQuote.packageCost)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Hotels</span>
                  <span>{formatCurrency(calculatedQuote.hotelCost)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Add-ons</span>
                  <span>{formatCurrency(calculatedQuote.addOnCost)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Transport</span>
                  <span>{formatCurrency(calculatedQuote.vehicleCost)}</span>
                </div>
                {calculatedQuote.discount > 0 && (
                  <div className="flex justify-between items-center text-sm text-green-600">
                    <span>Tier Discount</span>
                    <span>-{formatCurrency(calculatedQuote.discount)}</span>
                  </div>
                )}
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center font-semibold">
                    <span>Total</span>
                    <span className="text-blue-600">
                      {formatCurrency(calculatedQuote.totalAmount)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {formatCurrency(calculatedQuote.totalAmount / totalPax)} per person
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600 py-4">
                Complete the form to see pricing
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => onStepChange(4)}
              disabled={!canAccessStep(4)}
            >
              <Calculator className="h-4 w-4 mr-2" />
              Jump to Review
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                // Reset form logic would go here
                window.location.reload()
              }}
            >
              <Clock className="h-4 w-4 mr-2" />
              Start Over
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Help */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p className="text-gray-600">
              Having trouble with your quote? Our support team is here to help.
            </p>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                📞 Call Support
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                💬 Live Chat
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                📧 Email Us
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default QuoteSummary