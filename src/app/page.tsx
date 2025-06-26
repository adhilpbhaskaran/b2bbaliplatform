'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { AuthModal } from '@/components/auth/auth-modal'
import { 
  CheckCircle, 
  Users, 
  FileText, 
  Palette, 
  Share2, 
  Star, 
  Globe, 
  Shield, 
  Zap,
  ArrowRight,
  Play,
  MessageCircle,
  Award,
  Clock,
  TrendingUp,
  Heart,
  MapPin,
  Phone
} from 'lucide-react'

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 }
}

const fadeInUpTransition = { duration: 0.6 }

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

export default function HomePage() {
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null)

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-screen flex items-center">
        {/* Background Image */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-[#0E7A6A]/90 via-[#0E7A6A]/80 to-[#0E7A6A]/70 z-10" />
          <div className="w-full h-full bg-cover bg-center bg-no-repeat" 
               style={{
                 backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><linearGradient id="sunset" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23FF6B35"/><stop offset="50%" style="stop-color:%23F7931E"/><stop offset="100%" style="stop-color:%23FFD23F"/></linearGradient></defs><rect width="1200" height="800" fill="%23FF6B35"/><circle cx="900" cy="200" r="80" fill="%23FFD23F"/><path d="M0,600 Q300,550 600,580 T1200,600 L1200,800 L0,800 Z" fill="%230E7A6A"/><path d="M200,650 Q400,620 600,640 T1000,650 L1000,800 L200,800 Z" fill="%23065F46"/><polygon points="100,500 150,400 200,500" fill="%23111827" opacity="0.8"/><polygon points="300,480 380,350 460,480" fill="%23111827" opacity="0.7"/><polygon points="800,520 900,380 1000,520" fill="%23111827" opacity="0.6"/></svg>')`
               }}
          />
        </div>
        
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div 
            className="text-center text-white"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Logo */}
            <motion.div 
              className="flex items-center justify-center mb-8"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              <div className="text-center">
                <h1 className="text-5xl md:text-7xl font-serif text-[#D4AF37] mb-2">
                  Bali Malayali
                </h1>
                <div className="flex items-center justify-center space-x-2 text-white/80">
                  <div className="w-8 h-1 bg-[#D4AF37]"></div>
                  <span className="text-sm tracking-widest uppercase">Destination Management Company</span>
                  <div className="w-8 h-1 bg-[#D4AF37]"></div>
                </div>
              </div>
            </motion.div>
            
            <motion.h2 
              className="text-3xl md:text-5xl font-bold mb-6 leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              Your Trusted Indian DMC in Bali
            </motion.h2>
            
            <motion.p 
              className="text-xl md:text-2xl mb-8 opacity-90 max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Net rates • Instant quotes • White-label branding
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <Button 
                size="lg" 
                className="bg-[#D4AF37] text-[#111827] hover:bg-[#B8941F] px-8 py-4 text-lg font-semibold rounded-full shadow-lg"
                onClick={() => setAuthModal('register')}
              >
                Enter Agent Portal
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white text-white hover:bg-white hover:text-[#0E7A6A] px-8 py-4 text-lg font-semibold rounded-full"
                onClick={() => scrollToSection('how-it-works')}
              >
                <Play className="mr-2 h-5 w-5" />
                Learn More
              </Button>
            </motion.div>
            
            <motion.div 
              className="flex flex-wrap justify-center items-center gap-6 text-sm opacity-90"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <Clock className="h-4 w-4 mr-2" />
                Real-time Quotes
              </div>
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <MessageCircle className="h-4 w-4 mr-2" />
                Indian Support
              </div>
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <MapPin className="h-4 w-4 mr-2" />
                Ground Team in Bali
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[#111827] mb-4">
              Why Choose Bali Malayali?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Your success is our priority. We provide everything you need to excel in Bali tourism.
            </p>
          </motion.div>
          
          <motion.div 
            className="grid md:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              {
                icon: Clock,
                title: "Real-time Quotes",
                description: "Get instant pricing with our smart quote builder. No waiting, no delays.",
                color: "bg-[#0E7A6A]/10 text-[#0E7A6A]"
              },
              {
                icon: MessageCircle,
                title: "Indian Support",
                description: "Dedicated support team that understands Indian travel preferences and requirements.",
                color: "bg-[#D4AF37]/10 text-[#D4AF37]"
              },
              {
                icon: MapPin,
                title: "Ground Team in Bali",
                description: "Local expertise with 24/7 on-ground support for all your client needs.",
                color: "bg-[#0E7A6A]/10 text-[#0E7A6A]"
              }
            ].map((feature, index) => (
              <motion.div key={index} variants={fadeInUp} transition={fadeInUpTransition}>
                <Card className="h-full card-hover border-0 shadow-lg rounded-2xl">
                  <CardHeader className="text-center pb-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${feature.color}`}>
                      <feature.icon className="h-8 w-8" />
                    </div>
                    <CardTitle className="text-xl text-[#111827]">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-gray-600">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-[#F9FAFB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[#111827] mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Simple 4-step process to start selling Bali like a pro
            </p>
          </motion.div>
          
          <motion.div 
            className="grid md:grid-cols-4 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              {
                icon: Users,
                title: "Sign Up",
                description: "Quick registration with instant approval via WhatsApp",
                step: "01"
              },
              {
                icon: FileText,
                title: "Customise",
                description: "Build quotes with our smart builder and add your branding",
                step: "02"
              },
              {
                icon: Share2,
                title: "Share",
                description: "Send professional quotes via PDF, email, or WhatsApp",
                step: "03"
              },
              {
                icon: Award,
                title: "Book",
                description: "Convert leads to bookings and earn tier-based commissions",
                step: "04"
              }
            ].map((step, index) => (
              <motion.div key={index} variants={fadeInUp} transition={fadeInUpTransition} className="relative">
                {index < 3 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-[#0E7A6A] to-[#D4AF37] transform translate-x-4 z-0" />
                )}
                <div className="relative z-10 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#0E7A6A] to-[#D4AF37] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <step.icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#D4AF37] rounded-full flex items-center justify-center text-[#111827] font-bold text-sm">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-[#111827]">
                    {step.title}
                  </h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[#111827] mb-4">
              Trusted by Travel Agents
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              See what our partner agents say about working with us
            </p>
          </motion.div>
          
          <motion.div 
            className="grid md:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              {
                quote: "Bali Malayali has transformed how we sell Bali packages. The quote builder is incredibly intuitive and our clients love the professional presentation.",
                author: "Priya Sharma",
                company: "Mumbai Travel Solutions",
                location: "Mumbai, India",
                rating: 5
              },
              {
                quote: "The ground support in Bali is exceptional. Our clients always have a smooth experience, which means more repeat business for us.",
                author: "Ahmed Al-Rashid",
                company: "Desert Rose Tours",
                location: "Dubai, UAE",
                rating: 5
              },
              {
                quote: "From net rates to instant quotes, everything is transparent. The tier system motivates us to sell more and earn better commissions.",
                author: "Rajesh Kumar",
                company: "South India Travels",
                location: "Chennai, India",
                rating: 5
              }
            ].map((testimonial, index) => (
              <motion.div key={index} variants={fadeInUp} transition={fadeInUpTransition}>
                <Card className="h-full card-hover border-0 shadow-lg rounded-2xl">
                  <CardContent className="p-6">
                    <div className="flex mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 text-[#D4AF37] fill-current" />
                      ))}
                    </div>
                    <blockquote className="text-gray-700 mb-6 italic">
                      "{testimonial.quote}"
                    </blockquote>
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#0E7A6A] to-[#D4AF37] rounded-full flex items-center justify-center mr-4">
                        <span className="text-white font-semibold">
                          {testimonial.author.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold text-[#111827]">{testimonial.author}</div>
                        <div className="text-sm text-gray-600">{testimonial.company}</div>
                        <div className="text-xs text-gray-500">{testimonial.location}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Trust Badges Section */}
      <section className="py-20 bg-[#F9FAFB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[#111827] mb-4">
              Why Agents Trust Us
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Backed by experience, powered by technology, supported by passion
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "100% On-Ground Support",
                description: "24/7 local assistance for all your clients in Bali",
                icon: Shield,
                color: "from-[#0E7A6A] to-[#065F46]"
              },
              {
                title: "Secured Platform",
                description: "Bank-grade security for all transactions and data",
                icon: Globe,
                color: "from-[#D4AF37] to-[#B8941F]"
              },
              {
                title: "Backed by Nomadller",
                description: "Trusted travel technology company since 2019",
                icon: Award,
                color: "from-[#0E7A6A] to-[#065F46]"
              },
              {
                title: "Instant WhatsApp Support",
                description: "Quick responses to all your queries and concerns",
                icon: MessageCircle,
                color: "from-[#D4AF37] to-[#B8941F]"
              }
            ].map((item, index) => (
              <motion.div 
                key={index}
                className="text-center"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full card-hover border-0 shadow-lg rounded-2xl overflow-hidden">
                  <CardContent className="p-6">
                    <div className={`w-16 h-16 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                      <item.icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-[#111827]">{item.title}</h3>
                    <p className="text-gray-600 text-sm">{item.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact & CTA Section */}
      <section className="py-20 bg-gradient-to-br from-[#0E7A6A] via-[#0E7A6A] to-[#065F46] relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 border border-white/20 rounded-full"></div>
          <div className="absolute top-32 right-20 w-24 h-24 border border-white/20 rounded-full"></div>
          <div className="absolute bottom-20 left-1/4 w-40 h-40 border border-white/20 rounded-full"></div>
        </div>
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-white"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Ready to Start Selling Bali?
              </h2>
              <p className="text-xl opacity-90 mb-8">
                Join hundreds of travel agents already using our platform to create and sell amazing Bali experiences.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-[#D4AF37] rounded-full flex items-center justify-center mr-4">
                    <MapPin className="h-6 w-6 text-[#111827]" />
                  </div>
                  <div>
                    <div className="font-semibold">India Office</div>
                    <div className="opacity-80">Mumbai & Chennai</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-[#D4AF37] rounded-full flex items-center justify-center mr-4">
                    <MapPin className="h-6 w-6 text-[#111827]" />
                  </div>
                  <div>
                    <div className="font-semibold">Bali Office</div>
                    <div className="opacity-80">Denpasar, Bali</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-[#D4AF37] rounded-full flex items-center justify-center mr-4">
                    <Phone className="h-6 w-6 text-[#111827]" />
                  </div>
                  <div>
                    <div className="font-semibold">WhatsApp Support</div>
                    <div className="opacity-80">+91 98765 43210</div>
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Right Column - CTA */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center lg:text-left"
            >
              <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
                <h3 className="text-2xl font-bold text-white mb-4">
                  Start Your Journey Today
                </h3>
                <p className="text-white/80 mb-6">
                  Get instant access to our platform and start creating professional Bali quotes in minutes.
                </p>
                <div className="space-y-4">
                  <Button 
                    size="lg" 
                    className="w-full bg-[#D4AF37] text-[#111827] hover:bg-[#B8941F] px-8 py-4 text-lg font-semibold rounded-full"
                    onClick={() => setAuthModal('register')}
                  >
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="w-full border-white text-white hover:bg-white hover:text-[#0E7A6A] px-8 py-4 text-lg font-semibold rounded-full"
                    onClick={() => setAuthModal('login')}
                  >
                    Agent Login
                  </Button>
                </div>
                
                <div className="mt-6 pt-6 border-t border-white/20">
                  <div className="flex items-center justify-center space-x-6 text-sm text-white/80">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      No Setup Fees
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Instant Approval
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
      
      {authModal && (
        <AuthModal 
          type={authModal} 
          onClose={() => setAuthModal(null)}
          onSwitchType={(type) => setAuthModal(type)}
        />
      )}
    </div>
  )
}