import { z } from 'zod'
import { UserRole, UserStatus, UserTier, QuoteStatus, BookingStatus, PaymentStatus, PackageCategory, DifficultyLevel, PaymentMethod, CommissionStatus, MessageType, ActivityType } from '@prisma/client'

// Contact Form Validation
export const contactFormSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  email: z.string()
    .email('Please enter a valid email address')
    .max(100, 'Email must be less than 100 characters'),
  phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number')
    .optional(),
  subject: z.string()
    .min(5, 'Subject must be at least 5 characters')
    .max(100, 'Subject must be less than 100 characters'),
  message: z.string()
    .min(10, 'Message must be at least 10 characters')
    .max(1000, 'Message must be less than 1000 characters'),
  travelDates: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional()
  }).optional(),
  groupSize: z.number()
    .min(1, 'Group size must be at least 1')
    .max(50, 'Group size cannot exceed 50')
    .optional(),
  budget: z.string().optional()
})

// User validations
export const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  phone: z.string().optional(),
  avatar: z.string().url().optional(),
  role: z.nativeEnum(UserRole).default(UserRole.CUSTOMER),
  status: z.nativeEnum(UserStatus).default(UserStatus.ACTIVE),
  tier: z.nativeEnum(UserTier).default(UserTier.BRONZE),
  isActive: z.boolean().default(true),
})

export const updateUserSchema = userSchema.partial().omit({ role: true })

export const userProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  phone: z.string().optional(),
  avatar: z.string().url().optional(),
})

// Agent validations
export const agentSchema = z.object({
  userId: z.string().uuid(),
  specialization: z.string().min(1, 'Specialization is required').max(100),
  experience: z.number().int().min(0, 'Experience cannot be negative'),
  languages: z.array(z.string()).min(1, 'At least one language is required'),
  certifications: z.array(z.string()).optional(),
  bio: z.string().max(1000, 'Bio too long').optional(),
  commissionRate: z.number().min(0).max(1, 'Commission rate must be between 0 and 1'),
  isActive: z.boolean().default(true),
})

export const updateAgentSchema = agentSchema.partial().omit({ userId: true })

// Package validations
export const packageSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  slug: z.string().min(1, 'Slug is required').max(200),
  shortDesc: z.string().min(1, 'Short description is required').max(500),
  description: z.string().min(1, 'Description is required'),
  category: z.nativeEnum(PackageCategory),
  basePrice: z.number().positive('Base price must be positive'),
  duration: z.number().int().positive('Duration must be positive'),
  maxPax: z.number().int().positive('Max pax must be positive'),
  minPax: z.number().int().positive('Min pax must be positive'),
  location: z.string().min(1, 'Location is required').max(100),
  difficulty: z.nativeEnum(DifficultyLevel),
  includes: z.array(z.string()).min(1, 'At least one inclusion is required'),
  excludes: z.array(z.string()).optional(),
  itinerary: z.array(z.object({
    day: z.number().int().positive(),
    title: z.string().min(1, 'Day title is required'),
    description: z.string().min(1, 'Day description is required'),
    activities: z.array(z.string()),
    meals: z.array(z.string()).optional(),
    accommodation: z.string().optional(),
  })),
  images: z.array(z.string().url()).min(1, 'At least one image is required'),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
  seoTitle: z.string().max(60).optional(),
  seoDesc: z.string().max(160).optional(),
  agentId: z.string().uuid(),
})

export const updatePackageSchema = packageSchema.partial().omit({ agentId: true })

