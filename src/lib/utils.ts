import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { TierLevel } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date, format: 'short' | 'long' | 'relative' = 'short'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (format === 'relative') {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`
    
    return dateObj.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }
  
  if (format === 'long') {
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }
  
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function calculateTier(totalPax: number): TierLevel {
  if (totalPax >= 500) return 'Platinum'
  if (totalPax >= 200) return 'Gold'
  if (totalPax >= 50) return 'Silver'
  return 'Bronze'
}

export function getTierDiscount(tier: TierLevel): number {
  const discounts = {
    Bronze: 0,
    Silver: 10,
    Gold: 15,
    Platinum: 20,
  }
  return discounts[tier]
}

export function getTierColor(tier: TierLevel): string {
  const colors = {
    Bronze: 'from-amber-600 to-amber-800',
    Silver: 'from-gray-400 to-gray-600',
    Gold: 'from-yellow-400 to-yellow-600',
    Platinum: 'from-purple-400 to-purple-600',
  }
  return colors[tier]
}

export function calculateRooms(adults: number, childWithBed: number, childWithoutBed: number): {
  rooms: number
  adultsPerRoom: number
  childrenPerRoom: number
} {
  const totalWithBed = adults + childWithBed
  const rooms = Math.ceil(totalWithBed / 2)
  const adultsPerRoom = Math.ceil(adults / rooms)
  const childrenPerRoom = Math.ceil((childWithBed + childWithoutBed) / rooms)
  
  return { rooms, adultsPerRoom, childrenPerRoom }
}

export function selectVehicle(totalPax: number): {
  type: string
  capacity: number
  pricePerDay: number
} {
  if (totalPax <= 6) {
    return { type: 'Toyota Avanza', capacity: 6, pricePerDay: 45 }
  } else if (totalPax <= 12) {
    return { type: 'Toyota Hiace', capacity: 12, pricePerDay: 65 }
  } else {
    return { type: 'Medium Bus', capacity: 25, pricePerDay: 85 }
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>"'&]/g, '')
    .trim()
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

export function downloadFile(data: string, filename: string, type: string = 'text/plain'): void {
  const blob = new Blob([data], { type })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false)
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'absolute'
    textArea.style.left = '-999999px'
    document.body.prepend(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      return Promise.resolve(true)
    } catch (error) {
      return Promise.resolve(false)
    } finally {
      textArea.remove()
    }
  }
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    suspended: 'bg-gray-100 text-gray-800 border-gray-200',
    confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
    draft: 'bg-gray-100 text-gray-800 border-gray-200',
    sent: 'bg-blue-100 text-blue-800 border-blue-200',
    viewed: 'bg-purple-100 text-purple-800 border-purple-200',
    expired: 'bg-orange-100 text-orange-800 border-orange-200',
  }
  
  return statusColors[status.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200'
}

export function calculateConversionRate(quotes: number, bookings: number): number {
  if (quotes === 0) return 0
  return Math.round((bookings / quotes) * 100 * 10) / 10
}

export function generateWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[^\d]/g, '')
  const encodedMessage = encodeURIComponent(message)
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`
}

export function generateEmailLink(email: string, subject: string, body: string): string {
  const encodedSubject = encodeURIComponent(subject)
  const encodedBody = encodeURIComponent(body)
  return `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`
}

export function sortByKey<T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1
    if (aVal > bVal) return direction === 'asc' ? 1 : -1
    return 0
  })
}

export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const group = String(item[key])
    groups[group] = groups[group] || []
    groups[group].push(item)
    return groups
  }, {} as Record<string, T[]>)
}

export function calculateDaysBetween(startDate: string | Date, endDate: string | Date): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate
  const diffTime = Math.abs(end.getTime() - start.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function addDays(date: string | Date, days: number): Date {
  const result = typeof date === 'string' ? new Date(date) : new Date(date)
  result.setDate(result.getDate() + days)
  return result
}