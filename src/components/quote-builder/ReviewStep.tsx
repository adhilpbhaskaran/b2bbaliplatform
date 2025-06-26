'use client'

import { useFormContext } from 'react-hook-form'
import { useState } from 'react'
import { Calendar, Users, MapPin, Hotel, Plus, Download, Send, Edit, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { usePackages, useCalculateQuote, useGenerateQuotePDF } from '@/hooks/useApi'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'

const ReviewStep = () => {
  const { watch, setValue } = useFormContext()
  const [notes, setNotes] = useState('')
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isSendingQuote, setIsSendingQuote] = useState(false)
  
  // Get form data
  const formData = watch()
  const {
    clientName,
    clientEmail,
    clientPhone,
    travelDate,
    duration,
    paxDetails = [],
    packageId,
    selectedHotels = [],
    selectedAddOns = []
  } = formData

  const { data: packages } = usePackages()
  const selectedPackage = packages?.find(p => p.id === packageId)

  // Calculate quote
  const { data: calculatedQuote, isLoading: isCalculating } = useCalculateQuote({
    packageId,
    paxDetails,
    duration,
    selectedHotels,
    selectedAddOns,
    travelDate
  })

  const { mutate: generatePDF } = useGenerateQuotePDF()

  // Summary calculations
  const totalPax = paxDetails.length
  const adults = paxDetails.filter((p: any) => p.type === 'adult').length
  const children = paxDetails.filter((p: any) => p.type === 'child').length
  const infants = paxDetails.filter((p: any) => p.type === 'infant').length
  const totalNights = selectedHotels.reduce((sum: number, hotel: any) => sum + hotel.nights, 0)

  const handleGeneratePDF = async () => {
    if (!calculatedQuote) {
      toast.error('Please wait for quote calculation to complete')
      return
    }

    setIsGeneratingPDF(true)
    try {
      generatePDF({
        quoteData: {
          ...formData,
          calculatedQuote,
          notes
        }
      }, {
        onSuccess: (data) => {
          // Download PDF
          const link = document.createElement('a')
          link.href = data.pdfUrl
          link.download = `quote-${clientName.replace(/\s+/g, '-')}-${Date.now()}.pdf`
          link.click()
          toast.success('PDF generated successfully!')
        },
        onError: (error) => {
          toast.error('Failed to generate PDF')
          console.error('PDF generation error:', error)
        },
        onSettled: () => {
          setIsGeneratingPDF(false)
        }
      })
    } catch (error) {
      setIsGeneratingPDF(false)
      toast.error('Failed to generate PDF')
    }
  }

  const handleSendQuote = async () => {
    if (!calculatedQuote) {
      toast.error('Please wait for quote calculation to complete')
      return
    }

    setIsSendingQuote(true)
    try {
      // This would typically call an API to send the quote via email
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate API call
      toast.success(`Quote sent to ${clientEmail} successfully!`)
    } catch (error) {
      toast.error('Failed to send quote')
    } finally {
      setIsSendingQuote(false)
    }
  }

  if (isCalculating) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Calculating your quote...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Quote Summary Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-2">Quote Summary</h2>
        <p className="text-blue-100">Review your customized Bali travel package</p>
      </div>

      {/* Client Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Client Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Client Name</p>
              <p className="font-medium">{clientName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{clientEmail}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="font-medium">{clientPhone}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trip Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Trip Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Travel Date</p>
              <p className="font-medium">{formatDate(travelDate)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Duration</p>
              <p className="font-medium">{duration} Days / {duration - 1} Nights</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Passengers</p>
              <p className="font-medium">{totalPax} Pax</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Breakdown</p>
              <p className="font-medium">
                {adults} Adults{children > 0 && `, ${children} Children`}{infants > 0 && `, ${infants} Infants`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Package Details */}
      {selectedPackage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Selected Package</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{selectedPackage.name}</h3>
                <p className="text-gray-600">{selectedPackage.description}</p>
                <Badge variant="outline" className="mt-2">{selectedPackage.category}</Badge>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Package Highlights:</h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-1 text-sm text-gray-600">
                  {selectedPackage.highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Passenger Details */}
      <Card>
        <CardHeader>
          <CardTitle>Passenger Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {paxDetails.map((pax: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{pax.name}</p>
                  <p className="text-sm text-gray-600 capitalize">{pax.type} • {pax.age} years old</p>
                </div>
                <Badge variant={pax.type === 'adult' ? 'default' : pax.type === 'child' ? 'secondary' : 'outline'}>
                  {pax.type}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Hotel Selection */}
      {selectedHotels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Hotel className="h-5 w-5" />
              <span>Hotel Selection</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedHotels.map((selectedHotel: any, index: number) => {
                const hotel = selectedHotel.hotel
                const roomType = hotel.roomTypes.find((rt: any) => rt.type === selectedHotel.roomConfiguration.roomType)
                const nightlyCost = (roomType?.pricePerNight || 0) * selectedHotel.roomConfiguration.rooms
                const totalCost = nightlyCost * selectedHotel.nights

                return (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">{hotel.name}</h4>
                        <p className="text-sm text-gray-600">{hotel.location} • {hotel.rating} Stars</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-blue-600">{formatCurrency(totalCost)}</p>
                        <p className="text-sm text-gray-600">{selectedHotel.nights} nights</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Room Type</p>
                        <p className="font-medium">{selectedHotel.roomConfiguration.roomType}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Rooms</p>
                        <p className="font-medium">{selectedHotel.roomConfiguration.rooms} rooms</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Rate per Night</p>
                        <p className="font-medium">{formatCurrency(nightlyCost)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add-ons */}
      {selectedAddOns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>Selected Add-ons</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedAddOns.map((selectedAddOn: any, index: number) => {
                const addOn = selectedAddOn.addOn
                const totalCost = addOn.price * selectedAddOn.quantity

                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{addOn.name}</p>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(addOn.price)} {addOn.unit} × {selectedAddOn.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-blue-600">{formatCurrency(totalCost)}</p>
                      <Badge variant="outline" className="text-xs">{addOn.category}</Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing Breakdown */}
      {calculatedQuote && (
        <Card>
          <CardHeader>
            <CardTitle>Pricing Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Package Base Cost</span>
                <span className="font-medium">{formatCurrency(calculatedQuote.packageCost)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Hotels ({totalNights} nights)</span>
                <span className="font-medium">{formatCurrency(calculatedQuote.hotelCost)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Add-ons</span>
                <span className="font-medium">{formatCurrency(calculatedQuote.addOnCost)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Vehicle & Transportation</span>
                <span className="font-medium">{formatCurrency(calculatedQuote.vehicleCost)}</span>
              </div>
              {calculatedQuote.discount > 0 && (
                <div className="flex justify-between items-center text-green-600">
                  <span>Agent Tier Discount</span>
                  <span className="font-medium">-{formatCurrency(calculatedQuote.discount)}</span>
                </div>
              )}
              <div className="border-t pt-3">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total Amount</span>
                  <span className="text-blue-600">{formatCurrency(calculatedQuote.totalAmount)}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {formatCurrency(calculatedQuote.totalAmount / totalPax)} per person
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Label htmlFor="notes">Special Requests or Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any special requests, dietary requirements, or additional information..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleGeneratePDF}
          disabled={isGeneratingPDF || !calculatedQuote}
          className="flex items-center space-x-2"
        >
          <Download className="h-4 w-4" />
          <span>{isGeneratingPDF ? 'Generating...' : 'Download PDF'}</span>
        </Button>
        
        <Button
          type="button"
          onClick={handleSendQuote}
          disabled={isSendingQuote || !calculatedQuote}
          className="flex items-center space-x-2"
        >
          <Send className="h-4 w-4" />
          <span>{isSendingQuote ? 'Sending...' : 'Send Quote to Client'}</span>
        </Button>
      </div>

      {/* Important Information */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">Important Information</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• This quote is valid for 30 days from the date of generation</li>
          <li>• Prices are subject to availability and may change based on booking date</li>
          <li>• A deposit of 30% is required to confirm the booking</li>
          <li>• Final payment is due 14 days before departure</li>
          <li>• Cancellation policy applies as per terms and conditions</li>
        </ul>
      </div>
    </div>
  )
}

export default ReviewStep