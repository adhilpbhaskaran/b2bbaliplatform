import { prisma } from '@/lib/prisma'
import { quoteAssistant } from '@/lib/ai/quote-assistant'
import type { QuoteRequirements } from '@/lib/ai/quote-assistant'

export interface WhatsAppMessage {
  id: string
  from: string
  to: string
  message: string
  timestamp: Date
  type: 'text' | 'image' | 'document' | 'location'
  metadata?: Record<string, any>
}

export interface ManyChat {
  sendMessage(phoneNumber: string, message: string): Promise<boolean>
  sendTemplate(phoneNumber: string, templateName: string, params: Record<string, any>): Promise<boolean>
  setUserField(phoneNumber: string, fieldName: string, value: any): Promise<boolean>
  triggerFlow(phoneNumber: string, flowId: string): Promise<boolean>
}

export class WhatsAppAutomation {
  private static instance: WhatsAppAutomation
  private manychat: ManyChat

  private constructor() {
    this.manychat = this.initializeManyChat()
  }

  public static getInstance(): WhatsAppAutomation {
    if (!WhatsAppAutomation.instance) {
      WhatsAppAutomation.instance = new WhatsAppAutomation()
    }
    return WhatsAppAutomation.instance
  }

  private initializeManyChat(): ManyChat {
    const apiKey = process.env.MANYCHAT_API_KEY!
    const baseUrl = 'https://api.manychat.com/fb'

    return {
      async sendMessage(phoneNumber: string, message: string): Promise<boolean> {
        try {
          const response = await fetch(`${baseUrl}/sending/sendContent`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              subscriber_id: phoneNumber,
              data: {
                version: 'v2',
                content: {
                  messages: [{
                    type: 'text',
                    text: message
                  }]
                }
              }
            })
          })
          return response.ok
        } catch (error) {
          console.error('ManyChat send message error:', error)
          return false
        }
      },

      async sendTemplate(phoneNumber: string, templateName: string, params: Record<string, any>): Promise<boolean> {
        try {
          const response = await fetch(`${baseUrl}/sending/sendContent`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              subscriber_id: phoneNumber,
              data: {
                version: 'v2',
                content: {
                  messages: [{
                    type: 'template',
                    template_name: templateName,
                    template_params: params
                  }]
                }
              }
            })
          })
          return response.ok
        } catch (error) {
          console.error('ManyChat send template error:', error)
          return false
        }
      },

      async setUserField(phoneNumber: string, fieldName: string, value: any): Promise<boolean> {
        try {
          const response = await fetch(`${baseUrl}/subscriber/setCustomField`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              subscriber_id: phoneNumber,
              field_name: fieldName,
              field_value: value
            })
          })
          return response.ok
        } catch (error) {
          console.error('ManyChat set field error:', error)
          return false
        }
      },

      async triggerFlow(phoneNumber: string, flowId: string): Promise<boolean> {
        try {
          const response = await fetch(`${baseUrl}/subscriber/createTag`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              subscriber_id: phoneNumber,
              tag_name: `trigger_${flowId}`
            })
          })
          return response.ok
        } catch (error) {
          console.error('ManyChat trigger flow error:', error)
          return false
        }
      }
    }
  }

  async handleIncomingMessage(message: WhatsAppMessage): Promise<void> {
    try {
      // Store message in database
      await prisma.whatsAppMessage.create({
        data: {
          messageId: message.id,
          fromNumber: message.from,
          toNumber: message.to,
          content: message.message,
          messageType: message.type,
          metadata: message.metadata || {},
          timestamp: message.timestamp
        }
      })

      // Process message based on content
      await this.processMessage(message)
    } catch (error) {
      console.error('Error handling incoming message:', error)
    }
  }

  private async processMessage(message: WhatsAppMessage): Promise<void> {
    const content = message.message.toLowerCase()
    const phoneNumber = message.from

    // Check if user exists or create new lead
    let user = await prisma.user.findFirst({
      where: { phone: phoneNumber }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: phoneNumber,
          role: 'CUSTOMER',
          status: 'ACTIVE',
          source: 'WHATSAPP'
        }
      })
    }

    // Intent detection and routing
    if (this.isQuoteRequest(content)) {
      await this.handleQuoteRequest(phoneNumber, content)
    } else if (this.isBookingInquiry(content)) {
      await this.handleBookingInquiry(phoneNumber, content)
    } else if (this.isPriceInquiry(content)) {
      await this.handlePriceInquiry(phoneNumber, content)
    } else if (this.isGeneralInquiry(content)) {
      await this.handleGeneralInquiry(phoneNumber, content)
    } else {
      await this.handleUnknownIntent(phoneNumber, content)
    }
  }

  private isQuoteRequest(content: string): boolean {
    const keywords = ['quote', 'package', 'trip', 'vacation', 'tour', 'travel', 'bali']
    return keywords.some(keyword => content.includes(keyword))
  }

  private isBookingInquiry(content: string): boolean {
    const keywords = ['book', 'reserve', 'confirm', 'availability']
    return keywords.some(keyword => content.includes(keyword))
  }

  private isPriceInquiry(content: string): boolean {
    const keywords = ['price', 'cost', 'how much', 'budget', 'rate']
    return keywords.some(keyword => content.includes(keyword))
  }

  private isGeneralInquiry(content: string): boolean {
    const keywords = ['info', 'information', 'details', 'help', 'question']
    return keywords.some(keyword => content.includes(keyword))
  }

  private async handleQuoteRequest(phoneNumber: string, content: string): Promise<void> {
    try {
      // Extract requirements from message using AI
      const requirements = await this.extractRequirements(content)
      
      // Get AI suggestions
      const suggestions = await quoteAssistant.generateQuoteSuggestions(requirements)
      
      if (suggestions.length > 0) {
        const topSuggestion = suggestions[0]
        
        // Get package details
        const package_ = await prisma.package.findUnique({
          where: { id: topSuggestion.packageId }
        })
        
        if (package_) {
          // Send personalized quote message
          const message = `🌴 *Perfect Bali Package for You!*\n\n` +
            `📦 *${package_.name}*\n` +
            `⏰ ${package_.duration} days\n` +
            `💰 Starting from $${topSuggestion.estimatedPrice}\n\n` +
            `${topSuggestion.reasoning}\n\n` +
            `Would you like me to create a detailed quote for you? Just reply "YES" and I'll prepare everything! 🎯`
          
          await this.manychat.sendMessage(phoneNumber, message)
          
          // Set user fields for follow-up
          await this.manychat.setUserField(phoneNumber, 'last_package_interest', package_.id)
          await this.manychat.setUserField(phoneNumber, 'estimated_budget', topSuggestion.estimatedPrice)
        }
      } else {
        // Trigger general quote flow
        await this.manychat.triggerFlow(phoneNumber, 'quote_builder_flow')
      }
    } catch (error) {
      console.error('Error handling quote request:', error)
      await this.manychat.sendMessage(phoneNumber, 
        "I'd love to help you plan your Bali trip! Let me connect you with one of our travel experts who can create a perfect package for you. 🌺"
      )
    }
  }

  private async handleBookingInquiry(phoneNumber: string, content: string): Promise<void> {
    await this.manychat.sendTemplate(phoneNumber, 'booking_inquiry', {
      customer_name: 'Valued Customer'
    })
    await this.manychat.triggerFlow(phoneNumber, 'booking_flow')
  }

  private async handlePriceInquiry(phoneNumber: string, content: string): Promise<void> {
    const message = `💰 *Bali Package Pricing*\n\n` +
      `Our packages start from $299 per person and can be customized based on:\n\n` +
      `🏨 Accommodation level\n` +
      `🚗 Transportation type\n` +
      `🎯 Activities included\n` +
      `📅 Travel dates\n` +
      `👥 Group size\n\n` +
      `For an accurate quote, tell me about your preferences and I'll create a personalized package! 🎨`
    
    await this.manychat.sendMessage(phoneNumber, message)
  }

  private async handleGeneralInquiry(phoneNumber: string, content: string): Promise<void> {
    await this.manychat.triggerFlow(phoneNumber, 'general_info_flow')
  }

  private async handleUnknownIntent(phoneNumber: string, content: string): Promise<void> {
    const message = `Hi there! 👋\n\n` +
      `I'm your Bali travel assistant! I can help you with:\n\n` +
      `🎯 Custom travel quotes\n` +
      `📋 Package information\n` +
      `💰 Pricing details\n` +
      `📞 Booking assistance\n\n` +
      `What would you like to know about your Bali adventure? 🌴`
    
    await this.manychat.sendMessage(phoneNumber, message)
  }

  private async extractRequirements(content: string): Promise<QuoteRequirements> {
    // Simple keyword extraction - can be enhanced with NLP
    const requirements: QuoteRequirements = {}
    
    // Extract budget
    const budgetMatch = content.match(/\$?(\d+)/)
    if (budgetMatch) {
      requirements.budget = parseInt(budgetMatch[1])
    }
    
    // Extract duration
    const durationMatch = content.match(/(\d+)\s*(day|night)/i)
    if (durationMatch) {
      requirements.duration = parseInt(durationMatch[1])
    }
    
    // Extract group size
    const groupMatch = content.match(/(\d+)\s*(people|person|pax)/i)
    if (groupMatch) {
      requirements.groupSize = parseInt(groupMatch[1])
    }
    
    // Extract interests
    const interests: string[] = []
    if (content.includes('adventure')) interests.push('adventure')
    if (content.includes('culture')) interests.push('culture')
    if (content.includes('beach')) interests.push('beach')
    if (content.includes('temple')) interests.push('temples')
    if (content.includes('food')) interests.push('culinary')
    
    if (interests.length > 0) {
      requirements.interests = interests
    }
    
    // Extract travel style
    if (content.includes('luxury') || content.includes('premium')) {
      requirements.travelStyle = 'luxury'
    } else if (content.includes('budget') || content.includes('cheap')) {
      requirements.travelStyle = 'budget'
    } else {
      requirements.travelStyle = 'standard'
    }
    
    return requirements
  }

  async sendQuoteFollowUp(quoteId: string): Promise<void> {
    try {
      const quote = await prisma.quote.findUnique({
        where: { id: quoteId },
        include: {
          user: true,
          package: true
        }
      })

      if (!quote?.user?.phone) return

      const message = `🎯 *Your Bali Quote is Ready!*\n\n` +
        `Package: ${quote.package?.name}\n` +
        `Total: $${quote.totalPrice}\n` +
        `Valid until: ${new Date(quote.validUntil).toLocaleDateString()}\n\n` +
        `Ready to book your dream Bali vacation? Reply "BOOK" to secure your spot! 🌺`

      await this.manychat.sendMessage(quote.user.phone, message)
    } catch (error) {
      console.error('Error sending quote follow-up:', error)
    }
  }

  async sendBookingConfirmation(bookingId: string): Promise<void> {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          user: true,
          quote: {
            include: { package: true }
          }
        }
      })

      if (!booking?.user?.phone) return

      const message = `✅ *Booking Confirmed!*\n\n` +
        `Booking ID: ${booking.bookingNumber}\n` +
        `Package: ${booking.quote?.package?.name}\n` +
        `Dates: ${new Date(booking.startDate).toLocaleDateString()} - ${new Date(booking.endDate).toLocaleDateString()}\n` +
        `Total: $${booking.totalAmount}\n\n` +
        `We'll send you detailed itinerary and travel documents soon! 🎉\n\n` +
        `Have questions? Just message us anytime! 💬`

      await this.manychat.sendMessage(booking.user.phone, message)
    } catch (error) {
      console.error('Error sending booking confirmation:', error)
    }
  }

  async sendPaymentReminder(bookingId: string): Promise<void> {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          user: true,
          payments: true
        }
      })

      if (!booking?.user?.phone) return

      const totalPaid = booking.payments
        .filter(p => p.status === 'COMPLETED')
        .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0)
      
      const remaining = parseFloat(booking.totalAmount.toString()) - totalPaid

      if (remaining > 0) {
        const message = `💳 *Payment Reminder*\n\n` +
          `Booking: ${booking.bookingNumber}\n` +
          `Remaining: $${remaining}\n` +
          `Due date: ${new Date(booking.startDate).toLocaleDateString()}\n\n` +
          `Please complete your payment to secure your Bali adventure! 🌴\n\n` +
          `Reply "PAY" for payment link.`

        await this.manychat.sendMessage(booking.user.phone, message)
      }
    } catch (error) {
      console.error('Error sending payment reminder:', error)
    }
  }
}

export const whatsappAutomation = WhatsAppAutomation.getInstance()