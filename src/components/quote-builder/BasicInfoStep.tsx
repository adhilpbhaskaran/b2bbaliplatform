'use client'

import { useFormContext } from 'react-hook-form'
import { Calendar, Mail, Phone, User } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const BasicInfoStep = () => {
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext()

  const duration = watch('duration')

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Client Name */}
        <div className="space-y-2">
          <Label htmlFor="clientName">Client Name *</Label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="clientName"
              placeholder="Enter client's full name"
              className="pl-10"
              {...register('clientName')}
              error={errors.clientName?.message as string}
            />
          </div>
        </div>

        {/* Client Email */}
        <div className="space-y-2">
          <Label htmlFor="clientEmail">Client Email *</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="clientEmail"
              type="email"
              placeholder="client@example.com"
              className="pl-10"
              {...register('clientEmail')}
              error={errors.clientEmail?.message as string}
            />
          </div>
        </div>

        {/* Client Phone */}
        <div className="space-y-2">
          <Label htmlFor="clientPhone">Client Phone *</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="clientPhone"
              placeholder="+1 (555) 123-4567"
              className="pl-10"
              {...register('clientPhone')}
              error={errors.clientPhone?.message as string}
            />
          </div>
        </div>

        {/* Travel Date */}
        <div className="space-y-2">
          <Label htmlFor="travelDate">Travel Date *</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="travelDate"
              type="date"
              className="pl-10"
              {...register('travelDate')}
              error={errors.travelDate?.message as string}
              min={new Date().toISOString().split('T')[0]} // Prevent past dates
            />
          </div>
        </div>
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <Label htmlFor="duration">Trip Duration *</Label>
        <Select
          value={duration?.toString()}
          onValueChange={(value) => setValue('duration', parseInt(value))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select trip duration" />
          </SelectTrigger>
          <SelectContent>
            {[...Array(14)].map((_, i) => {
              const days = i + 1
              return (
                <SelectItem key={days} value={days.toString()}>
                  {days} {days === 1 ? 'Day' : 'Days'}
                  {days > 1 && ` (${days - 1} ${days === 2 ? 'Night' : 'Nights'})`}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
        {errors.duration && (
          <p className="text-red-600 text-sm">{errors.duration.message as string}</p>
        )}
      </div>

      {/* Additional Information */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">Important Notes</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• All fields marked with * are required</li>
          <li>• Travel date should be at least 7 days from today for best rates</li>
          <li>• Client contact information will be used for booking confirmations</li>
          <li>• You can modify these details later if needed</li>
        </ul>
      </div>
    </div>
  )
}

export default BasicInfoStep