import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth, handleApiError } from '@/lib/auth/middleware'
import { quoteAssistant } from '@/lib/ai/quote-assistant'
import { prisma } from '@/lib/prisma'

const quoteSuggestionsSchema = z.object({
  budget: z.number().positive().optional(),
  duration: z.number().min(1).max(30).optional(),
  interests: z.array(z.string()).optional(),
  groupSize: z.number().min(1).max(50).optional(),
  travelStyle: z.enum(['budget', 'standard', 'luxury']).optional(),
  specialRequests: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
})

const optimizePricingSchema = z.object({
  basePrice: z.number().positive(),
  requirements: quoteSuggestionsSchema,
  agentTier: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'])
})

const generateDescriptionSchema = z.object({
  packageId: z.string().uuid(),
  requirements: quoteSuggestionsSchema
})

const chatSchema = z.object({
  message: z.string().min(1),
  context: z.object({
    quoteId: z.string().uuid().optional(),
    packageId: z.string().uuid().optional(),
    conversationId: z.string().uuid().optional()
  }).optional()
})

// POST /api/ai/quote-assistant - Main AI assistant endpoint
export async function POST(req: NextRequest) {
  return withAuth(async (authenticatedReq) => {
    try {
      const body = await req.json()
      const { action, ...data } = body
      
      switch (action) {
        case 'suggestions':
          return await handleQuoteSuggestions(data, authenticatedReq)
        case 'optimize-pricing':
          return await handleOptimizePricing(data, authenticatedReq)
        case 'generate-description':
          return await handleGenerateDescription(data, authenticatedReq)
        case 'chat':
          return await handleChat(data, authenticatedReq)
        default:
          return NextResponse.json(
            { error: 'Invalid action. Use: suggestions, optimize-pricing, generate-description, or chat' },
            { status: 400 }
          )
      }
    } catch (error) {
      return handleApiError(error)
    }
  })(req)
}

async function handleQuoteSuggestions(data: any, authenticatedReq: any) {
  const requirements = quoteSuggestionsSchema.parse(data)
  
  try {
    const suggestions = await quoteAssistant.generateQuoteSuggestions(requirements)
    
    // Get full package details for suggestions
    const packageIds = suggestions.map(s => s.packageId)
    const packages = await prisma.package.findMany({
      where: {
        id: { in: packageIds },
        isActive: true
      },
      include: {
        seasonalRates: {
          where: { isActive: true }
        }
      }
    })
    
    // Combine suggestions with package details
    const enrichedSuggestions = suggestions.map(suggestion => {
      const package_ = packages.find(p => p.id === suggestion.packageId)
      return {
        ...suggestion,
        package: package_
      }
    })
    
    // Log AI interaction
    if (authenticatedReq.user?.id) {
      await prisma.aIConversation.create({
        data: {
          userId: authenticatedReq.user.id,
          type: 'QUOTE_SUGGESTIONS',
          input: JSON.stringify(requirements),
          output: JSON.stringify(enrichedSuggestions),
          metadata: {
            suggestionsCount: suggestions.length,
            userRole: authenticatedReq.user.role
          }
        }
      })
    }
    
    return NextResponse.json({
      suggestions: enrichedSuggestions,
      count: enrichedSuggestions.length,
      requirements
    })
  } catch (error) {
    console.error('Quote suggestions error:', error)
    return NextResponse.json(
      { error: 'Failed to generate quote suggestions' },
      { status: 500 }
    )
  }
}

async function handleOptimizePricing(data: any, authenticatedReq: any) {
  const { basePrice, requirements, agentTier } = optimizePricingSchema.parse(data)
  
  try {
    const optimization = await quoteAssistant.optimizeQuotePricing(
      basePrice,
      requirements,
      agentTier
    )
    
    // Log AI interaction
    if (authenticatedReq.user?.id) {
      await prisma.aIConversation.create({
        data: {
          userId: authenticatedReq.user.id,
          type: 'PRICING_OPTIMIZATION',
          input: JSON.stringify({ basePrice, requirements, agentTier }),
          output: JSON.stringify(optimization),
          metadata: {
            originalPrice: basePrice,
            optimizedPrice: optimization.recommendedPrice,
            userRole: authenticatedReq.user.role
          }
        }
      })
    }
    
    return NextResponse.json({
      optimization,
      originalPrice: basePrice,
      savings: basePrice - optimization.recommendedPrice
    })
  } catch (error) {
    console.error('Pricing optimization error:', error)
    return NextResponse.json(
      { error: 'Failed to optimize pricing' },
      { status: 500 }
    )
  }
}

async function handleGenerateDescription(data: any, authenticatedReq: any) {
  const { packageId, requirements } = generateDescriptionSchema.parse(data)
  
  try {
    // Get package details
    const package_ = await prisma.package.findUnique({
      where: { id: packageId }
    })
    
    if (!package_) {
      return NextResponse.json(
        { error: 'Package not found' },
        { status: 404 }
      )
    }
    
    const description = await quoteAssistant.generateQuoteDescription(
      package_,
      requirements
    )
    
    // Log AI interaction
    if (authenticatedReq.user?.id) {
      await prisma.aIConversation.create({
        data: {
          userId: authenticatedReq.user.id,
          type: 'DESCRIPTION_GENERATION',
          input: JSON.stringify({ packageId, requirements }),
          output: JSON.stringify({ description }),
          metadata: {
            packageName: package_.name,
            descriptionLength: description.length,
            userRole: authenticatedReq.user.role
          }
        }
      })
    }
    
    return NextResponse.json({
      description,
      package: {
        id: package_.id,
        name: package_.name,
        category: package_.category
      }
    })
  } catch (error) {
    console.error('Description generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate description' },
      { status: 500 }
    )
  }
}

