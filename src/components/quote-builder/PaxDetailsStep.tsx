'use client'

import { useFormContext, useFieldArray } from 'react-hook-form'
import { Plus, Trash2, Users, Baby, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const PaxDetailsStep = () => {
  const {
    register,
    control,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext()

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'paxDetails',
  })

  const paxDetails = watch('paxDetails') || []
  const totalPax = paxDetails.length
  const adults = paxDetails.filter((p: any) => p.type === 'adult').length
  const children = paxDetails.filter((p: any) => p.type === 'child').length
  const infants = paxDetails.filter((p: any) => p.type === 'infant').length

  const addPax = (type: 'adult' | 'child' | 'infant') => {
    append({
      name: '',
      type,
      age: type === 'adult' ? 25 : type === 'child' ? 8 : 1,
    })
  }

  const removePax = (index: number) => {
    if (totalPax > 1) {
      remove(index)
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Pax</p>
                <p className="text-2xl font-bold text-blue-600">{totalPax}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Adults</p>
                <p className="text-2xl font-bold text-green-600">{adults}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Children</p>
                <p className="text-2xl font-bold text-orange-600">{children}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Baby className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Infants</p>
                <p className="text-2xl font-bold text-purple-600">{infants}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Passenger Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => addPax('adult')}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Adult</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => addPax('child')}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Child (2-11 years)</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => addPax('infant')}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Infant (0-2 years)</span>
        </Button>
      </div>

      {/* Passenger Details */}
      <div className="space-y-4">
        {fields.map((field, index) => {
          const pax = paxDetails[index]
          const paxType = pax?.type || 'adult'
          
          return (
            <Card key={field.id} className="relative">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center space-x-2">
                    {paxType === 'adult' && <User className="h-5 w-5 text-green-600" />}
                    {paxType === 'child' && <User className="h-5 w-5 text-orange-600" />}
                    {paxType === 'infant' && <Baby className="h-5 w-5 text-purple-600" />}
                    <span className="capitalize">
                      {paxType} {index + 1}
                    </span>
                  </div>
                  {totalPax > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePax(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor={`paxDetails.${index}.name`}>Full Name *</Label>
                    <Input
                      placeholder="Enter full name"
                      {...register(`paxDetails.${index}.name`)}
                      error={errors.paxDetails?.[index]?.name?.message as string}
                    />
                  </div>

                  {/* Type */}
                  <div className="space-y-2">
                    <Label htmlFor={`paxDetails.${index}.type`}>Type *</Label>
                    <Select
                      value={paxType}
                      onValueChange={(value) => {
                        setValue(`paxDetails.${index}.type`, value)
                        // Auto-set age based on type
                        if (value === 'adult') setValue(`paxDetails.${index}.age`, 25)
                        if (value === 'child') setValue(`paxDetails.${index}.age`, 8)
                        if (value === 'infant') setValue(`paxDetails.${index}.age`, 1)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="adult">Adult (12+ years)</SelectItem>
                        <SelectItem value="child">Child (2-11 years)</SelectItem>
                        <SelectItem value="infant">Infant (0-2 years)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Age */}
                  <div className="space-y-2">
                    <Label htmlFor={`paxDetails.${index}.age`}>Age *</Label>
                    <Input
                      type="number"
                      min={paxType === 'infant' ? 0 : paxType === 'child' ? 2 : 12}
                      max={paxType === 'infant' ? 2 : paxType === 'child' ? 11 : 100}
                      placeholder="Age"
                      {...register(`paxDetails.${index}.age`, {
                        valueAsNumber: true,
                      })}
                      error={errors.paxDetails?.[index]?.age?.message as string}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Information */}
      <div className="bg-amber-50 p-4 rounded-lg">
        <h3 className="font-medium text-amber-900 mb-2">Passenger Information Guidelines</h3>
        <ul className="text-sm text-amber-800 space-y-1">
          <li>• <strong>Adults:</strong> 12 years and above (full pricing)</li>
          <li>• <strong>Children:</strong> 2-11 years (reduced pricing, own bed)</li>
          <li>• <strong>Infants:</strong> 0-2 years (minimal charges, no bed)</li>
          <li>• Names should match passport/ID for international travel</li>
          <li>• At least one adult is required per booking</li>
        </ul>
      </div>

      {/* Minimum requirement check */}
      {totalPax === 0 && (
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-red-800 text-sm font-medium">
            Please add at least one passenger to continue.
          </p>
        </div>
      )}
    </div>
  )
}

export default PaxDetailsStep