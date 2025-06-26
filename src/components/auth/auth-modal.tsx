'use client'

import { useState } from 'react'
import { useSignIn, useSignUp } from '@clerk/nextjs'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, User, Building, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'react-hot-toast'

interface AuthModalProps {
  type: 'login' | 'register'
  onClose: () => void
  onSwitchType: (type: 'login' | 'register') => void
}

export const AuthModal = ({ type, onClose, onSwitchType }: AuthModalProps) => {
  const { signIn, setActive } = useSignIn()
  const { signUp, setActive: setActiveSignUp } = useSignUp()
  
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    company: '',
    phone: '',
    country: '',
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signIn) return

    setLoading(true)
    try {
      const result = await signIn.create({
        identifier: formData.email,
        password: formData.password,
      })

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        toast.success('Successfully signed in!')
        onClose()
      }
    } catch (error: any) {
      toast.error(error.errors?.[0]?.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signUp) return

    setLoading(true)
    try {
      await signUp.create({
        emailAddress: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
      })

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      toast.success('Please check your email for verification code')
      onClose()
    } catch (error: any) {
      toast.error(error.errors?.[0]?.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-[#111827]">
              {type === 'login' ? 'Agent Login' : 'Create Agent Account'}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <form onSubmit={type === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {type === 'register' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium text-[#374151]">
                      First Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className="pl-10 border-[#D1D5DB] focus:border-[#0E7A6A] focus:ring-[#0E7A6A]"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium text-[#374151]">
                      Last Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className="pl-10 border-[#D1D5DB] focus:border-[#0E7A6A] focus:ring-[#0E7A6A]"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company" className="text-sm font-medium text-[#374151]">
                    Travel Agency
                  </Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
                    <Input
                      id="company"
                      type="text"
                      placeholder="Your Travel Agency Name"
                      value={formData.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      className="pl-10 border-[#D1D5DB] focus:border-[#0E7A6A] focus:ring-[#0E7A6A]"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-[#374151]">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="agent@travelagency.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="pl-10 border-[#D1D5DB] focus:border-[#0E7A6A] focus:ring-[#0E7A6A]"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-[#374151]">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="pl-10 pr-10 border-[#D1D5DB] focus:border-[#0E7A6A] focus:ring-[#0E7A6A]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#6B7280] hover:text-[#374151]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#0E7A6A] to-[#065F46] hover:from-[#065F46] hover:to-[#064E3B] text-white font-medium py-2.5 transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{type === 'login' ? 'Signing In...' : 'Creating Account...'}</span>
                </div>
              ) : (
                type === 'login' ? 'Sign In to Dashboard' : 'Create Agent Account'
              )}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-sm text-[#6B7280]">
              {type === 'login' ? "Don't have an account?" : 'Already have an account?'}
              <button
                onClick={() => onSwitchType(type === 'login' ? 'register' : 'login')}
                className="ml-1 text-[#0E7A6A] hover:text-[#065F46] font-medium transition-colors"
              >
                {type === 'login' ? 'Create one here' : 'Sign in here'}
              </button>
            </p>
          </div>

          {type === 'register' && (
            <div className="text-xs text-[#6B7280] text-center space-y-1">
              <p>By creating an account, you agree to our Terms of Service and Privacy Policy.</p>
              <p>All agent accounts are subject to approval by Bali Malayali DMC.</p>
            </div>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}

export default AuthModal