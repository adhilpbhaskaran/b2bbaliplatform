'use client'

import { useState, useEffect } from 'react'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { QueryProvider } from '@/components/providers/query-provider'
import { Toaster } from '@/components/ui/toaster'
import { Hero } from '@/components/sections/hero'
import { Stats } from '@/components/sections/stats'
import { FeaturedPackages } from '@/components/sections/featured-packages'
import { WhyChooseUs } from '@/components/sections/why-choose-us'
import { Services } from '@/components/sections/services'
import { Testimonials } from '@/components/sections/testimonials'
import { Partners } from '@/components/sections/partners'
import { Contact } from '@/components/sections/contact'
import { Footer } from '@/components/sections/footer'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Menu,
  X,
  Sun,
  Moon,
  Globe,
  Phone,
  Mail,
  ChevronUp,
  Search,
  User,
  Heart,
  ShoppingCart,
  MessageCircle
} from 'lucide-react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import Image from 'next/image'

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Packages', href: '/packages' },
  { name: 'Destinations', href: '/destinations' },
  { name: 'Services', href: '/services' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' }
]

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <>
      {/* Top Bar */}
      <div className="bg-primary text-primary-foreground py-2 text-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                <span>+62 361 123 4567</span>
              </div>
              <div className="hidden sm:flex items-center gap-1">
                <Mail className="h-3 w-3" />
                <span>info@balidmc.com</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline">Follow us:</span>
              <div className="flex gap-1">
                <Link href="#" className="hover:opacity-80">
                  <div className="w-5 h-5 bg-white/20 rounded flex items-center justify-center">
                    f
                  </div>
                </Link>
                <Link href="#" className="hover:opacity-80">
                  <div className="w-5 h-5 bg-white/20 rounded flex items-center justify-center">
                    i
                  </div>
                </Link>
                <Link href="#" className="hover:opacity-80">
                  <div className="w-5 h-5 bg-white/20 rounded flex items-center justify-center">
                    t
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        isScrolled 
          ? 'bg-background/95 backdrop-blur-md shadow-md' 
          : 'bg-background'
      )}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="rounded-lg bg-primary p-2">
                <Globe className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">BaliDMC</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors font-medium"
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              {/* Search */}
              <Button variant="ghost" size="sm" className="hidden sm:flex">
                <Search className="h-4 w-4" />
              </Button>

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>

              {/* User Actions */}
              <div className="hidden sm:flex items-center gap-1">
                <Button variant="ghost" size="sm">
                  <Heart className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <ShoppingCart className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <User className="h-4 w-4" />
                </Button>
              </div>

              {/* CTA Button */}
              <Button size="sm" className="hidden md:flex">
                Book Now
              </Button>

              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="lg:hidden border-t border-border py-4">
              <nav className="flex flex-col gap-4">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="text-muted-foreground hover:text-foreground transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
                <div className="flex items-center gap-2 pt-4 border-t border-border">
                  <Button variant="ghost" size="sm">
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    Account
                  </Button>
                </div>
                <Button className="w-full">
                  Book Your Adventure
                </Button>
              </nav>
            </div>
          )}
        </div>
      </header>
    </>
  )
}

function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 500)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  if (!isVisible) return null

  return (
    <Button
      onClick={scrollToTop}
      size="sm"
      className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg"
    >
      <ChevronUp className="h-4 w-4" />
    </Button>
  )
}

function WhatsAppFloat() {
  return (
    <Link
      href="https://wa.me/6281234567890"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-50 bg-green-500 hover:bg-green-600 text-white p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
    >
      <MessageCircle className="h-6 w-6" />
    </Link>
  )
}

interface MainLayoutProps {
  children?: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryProvider>
        <div className="min-h-screen bg-background">
          <Header />
          
          <main>
            {children || (
              <>
                <Hero />
                <Stats />
                <FeaturedPackages />
                <WhyChooseUs />
                <Services />
                <Testimonials />
                <Partners />
                <Contact />
              </>
            )}
          </main>
          
          <Footer />
          
          {/* Floating Elements */}
          <ScrollToTop />
          <WhatsAppFloat />
          
          {/* Toast Notifications */}
          <Toaster />
        </div>
      </QueryProvider>
    </ThemeProvider>
  )
}

// Export individual sections for use in other pages
export {
  Hero,
  Stats,
  FeaturedPackages,
  WhyChooseUs,
  Services,
  Testimonials,
  Partners,
  Contact,
  Footer
}