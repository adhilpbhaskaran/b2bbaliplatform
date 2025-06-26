'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Calendar,
  MapPin,
  Package,
  DollarSign,
  FileText,
  Check,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCreateQuote, useCalculateQuote, usePackages } from '@/hooks/useApi'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

// Import step components (we'll create these)
import BasicInfoStep from '@/components/quote-builder/BasicInfoStep'
import PaxDetailsStep from '@/components/quote-builder/PaxDetailsStep'
import PackageSelectionStep from '@/components/quote-builder/PackageSelectionStep'
import CustomizationStep from '@/components/quote-builder/CustomizationStep'
import ReviewStep from '@/components/quote-builder/ReviewStep'

// Form validation schema
const quoteBuilderSchema = z.object({
  clientName: z.string().min(2, 'Client name is required'),
  clientEmail: z.string().email('Valid email is required'),
  clientPhone: z.string().min(10, 'Valid phone number is required'),
  travelDate: z.string().min(1, 'Travel date is required'),
  duration: z.number().min(1, 'Duration must be at least 1 day'),
  adults: z.number().min(1, 'At least 1 adult is required'),
  children: z.number().min(0),
  infants: z.number().min(0),
  selectedPackage: z.string().min(1, 'Package selection is required'),
  selectedHotels: z.array(z.object({
    location: z.string(),
    hotelId: z.string(),
    roomType: z.string(),
    nights: z.number(),
  })),
  selectedAddOns: z.array(z.object({
    id: z.string(),
    quantity: z.number(),
  })),
  specialRequests: z.string().optional(),
  notes: z.string().optional(),
})

type QuoteBuilderForm = z.infer<typeof quoteBuilderSchema>

const QuoteBuilderPage = () => {
  const { isSignedIn, user, isLoaded } = useUser()
  const [currentStep, setCurrentStep] = useState(1)
  const [calculatedQuote, setCalculatedQuote] = useState<any>(null)
  
  // Redirect if not authenticated
  if (isLoaded && !isSignedIn) {
    redirect('/sign-in')
  }

  const methods = useForm<QuoteBuilderForm>({
    resolver: zodResolver(quoteBuilderSchema),
    defaultValues: {
      adults: 2,
      children: 0,
      infants: 0,
      duration: 3,
      selectedHotels: [],
      selectedAddOns: [],
      specialRequests: '',
      notes: '',
    },
  })

  const { data: packages } = usePackages()
  const createQuoteMutation = useCreateQuote()
  const calculateQuoteMutation = useCalculateQuote()

  const steps = [
    {
      number: 1,
      title: 'Basic Info',
      description: 'Client details and travel dates',
      icon: Users,
      component: BasicInfoStep,
    },
    {
      number: 2,
      title: 'Pax Details',
      description: 'Number of travelers and requirements',
      icon: Users,
      component: PaxDetailsStep,
    },
    {
      number: 3,
      title: 'Package Selection',
      description: 'Choose the perfect package',
      icon: Package,
      component: PackageSelectionStep,
    },
    {
      number: 4,
      title: 'Customization',
      description: 'Hotels, add-ons, and preferences',
      icon: MapPin,
      component: CustomizationStep,
    },
    {
      number: 5,
      title: 'Review & Create',
      description: 'Final review and quote generation',
      icon: FileText,
      component: ReviewStep,
    },
  ]

  const currentStepData = steps[currentStep - 1]
  const CurrentStepComponent = currentStepData.component

  const handleNext = async () => {
    const isValid = await methods.trigger()
    if (!isValid) {
      toast.error('Please fill in all required fields')
      return
    }

    if (currentStep === 4) {
      // Calculate quote before moving to review
      const formData = methods.getValues()
      try {
        const result = await calculateQuoteMutation.mutateAsync(formData)
        setCalculatedQuote(result.data.data)
        setCurrentStep(currentStep + 1)
      } catch (error) {
        toast.error('Failed to calculate quote')
      }
    } else if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async (data: QuoteBuilderForm) => {
    try {
      await createQuoteMutation.mutateAsync(data)
      toast.success('Quote created successfully!')
      // Redirect to quotes page or show success modal
    } catch (error) {
      toast.error('Failed to create quote')
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Create New Quote
            </h1>
            <p className="text-gray-600">
              Build a customized travel quote for your client in 5 easy steps.
            </p>
          </motion.div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.number
              const isCompleted = currentStep > step.number
              
              return (
                <div key={step.number} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors ${
                        isCompleted
                          ? 'bg-green-500 border-green-500 text-white'
                          : isActive
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'bg-white border-gray-300 text-gray-400'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <p
                        className={`text-sm font-medium ${
                          isActive ? 'text-blue-600' : 'text-gray-600'
                        }`}
                      >
                        {step.title}
                      </p>
                      <p className="text-xs text-gray-500 hidden sm:block">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-4 ${
                        currentStep > step.number ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Form Content */}
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(handleSubmit)}>
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <currentStepData.icon className="w-5 h-5 mr-2" />
                  Step {currentStep}: {currentStepData.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CurrentStepComponent
                      packages={packages}
                      calculatedQuote={calculatedQuote}
                    />
                  </motion.div>
                </AnimatePresence>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="flex items-center"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <div className="flex items-center space-x-2">
                <Badge variant="outline">
                  Step {currentStep} of {steps.length}
                </Badge>
              </div>

              {currentStep === steps.length ? (
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  loading={createQuoteMutation.isPending}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Create Quote
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleNext}
                  loading={calculateQuoteMutation.isPending && currentStep === 4}
                  className="flex items-center"
                >
                  {currentStep === 4 ? 'Calculate & Review' : 'Next'}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </form>
        </FormProvider>

        {/* Quote Summary Sidebar (for steps 2-5) */}
        {currentStep > 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="fixed right-4 top-1/2 transform -translate-y-1/2 w-80 hidden xl:block"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Quote Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {methods.watch('clientName') && (
                    <div>
                      <p className="text-sm text-gray-600">Client</p>
                      <p className="font-medium">{methods.watch('clientName')}</p>
                    </div>
                  )}
                  {methods.watch('travelDate') && (
                    <div>
                      <p className="text-sm text-gray-600">Travel Date</p>
                      <p className="font-medium">{methods.watch('travelDate')}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Travelers</p>
                    <p className="font-medium">
                      {methods.watch('adults')} Adults
                      {methods.watch('children') > 0 && `, ${methods.watch('children')} Children`}
                      {methods.watch('infants') > 0 && `, ${methods.watch('infants')} Infants`}
                    </p>
                  </div>
                  {calculatedQuote && (
                    <div className="pt-3 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold">Total</span>
                        <span className="text-lg font-bold text-green-600">
                          {formatCurrency(calculatedQuote.totalAmount)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default QuoteBuilderPage