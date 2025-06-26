// Core Types
export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

export type UserRole = 'admin' | 'agent' | 'customer'

// Package Types
export interface Package {
  id: string
  title: string
  description: string
  shortDescription: string
  price: number
  originalPrice?: number
  duration: string
  maxGroupSize: number
  minAge: number
  difficulty: DifficultyLevel
  images: string[]
  features: string[]
  inclusions: string[]
  exclusions: string[]
  itinerary: ItineraryDay[]
  category: PackageCategory
  tags: string[]
  location: Location
  rating: number
  reviewCount: number
  isActive: boolean
  isFeatured: boolean
  createdAt: Date
  updatedAt: Date
}

export type PackageCategory = 'adventure' | 'cultural' | 'relaxation' | 'luxury' | 'family' | 'romantic' | 'spiritual'
export type DifficultyLevel = 'easy' | 'moderate' | 'challenging' | 'extreme'

export interface ItineraryDay {
  day: number
  title: string
  description: string
  activities: string[]
  meals: MealType[]
  accommodation?: string
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface Location {
  name: string
  region: string
  coordinates: {
    lat: number
    lng: number
  }
  description?: string
}

// Booking Types
export interface Booking {
  id: string
  packageId: string
  userId: string
  status: BookingStatus
  travelers: Traveler[]
  totalAmount: number
  currency: string
  startDate: Date
  endDate: Date
  specialRequests?: string
  paymentStatus: PaymentStatus
  paymentMethod?: string
  confirmationNumber: string
  createdAt: Date
  updatedAt: Date
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'refunded'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partial'

export interface Traveler {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: Date
  nationality: string
  passportNumber?: string
  dietaryRestrictions?: string[]
  medicalConditions?: string
  emergencyContact: EmergencyContact
}

export interface EmergencyContact {
  name: string
  relationship: string
  phone: string
  email?: string
}

// Quote Types
export interface Quote {
  id: string
  userId?: string
  email: string
  name: string
  phone: string
  destination: string
  travelDates: {
    startDate: Date
    endDate: Date
    flexible: boolean
  }
  groupSize: {
    adults: number
    children: number
    infants: number
  }
  budget: {
    min: number
    max: number
    currency: string
  }
  preferences: TravelPreferences
  specialRequests?: string
  status: QuoteStatus
  estimatedPrice?: number
  validUntil?: Date
  createdAt: Date
  updatedAt: Date
}

export type QuoteStatus = 'pending' | 'processing' | 'ready' | 'sent' | 'accepted' | 'declined' | 'expired'

export interface TravelPreferences {
  accommodationType: AccommodationType[]
  activities: string[]
  transportation: TransportationType[]
  mealPreferences: string[]
  accessibility: boolean
  sustainableTravel: boolean
}

export type AccommodationType = 'hotel' | 'resort' | 'villa' | 'guesthouse' | 'homestay' | 'camping'
export type TransportationType = 'flight' | 'car' | 'bus' | 'train' | 'boat' | 'motorcycle'

// Review Types
export interface Review {
  id: string
  packageId: string
  userId: string
  bookingId: string
  rating: number
  title: string
  content: string
  images?: string[]
  pros?: string[]
  cons?: string[]
  wouldRecommend: boolean
  travelDate: Date
  isVerified: boolean
  isPublished: boolean
  helpfulVotes: number
  createdAt: Date
  updatedAt: Date
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  pagination?: PaginationInfo
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

// Form Types
export interface ContactFormData {
  name: string
  email: string
  phone: string
  subject: string
  message: string
  travelDates?: {
    startDate: string
    endDate: string
  }
  groupSize?: number
  budget?: string
}

export interface NewsletterFormData {
  email: string
  preferences?: string[]
}

// UI Component Types
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  className?: string
}

export interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  shadow?: 'none' | 'sm' | 'md' | 'lg'
  border?: boolean
  hover?: boolean
}

export interface BadgeProps {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  className?: string
}

// Error Types
export interface AppError {
  code: string
  message: string
  details?: any
  timestamp: Date
}

export interface ValidationError {
  field: string
  message: string
  code: string
}

// Analytics Types
export interface AnalyticsEvent {
  name: string
  properties?: Record<string, any>
  userId?: string
  timestamp: Date
}

export interface PageView {
  path: string
  title: string
  userId?: string
  sessionId: string
  timestamp: Date
  referrer?: string
  userAgent: string
}

// Search Types
export interface SearchFilters {
  category?: PackageCategory[]
  priceRange?: {
    min: number
    max: number
  }
  duration?: {
    min: number
    max: number
  }
  difficulty?: DifficultyLevel[]
  location?: string[]
  rating?: number
  features?: string[]
  dateRange?: {
    startDate: Date
    endDate: Date
  }
}

export interface SearchResult {
  packages: Package[]
  total: number
  filters: {
    categories: { value: PackageCategory; count: number }[]
    locations: { value: string; count: number }[]
    priceRange: { min: number; max: number }
    durationRange: { min: number; max: number }
  }
}

// Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}