export const packageFilterSchema = z.object({
  category: z.nativeEnum(PackageCategory).optional(),
  difficulty: z.nativeEnum(DifficultyLevel).optional(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  duration: z.number().int().positive().optional(),
  location: z.string().optional(),
  isFeatured: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sortBy: z.enum(['price', 'duration', 'rating', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// Quote validations
export const quoteSchema = z.object({
  packageId: z.string().uuid(),
  customerId: z.string().uuid(),
  agentId: z.string().uuid(),
  clientName: z.string().min(1, 'Client name is required').max(100),
  clientEmail: z.string().email('Invalid email address'),
  clientPhone: z.string().min(1, 'Client phone is required'),
  pax: z.number().int().positive('Number of passengers must be positive'),
  startDate: z.date().min(new Date(), 'Start date must be in the future'),
  endDate: z.date(),
  specialRequests: z.string().max(1000).optional(),
  baseAmount: z.number().positive('Base amount must be positive'),
  addOns: z.array(z.object({
    id: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).optional(),
  discount: z.number().min(0).max(1).default(0),
  totalAmount: z.number().positive('Total amount must be positive'),
  validUntil: z.date().min(new Date(), 'Valid until must be in the future'),
  status: z.nativeEnum(QuoteStatus).default(QuoteStatus.PENDING),
}).refine(data => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
})

export const updateQuoteSchema = quoteSchema.partial().omit({ packageId: true, customerId: true, agentId: true })

export const quoteResponseSchema = z.object({
  status: z.nativeEnum(QuoteStatus),
  notes: z.string().max(1000).optional(),
})

// Booking validations
export const bookingSchema = z.object({
  quoteId: z.string().uuid(),
  customerId: z.string().uuid(),
  agentId: z.string().uuid(),
  packageId: z.string().uuid(),
  bookingRef: z.string().min(1, 'Booking reference is required'),
  clientName: z.string().min(1, 'Client name is required').max(100),
  clientEmail: z.string().email('Invalid email address'),
  clientPhone: z.string().min(1, 'Client phone is required'),
  pax: z.number().int().positive('Number of passengers must be positive'),
  startDate: z.date().min(new Date(), 'Start date must be in the future'),
  endDate: z.date(),
  totalAmount: z.number().positive('Total amount must be positive'),
  paidAmount: z.number().min(0).default(0),
  status: z.nativeEnum(BookingStatus).default(BookingStatus.PENDING),
  specialRequests: z.string().max(1000).optional(),
}).refine(data => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
})

export const updateBookingSchema = bookingSchema.partial().omit({ quoteId: true, customerId: true, agentId: true, packageId: true })

export const bookingStatusSchema = z.object({
  status: z.nativeEnum(BookingStatus),
  notes: z.string().max(1000).optional(),
})

// Payment validations
export const paymentSchema = z.object({
  bookingId: z.string().uuid(),
  customerId: z.string().uuid(),
  amount: z.number().positive('Amount must be positive'),
  method: z.nativeEnum(PaymentMethod),
  currency: z.string().length(3, 'Currency must be 3 characters').default('USD'),
  status: z.nativeEnum(PaymentStatus).default(PaymentStatus.PENDING),
  transactionId: z.string().optional(),
  gatewayResponse: z.record(z.any()).optional(),
  notes: z.string().max(500).optional(),
})

export const updatePaymentSchema = paymentSchema.partial().omit({ bookingId: true, customerId: true })

export const paymentIntentSchema = z.object({
  bookingId: z.string().uuid(),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3).default('USD'),
  paymentMethod: z.nativeEnum(PaymentMethod),
  returnUrl: z.string().url().optional(),
})

// Review validations
export const reviewSchema = z.object({
  packageId: z.string().uuid(),
  bookingId: z.string().uuid(),
  customerId: z.string().uuid(),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  title: z.string().min(1, 'Title is required').max(100),
  comment: z.string().min(1, 'Comment is required').max(1000),
  images: z.array(z.string().url()).optional(),
  isVerified: z.boolean().default(false),
  isPublished: z.boolean().default(true),
})

export const updateReviewSchema = reviewSchema.partial().omit({ packageId: true, bookingId: true, customerId: true })

// Message validations
export const messageSchema = z.object({
  senderId: z.string().uuid(),
  receiverId: z.string().uuid(),
  type: z.nativeEnum(MessageType).default(MessageType.TEXT),
  content: z.string().min(1, 'Content is required').max(5000),
  attachments: z.array(z.string().url()).optional(),
  metadata: z.record(z.any()).optional(),
  isRead: z.boolean().default(false),
})

export const updateMessageSchema = z.object({
  isRead: z.boolean(),
})

// Contact form validation
export const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  subject: z.string().min(1, 'Subject is required').max(200),
  message: z.string().min(1, 'Message is required').max(2000),
  packageId: z.string().uuid().optional(),
})

// Newsletter subscription validation
export const newsletterSchema = z.object({
  email: z.string().email('Invalid email address'),
  preferences: z.array(z.string()).optional(),
})

// Search validation
export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100),
  category: z.nativeEnum(PackageCategory).optional(),
  location: z.string().optional(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  pax: z.number().int().positive().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(50).default(10),
})

// File upload validation
export const fileUploadSchema = z.object({
  file: z.instanceof(File),
  folder: z.string().optional(),
  maxSize: z.number().positive().default(5 * 1024 * 1024), // 5MB
  allowedTypes: z.array(z.string()).default(['image/jpeg', 'image/png', 'image/webp']),
})

// Pagination validation
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// Date range validation
export const dateRangeSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
}).refine(data => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
})

// Analytics validation
export const analyticsEventSchema = z.object({
  event: z.string().min(1, 'Event name is required'),
  properties: z.record(z.any()).optional(),
  userId: z.string().uuid().optional(),
  sessionId: z.string().optional(),
  timestamp: z.date().default(() => new Date()),
})

// Webhook validation
export const webhookSchema = z.object({
  event: z.string().min(1, 'Event type is required'),
  data: z.record(z.any()),
  timestamp: z.number().int().positive(),
  signature: z.string().min(1, 'Signature is required'),
})

// API response validation
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }).optional(),
})

