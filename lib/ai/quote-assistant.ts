import OpenAI from 'openai'
import { Pinecone } from '@pinecone-database/pinecone'
import { prisma } from '@/lib/prisma'
import type { Package, Quote } from '@prisma/client'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
})

export interface QuoteRequirements {
  budget?: number
  duration?: number
  interests?: string[]
  groupSize?: number
  travelStyle?: 'budget' | 'standard' | 'luxury'
  specialRequests?: string
}

export interface AIQuoteSuggestion {
  packageId: string
  confidence: number
  reasoning: string
  customizations: string[]
  estimatedPrice: number
}

export class QuoteAssistant {
  private static instance: QuoteAssistant
  private index: any

  private constructor() {
    this.initializePinecone()
  }

  public static getInstance(): QuoteAssistant {
    if (!QuoteAssistant.instance) {
      QuoteAssistant.instance = new QuoteAssistant()
    }
    return QuoteAssistant.instance
  }

  private async initializePinecone() {
    try {
      this.index = pinecone.index('bali-packages')
    } catch (error) {
      console.error('Failed to initialize Pinecone:', error)
    }
  }

  async generateQuoteSuggestions(
    requirements: QuoteRequirements
  ): Promise<AIQuoteSuggestion[]> {
    try {
      // 1. Convert requirements to embeddings
      const requirementsText = this.formatRequirements(requirements)
      const embedding = await this.createEmbedding(requirementsText)

      // 2. Search similar packages in Pinecone
      const similarPackages = await this.searchSimilarPackages(embedding)

      // 3. Get package details from database
      const packageIds = similarPackages.map(p => p.id)
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

      // 4. Generate AI recommendations
      const suggestions = await this.generateRecommendations(
        requirements,
        packages,
        similarPackages
      )

      return suggestions
    } catch (error) {
      console.error('Error generating quote suggestions:', error)
      return []
    }
  }

  async generateQuoteDescription(
    packageData: Package,
    requirements: QuoteRequirements
  ): Promise<string> {
    try {
      const prompt = `
Create a compelling, personalized quote description for a Bali travel package.

Package Details:
- Name: ${packageData.name}
- Duration: ${packageData.duration} days
- Category: ${packageData.category}
- Highlights: ${packageData.highlights.join(', ')}

Client Requirements:
- Budget: ${requirements.budget ? `$${requirements.budget}` : 'Flexible'}
- Group Size: ${requirements.groupSize || 'Not specified'}
- Interests: ${requirements.interests?.join(', ') || 'General tourism'}
- Travel Style: ${requirements.travelStyle || 'Standard'}
- Special Requests: ${requirements.specialRequests || 'None'}

Write a personalized, engaging description that:
1. Highlights how this package matches their interests
2. Mentions specific experiences they'll enjoy
3. Creates excitement about their Bali adventure
4. Maintains a professional yet warm tone
5. Is 2-3 paragraphs long

Focus on experiences, not just features.
`

      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a Bali travel expert who creates personalized, compelling travel descriptions that convert prospects into bookings.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })

