// User and Authentication Types
export interface User {
  id: string
  email: string
  role: 'agent' | 'admin'
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  createdAt: string
  updatedAt: string
}

export interface Agent extends User {
  role: 'agent'
  contactPerson: string
  companyName: string
  phone: string
  whatsapp: string
  country: string
  city: string
  experience: string
  specialization: string[]
  website?: string
  socialMedia?: {
    instagram?: string
    facebook?: string
    linkedin?: string
  }
  businessLicense?: string
  tier: TierLevel
  totalPax: number
  paxThisMonth: number
  totalRevenue: number
  conversionRate: number
  lastActive: string
  preferences: {
    currency: string
    timezone: string
    notifications: {
      email: boolean
      whatsapp: boolean
      sms: boolean
    }
  }
}

export interface Admin extends User {
  role: 'admin'
  contactPerson: string
  permissions: string[]
}

// Tier System
export type TierLevel = 'Bronze' | 'Silver' | 'Gold' | 'Platinum'

export interface TierInfo {
  level: TierLevel
  minPax: number
  discount: number
  benefits: string[]
  color: string
}

// Package and Travel Types
export interface Package {
  id: string
  name: string
  duration: number
  locations: string[]
  nights: number[]
  basePrice: number
  inclusions: string[]
  exclusions?: string[]
  highlights: string[]
  description: string
  images: string[]
  category: 'Classic' | 'Honeymoon' | 'Adventure' | 'Luxury' | 'Family' | 'Cultural'
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Hotel {
  id: string
  name: string
  location: string
  category: 'Standard' | 'Premium' | 'Luxury'
  pricePerNight: number
  rating: number
  amenities: string[]
  images: string[]
  description: string
  roomTypes: RoomType[]
  isActive: boolean
}

export interface RoomType {
  id: string
  name: string
  capacity: number
  pricePerNight: number
  amenities: string[]
  images: string[]
}

export interface AddOn {
  id: string
  name: string
  description: string
  price: number
  category: 'Activity' | 'Spa' | 'Transport' | 'Meal' | 'Experience'
  duration?: number
  location?: string
  inclusions: string[]
  images: string[]
  isActive: boolean
}

export interface Vehicle {
  type: string
  capacity: number
  pricePerDay: number
  description: string
}

// Quote and Booking Types
export interface Quote {
  id: string
  agentId: string
  clientName: string
  clientEmail?: string
  clientPhone?: string
  travelDate: string
  endDate: string
  pax: PaxDetails
  selectedPackage: Package
  options: QuoteOption[]
  markup: MarkupConfig
  totalAmount: number
  status: 'draft' | 'sent' | 'viewed' | 'confirmed' | 'expired'
  validUntil: string
  notes?: string
  internalNotes?: string
  createdAt: string
  updatedAt: string
  sentAt?: string
  viewedAt?: string
  confirmedAt?: string
}

export interface PaxDetails {
  adults: number
  childWithBed: number
  childWithoutBed: number
  total: number
}

export interface QuoteOption {
  id: string
  name: string
  hotels: SelectedHotel[]
  addOns: SelectedAddOn[]
  vehicle: Vehicle
  roomConfiguration: RoomConfiguration
  subtotal: number
  discount: number
  total: number
  isRecommended?: boolean
}

export interface SelectedHotel {
  hotel: Hotel
  roomType: RoomType
  nights: number
  rooms: number
  totalPrice: number
}

export interface SelectedAddOn {
  addOn: AddOn
  quantity: number
  totalPrice: number
}

export interface RoomConfiguration {
  rooms: number
  adultsPerRoom: number
  childrenPerRoom: number
}

export interface MarkupConfig {
  type: 'percentage' | 'flat'
  value: number
  applyTo: 'total' | 'accommodation' | 'activities'
}

export interface Booking {
  id: string
  quoteId: string
  agentId: string
  clientName: string
  clientEmail: string
  clientPhone: string
  travelDate: string
  endDate: string
  pax: PaxDetails
  selectedOption: QuoteOption
  totalAmount: number
  paidAmount: number
  status: 'confirmed' | 'paid' | 'cancelled' | 'completed' | 'refunded'
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded'
  paymentMethod?: string
  specialRequests?: string
  emergencyContact?: {
    name: string
    phone: string
    relationship: string
  }
  documents: BookingDocument[]
  createdAt: string
  updatedAt: string
  confirmedAt: string
  cancelledAt?: string
  completedAt?: string
}

export interface BookingDocument {
  id: string
  type: 'passport' | 'visa' | 'insurance' | 'flight' | 'other'
  name: string
  url: string
  uploadedAt: string
}

// Analytics and Reporting Types
export interface AgentAnalytics {
  agentId: string
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
  startDate: string
  endDate: string
  metrics: {
    quotesCreated: number
    quotesViewed: number
    quotesConfirmed: number
    conversionRate: number
    totalRevenue: number
    averageQuoteValue: number
    totalPax: number
    topDestinations: { location: string; count: number }[]
    topPackages: { packageId: string; count: number }[]
  }
}

export interface PlatformAnalytics {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
  startDate: string
  endDate: string
  metrics: {
    totalAgents: number
    activeAgents: number
    newAgents: number
    totalQuotes: number
    totalBookings: number
    totalRevenue: number
    platformCommission: number
    conversionRate: number
    averageQuoteValue: number
    topPerformingAgents: { agentId: string; revenue: number }[]
    popularPackages: { packageId: string; bookings: number }[]
    revenueByLocation: { location: string; revenue: number }[]
  }
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Form Types
export interface AgentRegistrationForm {
  email: string
  password: string
  confirmPassword: string
  contactPerson: string
  companyName: string
  phone: string
  whatsapp: string
  country: string
  city: string
  experience: string
  specialization: string[]
  website?: string
  businessLicense?: string
  agreeToTerms: boolean
}

export interface LoginForm {
  email: string
  password: string
  rememberMe?: boolean
}

export interface QuoteBuilderForm {
  step1: {
    clientName: string
    clientEmail?: string
    clientPhone?: string
    travelDate: string
    endDate: string
  }
  step2: {
    adults: number
    childWithBed: number
    childWithoutBed: number
  }
  step3: {
    packageId: string
  }
  step4: {
    options: {
      hotels: { [location: string]: { hotelId: string; roomTypeId: string } }
      addOns: string[]
    }[]
  }
  step5: {
    markup: MarkupConfig
    notes?: string
  }
}

// Utility Types
export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface TableColumn<T> {
  key: keyof T
  label: string
  sortable?: boolean
  render?: (value: any, row: T) => React.ReactNode
}

export interface FilterOption {
  key: string
  label: string
  type: 'select' | 'date' | 'text' | 'number'
  options?: SelectOption[]
  placeholder?: string
}

// Notification Types
export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  read: boolean
  createdAt: string
  actionUrl?: string
  actionLabel?: string
}

// Settings Types
export interface AdminSettings {
  emailNotifications: boolean
  autoApproval: boolean
  platformCommissionRate: number
  tierUpdateFrequency: 'daily' | 'weekly' | 'monthly'
  defaultCurrency: string
  supportEmail: string
  supportWhatsapp: string
  maintenanceMode: boolean
}

export interface AgentSettings {
  notifications: {
    email: boolean
    whatsapp: boolean
    sms: boolean
  }
  branding: {
    logo?: string
    primaryColor: string
    secondaryColor: string
    companyName: string
    contactEmail: string
    contactPhone: string
    website?: string
  }
  preferences: {
    currency: string
    timezone: string
    language: string
    defaultMarkup: MarkupConfig
  }
}