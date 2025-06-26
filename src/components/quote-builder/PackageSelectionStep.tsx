'use client'

import { useFormContext } from 'react-hook-form'
import { useState } from 'react'
import { Check, Clock, MapPin, Star, Users, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { usePackages } from '@/hooks/useApi'
import { Package } from '@/types'
import { formatCurrency } from '@/lib/utils'

const PackageSelectionStep = () => {
  const { setValue, watch } = useFormContext()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  
  const selectedPackageId = watch('packageId')
  const duration = watch('duration') || 3
  const paxDetails = watch('paxDetails') || []
  const totalPax = paxDetails.length

  const { data: packages, isLoading } = usePackages()

  const categories = [
    { id: 'all', name: 'All Packages', count: packages?.length || 0 },
    { id: 'cultural', name: 'Cultural', count: packages?.filter(p => p.category === 'cultural').length || 0 },
    { id: 'adventure', name: 'Adventure', count: packages?.filter(p => p.category === 'adventure').length || 0 },
    { id: 'relaxation', name: 'Relaxation', count: packages?.filter(p => p.category === 'relaxation').length || 0 },
    { id: 'family', name: 'Family', count: packages?.filter(p => p.category === 'family').length || 0 },
    { id: 'luxury', name: 'Luxury', count: packages?.filter(p => p.category === 'luxury').length || 0 },
  ]

  const filteredPackages = packages?.filter(pkg => 
    selectedCategory === 'all' || pkg.category === selectedCategory
  ) || []

  const selectPackage = (packageId: string) => {
    setValue('packageId', packageId)
  }

  const getPackagePrice = (pkg: Package) => {
    // Base price calculation (simplified)
    const basePrice = pkg.basePrice * duration * totalPax
    return basePrice
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading packages...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Trip Summary */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">Trip Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="text-blue-800">{duration} Days</span>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="text-blue-800">{totalPax} Passengers</span>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            <span className="text-blue-800">Bali, Indonesia</span>
          </div>
          <div className="flex items-center space-x-2">
            <Star className="h-4 w-4 text-blue-600" />
            <span className="text-blue-800">Premium Experience</span>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="space-y-3">
        <h3 className="font-medium text-gray-900">Package Categories</h3>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category.id}
              type="button"
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className="flex items-center space-x-2"
            >
              <span>{category.name}</span>
              <Badge variant="secondary" className="ml-1">
                {category.count}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {/* Package Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPackages.map((pkg) => {
          const isSelected = selectedPackageId === pkg.id
          const estimatedPrice = getPackagePrice(pkg)

          return (
            <Card
              key={pkg.id}
              className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg ${
                isSelected
                  ? 'ring-2 ring-blue-500 shadow-lg'
                  : 'hover:ring-1 hover:ring-gray-300'
              }`}
              onClick={() => selectPackage(pkg.id)}
            >
              {isSelected && (
                <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-1">
                  <Check className="h-4 w-4" />
                </div>
              )}

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                      {pkg.name}
                    </CardTitle>
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {pkg.category}
                      </Badge>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-gray-500" />
                        <span className="text-xs text-gray-500">
                          {pkg.minDuration}-{pkg.maxDuration} days
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Description */}
                <p className="text-sm text-gray-600 line-clamp-3">
                  {pkg.description}
                </p>

                {/* Highlights */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900">Highlights:</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {pkg.highlights.slice(0, 3).map((highlight, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <Star className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                    {pkg.highlights.length > 3 && (
                      <li className="text-blue-600 text-xs">
                        +{pkg.highlights.length - 3} more highlights
                      </li>
                    )}
                  </ul>
                </div>

                {/* Inclusions */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900">Includes:</h4>
                  <div className="flex flex-wrap gap-1">
                    {pkg.inclusions.slice(0, 4).map((inclusion, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {inclusion}
                      </Badge>
                    ))}
                    {pkg.inclusions.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{pkg.inclusions.length - 4} more
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Pricing */}
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Starting from</p>
                      <p className="text-sm font-medium text-gray-600">
                        {formatCurrency(pkg.basePrice)} / person / day
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Estimated Total</p>
                      <p className="text-lg font-bold text-blue-600">
                        {formatCurrency(estimatedPrice)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Select Button */}
                <Button
                  type="button"
                  className={`w-full ${
                    isSelected
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation()
                    selectPackage(pkg.id)
                  }}
                >
                  {isSelected ? 'Selected' : 'Select Package'}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* No packages found */}
      {filteredPackages.length === 0 && (
        <div className="text-center py-12">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No packages found
          </h3>
          <p className="text-gray-600 mb-4">
            No packages match your selected category. Try selecting a different category.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setSelectedCategory('all')}
          >
            View All Packages
          </Button>
        </div>
      )}

      {/* Selection Required */}
      {!selectedPackageId && (
        <div className="bg-amber-50 p-4 rounded-lg">
          <p className="text-amber-800 text-sm font-medium">
            Please select a package to continue with your quote.
          </p>
        </div>
      )}

      {/* Package Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">Package Information</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Prices shown are estimates based on your group size and duration</li>
          <li>• Final pricing will be calculated in the next step with hotel selection</li>
          <li>• All packages can be customized to your preferences</li>
          <li>• Seasonal pricing and availability may apply</li>
        </ul>
      </div>
    </div>
  )
}

export default PackageSelectionStep