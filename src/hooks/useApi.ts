import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUser } from '@clerk/nextjs'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api'
import type {
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

// Query keys
export const queryKeys = {
  agents: {
    profile: ['agents', 'profile'] as const,
    analytics: ['agents', 'analytics'] as const,
    settings: ['agents', 'settings'] as const,
  },
  quotes: {
    all: (params?: any) => ['quotes', 'all', params] as const,
    byId: (id: string) => ['quotes', 'byId', id] as const,
  },
  bookings: {
    all: (params?: any) => ['bookings', 'all', params] as const,
    byId: (id: string) => ['bookings', 'byId', id] as const,
  },
  packages: {
    all: (params?: any) => ['packages', 'all', params] as const,
    byId: (id: string) => ['packages', 'byId', id] as const,
    featured: ['packages', 'featured'] as const,
  },
  admin: {
    analytics: ['admin', 'analytics'] as const,
    agents: (params?: any) => ['admin', 'agents', params] as const,
    quotes: (params?: any) => ['admin', 'quotes', params] as const,
    bookings: (params?: any) => ['admin', 'bookings', params] as const,
    settings: ['admin', 'settings'] as const,
  },
}

// Agent hooks
export const useAgentProfile = () => {
  const { user } = useUser()
  return useQuery({
    queryKey: queryKeys.agents.profile,
    queryFn: () => apiClient.agents.getProfile().then(res => res.data.data),
    enabled: !!user,
  })
}

export const useAgentAnalytics = () => {
  const { user } = useUser()
  return useQuery({
    queryKey: queryKeys.agents.analytics,
    queryFn: () => apiClient.agents.getAnalytics().then(res => res.data.data),
    enabled: !!user,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })
}

export const useAgentSettings = () => {
  const { user } = useUser()
  return useQuery({
    queryKey: queryKeys.agents.settings,
    queryFn: () => apiClient.agents.getSettings().then(res => res.data.data),
    enabled: !!user,
  })
}

export const useUpdateAgentProfile = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Agent>) => apiClient.agents.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.profile })
      toast.success('Profile updated successfully')
    },
    onError: () => {
      toast.error('Failed to update profile')
    },
  })
}

// Quote hooks
export const useQuotes = (params?: { page?: number; limit?: number; status?: string }) => {
  const { user } = useUser()
  return useQuery({
    queryKey: queryKeys.quotes.all(params),
    queryFn: () => apiClient.quotes.getAll(params).then(res => res.data),
    enabled: !!user,
  })
}

export const useQuote = (id: string) => {
  return useQuery({
    queryKey: queryKeys.quotes.byId(id),
    queryFn: () => apiClient.quotes.getById(id).then(res => res.data.data),
    enabled: !!id,
  })
}

export const useCreateQuote = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: QuoteBuilderForm) => apiClient.quotes.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.analytics })
      toast.success('Quote created successfully')
    },
    onError: () => {
      toast.error('Failed to create quote')
    },
  })
}

export const useUpdateQuote = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Quote> }) => 
      apiClient.quotes.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotes.byId(id) })
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
      toast.success('Quote updated successfully')
    },
    onError: () => {
      toast.error('Failed to update quote')
    },
  })
}

export const useDeleteQuote = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.quotes.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.analytics })
      toast.success('Quote deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete quote')
    },
  })
}

export const useCalculateQuote = () => {
  return useMutation({
    mutationFn: (data: QuoteBuilderForm) => apiClient.quotes.calculate(data),
    onError: () => {
      toast.error('Failed to calculate quote')
    },
  })
}

export const useGenerateQuotePdf = () => {
  return useMutation({
    mutationFn: (id: string) => apiClient.quotes.generatePdf(id),
    onSuccess: (response, id) => {
      // Create blob URL and download
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `quote-${id}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('PDF downloaded successfully')
    },
    onError: () => {
      toast.error('Failed to generate PDF')
    },
  })
}

// Booking hooks
export const useBookings = (params?: { page?: number; limit?: number; status?: string }) => {
  const { user } = useUser()
  return useQuery({
    queryKey: queryKeys.bookings.all(params),
    queryFn: () => apiClient.bookings.getAll(params).then(res => res.data),
    enabled: !!user,
  })
}

export const useBooking = (id: string) => {
  return useQuery({
    queryKey: queryKeys.bookings.byId(id),
    queryFn: () => apiClient.bookings.getById(id).then(res => res.data.data),
    enabled: !!id,
  })
}

export const useCreateBooking = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ quoteId, data }: { quoteId: string; data: any }) => 
      apiClient.bookings.create(quoteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.analytics })
      toast.success('Booking created successfully')
    },
    onError: () => {
      toast.error('Failed to create booking')
    },
  })
}

// Package hooks
export const usePackages = (params?: { category?: string; location?: string }) => {
  return useQuery({
    queryKey: queryKeys.packages.all(params),
    queryFn: () => apiClient.packages.getAll(params).then(res => res.data.data),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

export const usePackage = (id: string) => {
  return useQuery({
    queryKey: queryKeys.packages.byId(id),
    queryFn: () => apiClient.packages.getById(id).then(res => res.data.data),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

export const useFeaturedPackages = () => {
  return useQuery({
    queryKey: queryKeys.packages.featured,
    queryFn: () => apiClient.packages.getFeatured().then(res => res.data.data),
    staleTime: 15 * 60 * 1000, // 15 minutes
  })
}

// Admin hooks
export const useAdminAnalytics = () => {
  const { user } = useUser()
  const isAdmin = user?.publicMetadata?.role === 'admin'
  
  return useQuery({
    queryKey: queryKeys.admin.analytics,
    queryFn: () => apiClient.admin.getAnalytics().then(res => res.data.data),
    enabled: isAdmin,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })
}

export const useAdminAgents = (params?: { page?: number; limit?: number; status?: string }) => {
  const { user } = useUser()
  const isAdmin = user?.publicMetadata?.role === 'admin'
  
  return useQuery({
    queryKey: queryKeys.admin.agents(params),
    queryFn: () => apiClient.admin.getAgents(params).then(res => res.data),
    enabled: isAdmin,
  })
}

export const useUpdateAgentStatus = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ agentId, status }: { agentId: string; status: string }) => 
      apiClient.admin.updateAgentStatus(agentId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'agents'] })
      toast.success('Agent status updated successfully')
    },
    onError: () => {
      toast.error('Failed to update agent status')
    },
  })
}

// AI hooks
export const useGenerateItinerary = () => {
  return useMutation({
    mutationFn: (data: { destination: string; days: number; interests: string[] }) => 
      apiClient.ai.generateItinerary(data),
    onError: () => {
      toast.error('Failed to generate itinerary')
    },
  })
}

export const useOptimizeQuote = () => {
  return useMutation({
    mutationFn: (quoteId: string) => apiClient.ai.optimizeQuote(quoteId),
    onError: () => {
      toast.error('Failed to optimize quote')
    },
  })
}