'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  MessageCircle, 
  Send,
  CheckCircle,
  Globe,
  Users,
  Calendar,
  Star
} from 'lucide-react'

interface ContactForm {
  name: string
  email: string
  phone: string
  subject: string
  message: string
  preferredContact: 'email' | 'phone' | 'whatsapp'
  travelDate: string
  groupSize: string
  budget: string
}

const contactInfo = [
  {
    icon: MapPin,
    title: 'Visit Our Office',
    details: [
      'Jl. Raya Ubud No. 123',
      'Ubud, Gianyar 80571',
      'Bali, Indonesia'
    ],
    action: 'Get Directions',
    link: 'https://maps.google.com'
  },
  {
    icon: Phone,
    title: 'Call Us',
    details: [
      '+62 361 123 4567',
      '+62 812 3456 7890',
      'Available 24/7'
    ],
    action: 'Call Now',
    link: 'tel:+6236112345678'
  },
  {
    icon: Mail,
    title: 'Email Us',
    details: [
      'info@balidmc.com',
      'booking@balidmc.com',
      'support@balidmc.com'
    ],
    action: 'Send Email',
    link: 'mailto:info@balidmc.com'
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp',
    details: [
      '+62 812 3456 7890',
      'Instant responses',
      'Share photos & videos'
    ],
    action: 'Chat Now',
    link: 'https://wa.me/6281234567890'
  }
]

const officeHours = [
  { day: 'Monday - Friday', hours: '8:00 AM - 8:00 PM' },
  { day: 'Saturday', hours: '9:00 AM - 6:00 PM' },
  { day: 'Sunday', hours: '10:00 AM - 4:00 PM' },
  { day: 'Emergency Support', hours: '24/7 Available' }
]

const faqs = [
  {
    question: 'How far in advance should I book?',
    answer: 'We recommend booking at least 2-4 weeks in advance, especially during peak season (July-August, December-January).'
  },
  {
    question: 'Do you provide airport transfers?',
    answer: 'Yes, we offer complimentary airport transfers for most of our packages. Private transfers are also available.'
  },
  {
    question: 'What is your cancellation policy?',
    answer: 'Free cancellation up to 48 hours before your trip. Some activities may have different cancellation terms.'
  },
  {
    question: 'Are your guides English-speaking?',
    answer: 'All our guides are fluent in English and many speak additional languages including Japanese, Chinese, and Korean.'
  }
]

function ContactCard({ info, index }: { info: typeof contactInfo[0]; index: number }) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const Icon = info.icon

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), index * 100)
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <Card
      ref={ref}
      className={cn(
        'group transition-all duration-500 hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-white/10',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      )}
    >
      <CardContent className="p-6 text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
        
        <h3 className="mb-3 font-semibold text-foreground">{info.title}</h3>
        
        <div className="mb-4 space-y-1">
          {info.details.map((detail, i) => (
            <p key={i} className="text-sm text-muted-foreground">
              {detail}
            </p>
          ))}
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => window.open(info.link, '_blank')}
        >
          {info.action}
        </Button>
      </CardContent>
    </Card>
  )
}

function ContactForm() {
  const [formData, setFormData] = useState<ContactForm>({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    preferredContact: 'email',
    travelDate: '',
    groupSize: '',
    budget: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setIsSubmitted(true)
      toast({
        title: "Message Sent!",
        description: "We'll get back to you within 24 hours.",
        variant: "success"
      })
      
      // Reset form after success
      setTimeout(() => {
        setIsSubmitted(false)
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: '',
          message: '',
          preferredContact: 'email',
          travelDate: '',
          groupSize: '',
          budget: ''
        })
      }, 3000)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  if (isSubmitted) {
    return (
      <Card className="p-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-green-100 p-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <h3 className="mb-2 text-xl font-semibold text-foreground">
          Thank You!
        </h3>
        <p className="text-muted-foreground">
          Your message has been sent successfully. We'll get back to you within 24 hours.
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send Us a Message</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                placeholder="your@email.com"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Preferred Contact Method
              </label>
              <select
                name="preferredContact"
                value={formData.preferredContact}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
          </div>

          {/* Travel Details */}
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Travel Date
              </label>
              <input
                type="date"
                name="travelDate"
                value={formData.travelDate}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Group Size
              </label>
              <select
                name="groupSize"
                value={formData.groupSize}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Select group size</option>
                <option value="1">Solo Traveler</option>
                <option value="2">Couple (2 people)</option>
                <option value="3-5">Small Group (3-5)</option>
                <option value="6-10">Medium Group (6-10)</option>
                <option value="10+">Large Group (10+)</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Budget Range
              </label>
              <select
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Select budget</option>
                <option value="under-500">Under $500</option>
                <option value="500-1000">$500 - $1,000</option>
                <option value="1000-2000">$1,000 - $2,000</option>
                <option value="2000-5000">$2,000 - $5,000</option>
                <option value="5000+">$5,000+</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Subject *
            </label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              placeholder="What can we help you with?"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Message *
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              rows={5}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none"
              placeholder="Tell us about your dream Bali experience..."
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Sending Message...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Message
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export function Contact() {
  const [selectedFaq, setSelectedFaq] = useState<number | null>(null)

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
            Get in Touch
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Ready to start planning your perfect Bali adventure? 
            We're here to help make your dreams come true.
          </p>
        </div>

        {/* Contact Cards */}
        <div className="mb-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {contactInfo.map((info, index) => (
            <ContactCard key={info.title} info={info} index={index} />
          ))}
        </div>

        {/* Main Content */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <ContactForm />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Office Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Office Hours
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {officeHours.map((schedule, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{schedule.day}</span>
                    <span className="font-medium">{schedule.hours}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Why Choose Us</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">10,000+ Happy Travelers</div>
                    <div className="text-sm text-muted-foreground">Since 2015</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Star className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">4.9/5 Average Rating</div>
                    <div className="text-sm text-muted-foreground">From 2,500+ reviews</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">24/7 Support</div>
                    <div className="text-sm text-muted-foreground">Always here to help</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">Local Expertise</div>
                    <div className="text-sm text-muted-foreground">Born and raised in Bali</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
              <CardHeader>
                <CardTitle className="text-red-700 dark:text-red-300">
                  Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-sm text-red-600 dark:text-red-400">
                  For urgent assistance during your trip:
                </p>
                <div className="space-y-1">
                  <div className="font-semibold text-red-700 dark:text-red-300">
                    +62 812 3456 7890
                  </div>
                  <div className="text-sm text-red-600 dark:text-red-400">
                    Available 24/7
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <div className="mb-8 text-center">
            <h3 className="mb-4 text-2xl font-bold text-foreground">
              Frequently Asked Questions
            </h3>
            <p className="text-muted-foreground">
              Quick answers to common questions
            </p>
          </div>
          
          <div className="mx-auto max-w-3xl space-y-4">
            {faqs.map((faq, index) => (
              <Card key={index} className="overflow-hidden">
                <button
                  onClick={() => setSelectedFaq(selectedFaq === index ? null : index)}
                  className="w-full p-4 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-foreground">{faq.question}</h4>
                    <div className={cn(
                      'transition-transform duration-200',
                      selectedFaq === index ? 'rotate-180' : ''
                    )}>
                      ▼
                    </div>
                  </div>
                </button>
                {selectedFaq === index && (
                  <div className="border-t bg-muted/30 p-4">
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}