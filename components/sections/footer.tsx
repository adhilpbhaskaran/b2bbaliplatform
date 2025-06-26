'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Linkedin,
  Send,
  Heart,
  Shield,
  Award,
  Users,
  Globe,
  CreditCard,
  Headphones
} from 'lucide-react'

const footerLinks = {
  company: {
    title: 'Company',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'Our Story', href: '/story' },
      { label: 'Team', href: '/team' },
      { label: 'Careers', href: '/careers' },
      { label: 'Press', href: '/press' },
      { label: 'Contact', href: '/contact' }
    ]
  },
  services: {
    title: 'Services',
    links: [
      { label: 'Tour Packages', href: '/packages' },
      { label: 'Custom Tours', href: '/custom-tours' },
      { label: 'Transportation', href: '/transportation' },
      { label: 'Accommodation', href: '/accommodation' },
      { label: 'Activities', href: '/activities' },
      { label: 'Group Tours', href: '/group-tours' }
    ]
  },
  destinations: {
    title: 'Destinations',
    links: [
      { label: 'Ubud', href: '/destinations/ubud' },
      { label: 'Seminyak', href: '/destinations/seminyak' },
      { label: 'Canggu', href: '/destinations/canggu' },
      { label: 'Sanur', href: '/destinations/sanur' },
      { label: 'Nusa Penida', href: '/destinations/nusa-penida' },
      { label: 'Mount Batur', href: '/destinations/mount-batur' }
    ]
  },
  support: {
    title: 'Support',
    links: [
      { label: 'Help Center', href: '/help' },
      { label: 'Booking Guide', href: '/booking-guide' },
      { label: 'Cancellation Policy', href: '/cancellation' },
      { label: 'Travel Insurance', href: '/insurance' },
      { label: 'Safety Guidelines', href: '/safety' },
      { label: 'FAQ', href: '/faq' }
    ]
  }
}

const socialLinks = [
  { icon: Facebook, href: 'https://facebook.com/balidmc', label: 'Facebook' },
  { icon: Instagram, href: 'https://instagram.com/balidmc', label: 'Instagram' },
  { icon: Twitter, href: 'https://twitter.com/balidmc', label: 'Twitter' },
  { icon: Youtube, href: 'https://youtube.com/balidmc', label: 'YouTube' },
  { icon: Linkedin, href: 'https://linkedin.com/company/balidmc', label: 'LinkedIn' }
]

const contactInfo = [
  {
    icon: MapPin,
    label: 'Address',
    value: 'Jl. Raya Ubud No. 123, Ubud, Gianyar 80571, Bali, Indonesia'
  },
  {
    icon: Phone,
    label: 'Phone',
    value: '+62 361 123 4567'
  },
  {
    icon: Mail,
    label: 'Email',
    value: 'info@balidmc.com'
  },
  {
    icon: Clock,
    label: 'Hours',
    value: 'Mon-Fri: 8AM-8PM, Sat: 9AM-6PM, Sun: 10AM-4PM'
  }
]

const certifications = [
  {
    name: 'IATA',
    logo: '/images/certifications/iata.png',
    description: 'International Air Transport Association'
  },
  {
    name: 'PATA',
    logo: '/images/certifications/pata.png',
    description: 'Pacific Asia Travel Association'
  },
  {
    name: 'ASITA',
    logo: '/images/certifications/asita.png',
    description: 'Association of Indonesian Tours & Travel Agencies'
  },
  {
    name: 'TripAdvisor',
    logo: '/images/certifications/tripadvisor.png',
    description: 'Certificate of Excellence 2024'
  }
]

const paymentMethods = [
  { name: 'Visa', logo: '/images/payments/visa.png' },
  { name: 'Mastercard', logo: '/images/payments/mastercard.png' },
  { name: 'PayPal', logo: '/images/payments/paypal.png' },
  { name: 'Stripe', logo: '/images/payments/stripe.png' },
  { name: 'Bank Transfer', logo: '/images/payments/bank.png' }
]

function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsSubmitting(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setIsSubscribed(true)
      toast({
        title: "Subscribed!",
        description: "Welcome to our newsletter. You'll receive travel tips and exclusive offers.",
        variant: "success"
      })
      
      setEmail('')
      
      // Reset success state after 3 seconds
      setTimeout(() => setIsSubscribed(false), 3000)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to subscribe. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 p-6">
      <div className="mb-4">
        <h3 className="mb-2 text-lg font-semibold text-foreground">
          Stay Updated
        </h3>
        <p className="text-sm text-muted-foreground">
          Get travel tips, exclusive offers, and destination guides delivered to your inbox.
        </p>
      </div>
      
      {isSubscribed ? (
        <div className="flex items-center gap-2 text-green-600">
          <Heart className="h-4 w-4 fill-current" />
          <span className="text-sm font-medium">Thank you for subscribing!</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            required
          />
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      )}
    </div>
  )
}