async function handleChat(data: any, authenticatedReq: any) {
  const { message, context } = chatSchema.parse(data)
  
  try {
    // Get conversation history if conversationId provided
    let conversationHistory: any[] = []
    let conversationId = context?.conversationId
    
    if (conversationId) {
      const existingConversation = await prisma.aIConversation.findUnique({
        where: { id: conversationId }
      })
      
      if (existingConversation) {
        conversationHistory = JSON.parse(existingConversation.metadata?.history || '[]')
      }
    }
    
    // Add current message to history
    conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    })
    
    // Generate AI response based on context
    let aiResponse = ''
    
    if (context?.quoteId) {
      // Quote-specific chat
      const quote = await prisma.quote.findUnique({
        where: { id: context.quoteId },
        include: {
          package: true,
          user: true
        }
      })
      
      if (quote) {
        aiResponse = await generateQuoteSpecificResponse(message, quote)
      }
    } else if (context?.packageId) {
      // Package-specific chat
      const package_ = await prisma.package.findUnique({
        where: { id: context.packageId }
      })
      
      if (package_) {
        aiResponse = await generatePackageSpecificResponse(message, package_)
      }
    } else {
      // General travel assistant chat
      aiResponse = await generateGeneralResponse(message, conversationHistory)
    }
    
    // Add AI response to history
    conversationHistory.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString()
    })
    
    // Save or update conversation
    if (conversationId) {
      await prisma.aIConversation.update({
        where: { id: conversationId },
        data: {
          output: aiResponse,
          metadata: {
            ...context,
            history: JSON.stringify(conversationHistory),
            messageCount: conversationHistory.length
          }
        }
      })
    } else {
      const newConversation = await prisma.aIConversation.create({
        data: {
          userId: authenticatedReq.user?.id,
          type: 'CHAT',
          input: message,
          output: aiResponse,
          metadata: {
            ...context,
            history: JSON.stringify(conversationHistory),
            messageCount: conversationHistory.length
          }
        }
      })
      conversationId = newConversation.id
    }
    
    return NextResponse.json({
      response: aiResponse,
      conversationId,
      messageCount: conversationHistory.length
    })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}

async function generateQuoteSpecificResponse(message: string, quote: any): Promise<string> {
  // Simple keyword-based responses for quote-specific queries
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
    return `The total price for your ${quote.package.name} package is $${quote.totalPrice} for ${quote.totalPax} people. This includes ${quote.package.duration} days of amazing experiences in Bali. Would you like me to break down the pricing details?`
  }
  
  if (lowerMessage.includes('change') || lowerMessage.includes('modify')) {
    return `I can help you modify your quote! You can adjust the travel dates, number of passengers, or add special requests. What would you like to change about your ${quote.package.name} package?`
  }
  
  if (lowerMessage.includes('book') || lowerMessage.includes('confirm')) {
    return `Great! To book your ${quote.package.name} package, you can accept this quote and we'll guide you through the booking process. A 30% deposit will secure your reservation. Would you like to proceed?`
  }
  
  return `I'm here to help with your ${quote.package.name} quote! You can ask me about pricing, modifications, booking process, or any specific details about your Bali adventure.`
}

async function generatePackageSpecificResponse(message: string, package_: any): Promise<string> {
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
    return `The ${package_.name} package starts from $${package_.basePrice} per person for ${package_.duration} days. The final price depends on your travel dates, group size, and any customizations. Would you like me to create a personalized quote?`
  }
  
  if (lowerMessage.includes('include') || lowerMessage.includes('what')) {
    const highlights = package_.highlights?.slice(0, 3).join(', ') || 'amazing experiences'
    return `The ${package_.name} package includes ${highlights} and much more! It's a ${package_.duration}-day ${package_.category} experience. Would you like detailed information about the itinerary?`
  }
  
  return `The ${package_.name} is one of our popular ${package_.category} packages! It offers ${package_.duration} days of incredible Bali experiences. How can I help you learn more about this package?`
}

async function generateGeneralResponse(message: string, history: any[]): Promise<string> {
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return `Hello! I'm your Bali travel assistant. I can help you find the perfect package, create custom quotes, answer questions about Bali, and assist with bookings. What would you like to explore today?`
  }
  
  if (lowerMessage.includes('package') || lowerMessage.includes('tour')) {
    return `We offer amazing Bali packages including cultural tours, adventure experiences, beach getaways, and luxury retreats. Each package can be customized to your preferences. What type of Bali experience interests you most?`
  }
  
  if (lowerMessage.includes('price') || lowerMessage.includes('budget')) {
    return `Our Bali packages range from budget-friendly options starting at $299 per person to luxury experiences. The price depends on duration, accommodation level, activities, and travel dates. What's your approximate budget and group size?`
  }
  
  return `I'm here to help you plan the perfect Bali adventure! You can ask me about packages, pricing, destinations, activities, or anything else about traveling to Bali. What would you like to know?`
}