// Environment variables validation
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default('/sign-in'),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default('/sign-up'),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default('/dashboard'),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default('/dashboard'),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  STRIPE_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1).optional(),
  UPLOADTHING_SECRET: z.string().min(1).optional(),
  UPLOADTHING_APP_ID: z.string().min(1).optional(),
})

// Newsletter Subscription Validation
export const newsletterSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .max(100, 'Email must be less than 100 characters'),
  preferences: z.array(z.string()).optional()
})

// Quote Request Validation
export const quoteRequestSchema = z.object({
  personalInfo: z.object({
    name: z.string().min(2).max(50),
    email: z.string().email(),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
    country: z.string().min(2).max(50)
  }),
  travelDetails: z.object({
    destination: z.string().min(2).max(100),
    startDate: z.string().refine((date) => {
      const selectedDate = new Date(date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return selectedDate >= today
    }, 'Start date must be today or in the future'),
    endDate: z.string(),
    flexible: z.boolean().default(false)
  }).refine((data) => {
    const start = new Date(data.startDate)
    const end = new Date(data.endDate)
    return end > start
  }, 'End date must be after start date'),
  groupInfo: z.object({
    adults: z.number().min(1).max(20),
    children: z.number().min(0).max(10),
    infants: z.number().min(0).max(5)
  }),
  budget: z.object({
    min: z.number().min(0),
    max: z.number().min(0),
    currency: z.string().length(3)
  }).refine((data) => data.max >= data.min, 'Maximum budget must be greater than or equal to minimum budget'),
  preferences: z.object({
    accommodationType: z.array(z.enum(['hotel', 'resort', 'villa', 'guesthouse', 'homestay', 'camping'])),
    activities: z.array(z.string()),
    transportation: z.array(z.enum(['flight', 'car', 'bus', 'train', 'boat', 'motorcycle'])),
    mealPreferences: z.array(z.string()),
    accessibility: z.boolean().default(false),
    sustainableTravel: z.boolean().default(false)
  }),
  specialRequests: z.string().max(500).optional()
})

// Search Filters Validation
export const searchFiltersSchema = z.object({
  query: z.string().max(100).optional(),
  category: z.array(z.enum(['adventure', 'cultural', 'relaxation', 'luxury', 'family', 'romantic', 'spiritual'])).optional(),
  priceRange: z.object({
    min: z.number().min(0),
    max: z.number().min(0)
  }).refine((data) => data.max >= data.min, 'Maximum price must be greater than or equal to minimum price').optional(),
  duration: z.object({
    min: z.number().min(1),
    max: z.number().min(1)
  }).refine((data) => data.max >= data.min, 'Maximum duration must be greater than or equal to minimum duration').optional(),
  difficulty: z.array(z.enum(['easy', 'moderate', 'challenging', 'extreme'])).optional(),
  location: z.array(z.string()).optional(),
  rating: z.number().min(1).max(5).optional(),
  features: z.array(z.string()).optional(),
  dateRange: z.object({
    startDate: z.string(),
    endDate: z.string()
  }).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  sortBy: z.enum(['price', 'rating', 'duration', 'popularity', 'newest']).default('popularity'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// Type exports
export type ContactFormData = z.infer<typeof contactFormSchema>
export type NewsletterData = z.infer<typeof newsletterSchema>
export type QuoteRequestData = z.infer<typeof quoteRequestSchema>
export type SearchFiltersData = z.infer<typeof searchFiltersSchema>
export type UserInput = z.infer<typeof userSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type UserProfileInput = z.infer<typeof userProfileSchema>
export type AgentInput = z.infer<typeof agentSchema>
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>
export type PackageInput = z.infer<typeof packageSchema>
export type UpdatePackageInput = z.infer<typeof updatePackageSchema>
export type PackageFilterInput = z.infer<typeof packageFilterSchema>
export type QuoteInput = z.infer<typeof quoteSchema>
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>
export type QuoteResponseInput = z.infer<typeof quoteResponseSchema>
export type BookingInput = z.infer<typeof bookingSchema>
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>
export type BookingStatusInput = z.infer<typeof bookingStatusSchema>
export type PaymentInput = z.infer<typeof paymentSchema>
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>
export type PaymentIntentInput = z.infer<typeof paymentIntentSchema>
export type ReviewInput = z.infer<typeof reviewSchema>
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>
export type MessageInput = z.infer<typeof messageSchema>
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>
export type ContactInput = z.infer<typeof contactSchema>
export type NewsletterInput = z.infer<typeof newsletterSchema>
export type SearchInput = z.infer<typeof searchSchema>
export type FileUploadInput = z.infer<typeof fileUploadSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
export type DateRangeInput = z.infer<typeof dateRangeSchema>
export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>
export type WebhookInput = z.infer<typeof webhookSchema>
export type ApiResponseInput = z.infer<typeof apiResponseSchema>
export type EnvInput = z.infer<typeof envSchema>