function TrustIndicators() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-4">
        <div className="rounded-full bg-green-100 p-2">
          <Shield className="h-4 w-4 text-green-600" />
        </div>
        <div>
          <div className="text-sm font-semibold">Secure Booking</div>
          <div className="text-xs text-muted-foreground">SSL Protected</div>
        </div>
      </div>
      
      <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-4">
        <div className="rounded-full bg-blue-100 p-2">
          <Award className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <div className="text-sm font-semibold">Award Winning</div>
          <div className="text-xs text-muted-foreground">Best Tour Operator</div>
        </div>
      </div>
      
      <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-4">
        <div className="rounded-full bg-purple-100 p-2">
          <Users className="h-4 w-4 text-purple-600" />
        </div>
        <div>
          <div className="text-sm font-semibold">10,000+ Travelers</div>
          <div className="text-xs text-muted-foreground">Happy Customers</div>
        </div>
      </div>
      
      <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-4">
        <div className="rounded-full bg-orange-100 p-2">
          <Headphones className="h-4 w-4 text-orange-600" />
        </div>
        <div>
          <div className="text-sm font-semibold">24/7 Support</div>
          <div className="text-xs text-muted-foreground">Always Available</div>
        </div>
      </div>
    </div>
  )
}

export function Footer() {
  return (
    <footer className="bg-muted/30 pt-16 pb-8">
      <div className="container mx-auto px-4">
        {/* Trust Indicators */}
        <div className="mb-12">
          <TrustIndicators />
        </div>

        {/* Main Footer Content */}
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Company Info */}
          <div className="lg:col-span-4">
            <div className="mb-6">
              <Link href="/" className="flex items-center gap-2">
                <div className="rounded-lg bg-primary p-2">
                  <Globe className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-foreground">BaliDMC</span>
              </Link>
            </div>
            
            <p className="mb-6 text-muted-foreground">
              Your trusted partner for unforgettable Bali experiences. We specialize in creating 
              personalized tours and authentic cultural experiences that showcase the best of 
              Indonesia's Island of the Gods.
            </p>
            
            {/* Contact Info */}
            <div className="mb-6 space-y-3">
              {contactInfo.map((info) => {
                const Icon = info.icon
                return (
                  <div key={info.label} className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-4 w-4 text-primary flex-shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {info.label}
                      </div>
                      <div className="text-sm text-foreground">{info.value}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Social Links */}
            <div className="flex gap-2">
              {socialLinks.map((social) => {
                const Icon = social.icon
                return (
                  <Link
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-muted p-2 text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                    aria-label={social.label}
                  >
                    <Icon className="h-4 w-4" />
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Links */}
          <div className="lg:col-span-6">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(footerLinks).map(([key, section]) => (
                <div key={key}>
                  <h3 className="mb-4 font-semibold text-foreground">
                    {section.title}
                  </h3>
                  <ul className="space-y-2">
                    {section.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Newsletter */}
          <div className="lg:col-span-2">
            <NewsletterSignup />
          </div>
        </div>

        {/* Certifications */}
        <div className="my-12 border-t border-border pt-8">
          <div className="mb-6 text-center">
            <h3 className="mb-2 font-semibold text-foreground">
              Certifications & Memberships
            </h3>
            <p className="text-sm text-muted-foreground">
              Trusted by industry leaders and certified for excellence
            </p>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {certifications.map((cert) => (
              <div key={cert.name} className="text-center">
                <div className="mb-2 flex h-12 items-center justify-center">
                  <Image
                    src={cert.logo}
                    alt={cert.name}
                    width={60}
                    height={40}
                    className="object-contain opacity-70 hover:opacity-100 transition-opacity"
                  />
                </div>
                <div className="text-xs text-muted-foreground">{cert.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="mb-8 border-t border-border pt-8">
          <div className="mb-4 text-center">
            <h3 className="mb-2 font-semibold text-foreground">
              Secure Payment Methods
            </h3>
            <p className="text-sm text-muted-foreground">
              Your payment information is always secure and protected
            </p>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-4">
            {paymentMethods.map((method) => (
              <div key={method.name} className="flex h-8 items-center">
                <Image
                  src={method.logo}
                  alt={method.name}
                  width={50}
                  height={32}
                  className="object-contain opacity-70 hover:opacity-100 transition-opacity"
                />
              </div>
            ))}
            <Badge variant="outline" className="ml-2">
              <CreditCard className="mr-1 h-3 w-3" />
              SSL Secured
            </Badge>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} BaliDMC. All rights reserved.
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <Link 
                href="/privacy" 
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <Link 
                href="/terms" 
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms of Service
              </Link>
              <Link 
                href="/cookies" 
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Cookie Policy
              </Link>
              <Link 
                href="/sitemap" 
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Sitemap
              </Link>
            </div>
          </div>
          
          <div className="mt-4 text-center text-xs text-muted-foreground">
            Made with <Heart className="inline h-3 w-3 fill-red-500 text-red-500" /> in Bali, Indonesia
          </div>
        </div>
      </div>
    </footer>
  )
}