import { Metadata } from 'next'
import { MainLayout } from '@/components/layout/main-layout'

export const metadata: Metadata = {
  title: 'Home',
  description:
    'Discover the magic of Bali with our premium destination management services. Custom tours, luxury accommodations, and unforgettable experiences await you.',
  openGraph: {
    title: 'Bali DMC - Premium Destination Management Company',
    description:
      'Discover the magic of Bali with our premium destination management services. Custom tours, luxury accommodations, and unforgettable experiences await you.',
    images: [
      {
        url: '/images/hero-bali.jpg',
        width: 1200,
        height: 630,
        alt: 'Beautiful Bali landscape with traditional temples',
      },
    ],
  },
}

export default function HomePage() {
  return <MainLayout />
}