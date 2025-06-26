import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { toast } from 'sonner'
import type {
  ApiResponse,
  PaginatedResponse,
  Quote,
  Booking,
  Package,
  Agent,
  AgentAnalytics,
  PlatformAnalytics,
  QuoteBuilderForm,
  AdminSettings,
  AgentSettings,
} from '@/types'

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Get token from Clerk or your auth provider
    const token = typeof window !== 'undefined' ? localStorage.getItem('clerk-token') : null
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error) => {
    const message = error.response?.data?.message || error.message || 'An error occurred'
    
    // Don't show toast for certain status codes
    if (error.response?.status !== 401 && error.response?.status !== 403) {
      toast.error(message)
    }
    
    return Promise.reject(error)
  }
)

// API endpoints
export const apiClient = {
  // Auth endpoints
  auth: {
    validateToken: () => api.get<ApiResponse<{ valid: boolean }>>('/auth/validate'),
    refreshToken: () => api.post<ApiResponse<{ token: string }>>('/auth/refresh'),
  },

  // Agent endpoints
  agents: {
    getProfile: () => api.get<ApiResponse<Agent>>('/agents/profile'),
    updateProfile: (data: Partial<Agent>) => 
      api.put<ApiResponse<Agent>>('/agents/profile', data),
    getAnalytics: () => api.get<ApiResponse<AgentAnalytics>>('/agents/analytics'),
    getSettings: () => api.get<ApiResponse<AgentSettings>>('/agents/settings'),
    updateSettings: (data: Partial<AgentSettings>) => 
      api.put<ApiResponse<AgentSettings>>('/agents/settings', data),
  },

  // Quote endpoints
  quotes: {
    getAll: (params?: { page?: number; limit?: number; status?: string }) => 
      api.get<PaginatedResponse<Quote>>('/quotes', { params }),
    getById: (id: string) => api.get<ApiResponse<Quote>>(`/quotes/${id}`),
    create: (data: QuoteBuilderForm) => 
      api.post<ApiResponse<Quote>>('/quotes', data),
    update: (id: string, data: Partial<Quote>) => 
      api.put<ApiResponse<Quote>>(`/quotes/${id}`, data),
    delete: (id: string) => api.delete<ApiResponse<void>>(`/quotes/${id}`),
    calculate: (data: QuoteBuilderForm) => 
      api.post<ApiResponse<{ quote: Quote; pricing: any }>>('/quotes/calculate', data),
    generatePdf: (id: string) => 
      api.get(`/quotes/${id}/pdf`, { responseType: 'blob' }),
    sendEmail: (id: string, email: string) => 
      api.post<ApiResponse<void>>(`/quotes/${id}/send`, { email }),
    duplicate: (id: string) => 
      api.post<ApiResponse<Quote>>(`/quotes/${id}/duplicate`),
  },

  // Booking endpoints
  bookings: {
    getAll: (params?: { page?: number; limit?: number; status?: string }) => 
      api.get<PaginatedResponse<Booking>>('/bookings', { params }),
    getById: (id: string) => api.get<ApiResponse<Booking>>(`/bookings/${id}`),
    create: (quoteId: string, data: any) => 
      api.post<ApiResponse<Booking>>('/bookings', { quoteId, ...data }),
    update: (id: string, data: Partial<Booking>) => 
      api.put<ApiResponse<Booking>>(`/bookings/${id}`, data),
    cancel: (id: string, reason: string) => 
      api.post<ApiResponse<void>>(`/bookings/${id}/cancel`, { reason }),
    confirm: (id: string) => 
      api.post<ApiResponse<Booking>>(`/bookings/${id}/confirm`),
  },

  // Package endpoints
  packages: {
    getAll: (params?: { category?: string; location?: string }) => 
      api.get<ApiResponse<Package[]>>('/packages', { params }),
    getById: (id: string) => api.get<ApiResponse<Package>>(`/packages/${id}`),
    getFeatured: () => api.get<ApiResponse<Package[]>>('/packages/featured'),
  },

  // Admin endpoints
  admin: {
    getAnalytics: () => api.get<ApiResponse<PlatformAnalytics>>('/admin/analytics'),
    getAgents: (params?: { page?: number; limit?: number; status?: string }) => 
      api.get<PaginatedResponse<Agent>>('/admin/agents', { params }),
    updateAgentStatus: (agentId: string, status: string) => 
      api.put<ApiResponse<Agent>>(`/admin/agents/${agentId}/status`, { status }),
    updateAgentTier: (agentId: string, tier: string) => 
      api.put<ApiResponse<Agent>>(`/admin/agents/${agentId}/tier`, { tier }),
    getAllQuotes: (params?: { page?: number; limit?: number; agentId?: string }) => 
      api.get<PaginatedResponse<Quote>>('/admin/quotes', { params }),
    getAllBookings: (params?: { page?: number; limit?: number; agentId?: string }) => 
      api.get<PaginatedResponse<Booking>>('/admin/bookings', { params }),
    getSettings: () => api.get<ApiResponse<AdminSettings>>('/admin/settings'),
    updateSettings: (data: Partial<AdminSettings>) => 
      api.put<ApiResponse<AdminSettings>>('/admin/settings', data),
    recalculateTiers: () => api.post<ApiResponse<void>>('/admin/recalculate-tiers'),
    exportData: (type: 'quotes' | 'bookings' | 'agents', format: 'csv' | 'xlsx') => 
      api.get(`/admin/export/${type}?format=${format}`, { responseType: 'blob' }),
  },

  // AI endpoints
  ai: {
    generateItinerary: (data: { destination: string; days: number; interests: string[] }) => 
      api.post<ApiResponse<{ itinerary: string }>>('/ai/itinerary', data),
    optimizeQuote: (quoteId: string) => 
      api.post<ApiResponse<{ suggestions: string[] }>>(`/ai/optimize/${quoteId}`),
    chatSupport: (message: string, context?: any) => 
      api.post<ApiResponse<{ response: string }>>('/ai/chat', { message, context }),
  },

  // Utility endpoints
  utils: {
    uploadFile: (file: File, type: 'image' | 'document') => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)
      return api.post<ApiResponse<{ url: string; filename: string }>>('/utils/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    getExchangeRates: () => 
      api.get<ApiResponse<{ rates: Record<string, number> }>>('/utils/exchange-rates'),
    validateAddress: (address: string) => 
      api.post<ApiResponse<{ valid: boolean; formatted: string }>>('/utils/validate-address', { address }),
  },
}

export default api