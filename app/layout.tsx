import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { QueryProvider } from '@/components/providers/query-provider'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Bali DMC - Premium Destination Management Company',
    template: '%s | Bali DMC',
  },
  description:
    'Experience the magic of Bali with our premium destination management services. Custom tours, luxury accommodations, and unforgettable experiences.',
  keywords: [
    'Bali',
    'DMC',
    'Destination Management',
    'Tours',
    'Travel',
    'Indonesia',
    'Luxury Travel',
    'Custom Tours',
    'Bali Packages',
  ],
  authors: [{ name: 'Bali DMC' }],
  creator: 'Bali DMC',
  publisher: 'Bali DMC',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    siteName: 'Bali DMC',
    title: 'Bali DMC - Premium Destination Management Company',
    description:
      'Experience the magic of Bali with our premium destination management services. Custom tours, luxury accommodations, and unforgettable experiences.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Bali DMC - Premium Destination Management Company',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bali DMC - Premium Destination Management Company',
    description:
      'Experience the magic of Bali with our premium destination management services.',
    images: ['/og-image.jpg'],
    creator: '@balidmc',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={
        {
          baseTheme: undefined,
          variables: {
            colorPrimary: 'hsl(var(--primary))',
            colorBackground: 'hsl(var(--background))',
            colorInputBackground: 'hsl(var(--background))',
            colorInputText: 'hsl(var(--foreground))',
            colorText: 'hsl(var(--foreground))',
            colorTextSecondary: 'hsl(var(--muted-foreground))',
            colorSuccess: 'hsl(var(--success))',
            colorDanger: 'hsl(var(--destructive))',
            colorWarning: 'hsl(var(--warning))',
            colorNeutral: 'hsl(var(--muted))',
            fontFamily: 'var(--font-sans)',
            fontSize: '14px',
            borderRadius: 'var(--radius)',
          },
          elements: {
            formButtonPrimary:
              'bg-primary text-primary-foreground hover:bg-primary/90',
            card: 'bg-card border border-border shadow-sm',
            headerTitle: 'text-foreground',
            headerSubtitle: 'text-muted-foreground',
            socialButtonsBlockButton:
              'bg-background border border-border text-foreground hover:bg-accent',
            socialButtonsBlockButtonText: 'text-foreground',
            formFieldLabel: 'text-foreground',
            formFieldInput:
              'bg-background border border-border text-foreground focus:border-primary',
            footerActionLink: 'text-primary hover:text-primary/80',
          },
        } as any
      }
    >
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <QueryProvider>
              <div className="relative flex min-h-screen flex-col">
                <div className="flex-1">{children}</div>
              </div>
              <Toaster />
            </QueryProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}