'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useUser, SignOutButton } from '@clerk/nextjs'
import { motion } from 'framer-motion'
import { Menu, X, User, LogOut, Settings, BarChart3, MessageCircle, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import AuthModal from './AuthModal'

const Navbar = () => {
  const { isSignedIn, user } = useUser()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')

  const userRole = user?.publicMetadata?.role as string
  const userTier = user?.publicMetadata?.tier as string

  const handleAuthClick = (mode: 'login' | 'register') => {
    setAuthMode(mode)
    setShowAuthModal(true)
  }

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/features', label: 'Features' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/contact', label: 'Contact' },
  ]

  return (
    <>
      <nav className="bg-white/95 backdrop-blur-sm border-b border-[#0E7A6A]/10 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3">
              <div className="relative">
                {/* Palm and Pagoda Silhouette */}
                <svg width="40" height="40" viewBox="0 0 40 40" className="palm-shadow">
                  <defs>
                    <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0E7A6A" />
                      <stop offset="100%" stopColor="#D4AF37" />
                    </linearGradient>
                  </defs>
                  {/* Pagoda */}
                  <path d="M20 8 L16 12 L24 12 Z M20 12 L14 16 L26 16 Z M20 16 L12 20 L28 20 Z" fill="url(#logoGradient)" />
                  {/* Palm Tree */}
                  <path d="M8 32 Q8 28 12 24 Q16 20 20 24 Q24 20 28 24 Q32 28 32 32" stroke="url(#logoGradient)" strokeWidth="2" fill="none" />
                  <circle cx="20" cy="32" r="2" fill="url(#logoGradient)" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xl text-[#0E7A6A] leading-tight">
                  Bali Malayali
                </span>
                <span className="text-xs text-[#D4AF37] font-medium tracking-wide">
                  TRUSTED DMC
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-gray-700 hover:text-[#0E7A6A] font-medium transition-colors duration-200 relative group"
                >
                  {item.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#D4AF37] transition-all duration-200 group-hover:w-full"></span>
                </Link>
              ))}
            </div>

            {/* Auth Section */}
            <div className="hidden md:flex items-center space-x-4">
              {isSignedIn ? (
                <div className="flex items-center space-x-3">
                  {/* WhatsApp Support */}
                  <Button variant="ghost" size="icon" className="text-[#0E7A6A] hover:bg-[#0E7A6A]/10">
                    <MessageCircle className="w-5 h-5" />
                  </Button>
                  
                  {/* Notifications */}
                  <Button variant="ghost" size="icon" className="text-[#0E7A6A] hover:bg-[#0E7A6A]/10 relative">
                    <Bell className="w-5 h-5" />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#D4AF37] rounded-full text-xs flex items-center justify-center text-white font-bold">3</span>
                  </Button>
                  
                  {/* User Menu */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" className="flex items-center space-x-2 hover:bg-[#0E7A6A]/10">
                        <div className="w-8 h-8 bg-gradient-to-r from-[#0E7A6A] to-[#D4AF37] rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {(user.firstName?.[0] || 'U').toUpperCase()}
                          </span>
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-medium text-[#111827]">{user.firstName || 'User'}</span>
                          {userTier && (
                            <Badge variant={userTier.toLowerCase() as any} className="text-xs">
                              {userTier}
                            </Badge>
                          )}
                        </div>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-80">
                      <DialogHeader>
                        <DialogTitle>Account Menu</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-2">
                        <Link href={userRole === 'admin' ? '/admin' : '/dashboard'}>
                          <Button variant="ghost" className="w-full justify-start">
                            <BarChart3 className="w-4 h-4 mr-2" />
                            {userRole === 'admin' ? 'Admin Panel' : 'Dashboard'}
                          </Button>
                        </Link>
                        <Link href="/settings">
                          <Button variant="ghost" className="w-full justify-start">
                            <Settings className="w-4 h-4 mr-2" />
                            Settings
                          </Button>
                        </Link>
                        <SignOutButton>
                          <Button variant="ghost" className="w-full justify-start text-red-600">
                            <LogOut className="w-4 h-4 mr-2" />
                            Sign Out
                          </Button>
                        </SignOutButton>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    onClick={() => handleAuthClick('login')}
                    className="text-[#0E7A6A] hover:bg-[#0E7A6A]/10 font-medium"
                  >
                    Agent Login
                  </Button>
                  <Button
                    onClick={() => handleAuthClick('register')}
                    className="btn-primary px-6 py-2"
                  >
                    Enter Agent Portal
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-200"
          >
            <div className="px-4 py-4 space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block text-gray-700 hover:text-[#0E7A6A] font-medium transition-colors duration-200 py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              
              {isSignedIn ? (
                <div className="space-y-2 pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-3 py-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-[#0E7A6A] to-[#D4AF37] rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {(user.firstName?.[0] || 'U').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-[#111827]">{user.firstName || 'User'}</span>
                      {userTier && (
                        <Badge variant={userTier.toLowerCase() as any} className="text-xs w-fit">
                          {userTier}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Link href={userRole === 'admin' ? '/admin' : '/dashboard'}>
                    <Button variant="ghost" className="w-full justify-start">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      {userRole === 'admin' ? 'Admin Panel' : 'Dashboard'}
                    </Button>
                  </Link>
                  <SignOutButton>
                    <Button variant="ghost" className="w-full justify-start text-red-600">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </SignOutButton>
                </div>
              ) : (
                <div className="space-y-2 pt-4 border-t border-gray-200">
                  <Button
                    variant="ghost"
                    className="w-full text-[#0E7A6A] hover:bg-[#0E7A6A]/10"
                    onClick={() => {
                      handleAuthClick('login')
                      setIsMenuOpen(false)
                    }}
                  >
                    Agent Login
                  </Button>
                  <Button
                    className="w-full btn-primary"
                    onClick={() => {
                      handleAuthClick('register')
                      setIsMenuOpen(false)
                    }}
                  >
                    Enter Agent Portal
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </nav>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
        onModeChange={setAuthMode}
      />
    </>
  )
}

export default Navbar