      return completion.choices[0].message.content || ''
    } catch (error) {
      console.error('Error generating quote description:', error)
      return ''
    }
  }

  async optimizeQuotePricing(
    basePrice: number,
    requirements: QuoteRequirements,
    agentTier: string
  ): Promise<{
    recommendedPrice: number
    reasoning: string
    alternatives: Array<{ price: number; description: string }>
  }> {
    try {
      const prompt = `
As a Bali travel pricing expert, optimize this quote pricing:

Base Price: $${basePrice}
Client Budget: ${requirements.budget ? `$${requirements.budget}` : 'Not specified'}
Group Size: ${requirements.groupSize || 1}
Travel Style: ${requirements.travelStyle || 'standard'}
Agent Tier: ${agentTier}

Provide:
1. Recommended final price with reasoning
2. 2-3 alternative pricing options (budget/premium)
3. Justification for each price point

Consider:
- Market positioning
- Value perception
- Conversion probability
- Profit margins
- Competitive pricing

Respond in JSON format:
{
  "recommendedPrice": number,
  "reasoning": "string",
  "alternatives": [
    { "price": number, "description": "string" }
  ]
}
`

      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a travel pricing strategist. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.3
      })

      const response = JSON.parse(completion.choices[0].message.content || '{}')
      return response
    } catch (error) {
      console.error('Error optimizing pricing:', error)
      return {
        recommendedPrice: basePrice,
        reasoning: 'Standard pricing applied',
        alternatives: []
      }
    }
  }

  private formatRequirements(requirements: QuoteRequirements): string {
    const parts = []
    
    if (requirements.budget) parts.push(`Budget: $${requirements.budget}`)
    if (requirements.duration) parts.push(`Duration: ${requirements.duration} days`)
    if (requirements.groupSize) parts.push(`Group size: ${requirements.groupSize} people`)
    if (requirements.travelStyle) parts.push(`Travel style: ${requirements.travelStyle}`)
    if (requirements.interests?.length) parts.push(`Interests: ${requirements.interests.join(', ')}`)
    if (requirements.specialRequests) parts.push(`Special requests: ${requirements.specialRequests}`)
    
    return parts.join('. ')
  }

  private async createEmbedding(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text
    })
    return response.data[0].embedding
  }

  private async searchSimilarPackages(embedding: number[]): Promise<any[]> {
    if (!this.index) return []
    
    try {
      const queryResponse = await this.index.query({
        vector: embedding,
        topK: 5,
        includeMetadata: true
      })
      return queryResponse.matches || []
    } catch (error) {
      console.error('Pinecone search error:', error)
      return []
    }
  }

  private async generateRecommendations(
    requirements: QuoteRequirements,
    packages: any[],
    similarPackages: any[]
  ): Promise<AIQuoteSuggestion[]> {
    const suggestions: AIQuoteSuggestion[] = []

    for (const pkg of packages.slice(0, 3)) {
      const similarity = similarPackages.find(sp => sp.id === pkg.id)
      const confidence = similarity?.score || 0.5

      // Calculate estimated price with seasonal adjustments
      const estimatedPrice = this.calculateEstimatedPrice(pkg, requirements)

      // Generate reasoning with AI
      const reasoning = await this.generateReasoning(pkg, requirements)

      suggestions.push({
        packageId: pkg.id,
        confidence,
        reasoning,
        customizations: this.suggestCustomizations(pkg, requirements),
        estimatedPrice
      })
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence)
  }

  private calculateEstimatedPrice(pkg: any, requirements: QuoteRequirements): number {
    let basePrice = parseFloat(pkg.basePrice.toString())
    const groupSize = requirements.groupSize || 2
    const duration = requirements.duration || pkg.duration
    
    // Apply group size multiplier
    basePrice *= groupSize
    
    // Apply duration adjustment if different from package default
    if (duration !== pkg.duration) {
      basePrice = (basePrice / pkg.duration) * duration
    }
    
    // Apply travel style multiplier
    const styleMultipliers = {
      budget: 0.8,
      standard: 1.0,
      luxury: 1.4
    }
    
    const multiplier = styleMultipliers[requirements.travelStyle || 'standard']
    basePrice *= multiplier
    
    return Math.round(basePrice)
  }

  private async generateReasoning(pkg: any, requirements: QuoteRequirements): Promise<string> {
    try {
      const prompt = `Explain in 1-2 sentences why this package matches the client's needs:

Package: ${pkg.name} (${pkg.category})
Client needs: ${this.formatRequirements(requirements)}

Be specific and compelling.`

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.7
      })

      return completion.choices[0].message.content || 'Great match for your requirements'
    } catch (error) {
      return 'Recommended based on your preferences'
    }
  }

  private suggestCustomizations(pkg: any, requirements: QuoteRequirements): string[] {
    const customizations: string[] = []
    
    if (requirements.travelStyle === 'luxury') {
      customizations.push('Upgrade to premium accommodations')
      customizations.push('Add private transportation')
    }
    
    if (requirements.travelStyle === 'budget') {
      customizations.push('Select budget-friendly hotels')
      customizations.push('Use shared transportation')
    }
    
    if (requirements.interests?.includes('adventure')) {
      customizations.push('Add adventure activities')
    }
    
    if (requirements.interests?.includes('culture')) {
      customizations.push('Include cultural experiences')
    }
    
    if (requirements.specialRequests) {
      customizations.push('Custom arrangements as requested')
    }
    
    return customizations
  }
}

export const quoteAssistant = QuoteAssistant.getInstance()