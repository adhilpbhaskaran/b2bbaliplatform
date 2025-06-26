import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer'
import type { Quote, Package, User, Agent } from '@prisma/client'

// Register fonts
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2' },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hiA.woff2', fontWeight: 'bold' }
  ]
})

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
    fontFamily: 'Inter',
    fontSize: 11,
    lineHeight: 1.4
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb'
  },
  logo: {
    width: 120,
    height: 40
  },
  companyInfo: {
    textAlign: 'right',
    fontSize: 10,
    color: '#6b7280'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20
  },
  section: {
    marginBottom: 25
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  label: {
    fontWeight: 'bold',
    color: '#374151',
    width: '40%'
  },
  value: {
    color: '#6b7280',
    width: '60%'
  },
  packageCard: {
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  packageTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8
  },
  packageDescription: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 10,
    lineHeight: 1.5
  },
  highlightsList: {
    marginTop: 8
  },
  highlight: {
    fontSize: 10,
    color: '#059669',
    marginBottom: 3,
    paddingLeft: 10
  },
  priceBreakdown: {
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 8,
    marginTop: 15
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  priceLabel: {
    fontSize: 11,
    color: '#374151'
  },
  priceValue: {
    fontSize: 11,
    color: '#374151',
    fontWeight: 'bold'
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#d1d5db'
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669'
  },
  termsSection: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fbbf24'
  },
  termsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 8
  },
  termsList: {
    fontSize: 9,
    color: '#92400e',
    lineHeight: 1.4
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: '#9ca3af',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 15
  },
  contactInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8fafc',
    borderRadius: 8
  },
  contactItem: {
    alignItems: 'center'
  },
  contactLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 2
  },
  contactValue: {
    fontSize: 10,
    color: '#1f2937',
    fontWeight: 'bold'
  },
  validityBadge: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    padding: 8,
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20
  }
})

interface QuoteWithDetails extends Quote {
  package: Package
  user: User
  agent: Agent
}

interface QuotePDFProps {
  quote: QuoteWithDetails
  pricingBreakdown: {
    basePrice: number
    seasonalMultiplier: number
    tierDiscount: number
    addOns: Array<{ name: string; price: number }>
    taxes: number
    total: number
  }
}

export const QuotePDF: React.FC<QuotePDFProps> = ({ quote, pricingBreakdown }) => {
  const formatCurrency = (amount: number) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  const formatDate = (date: Date | string) => new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Bali DMC</Text>
            <Text style={styles.subtitle}>Your Gateway to Bali</Text>
          </View>
          <View style={styles.companyInfo}>
            <Text>Quote #{quote.quoteNumber}</Text>
            <Text>Generated: {formatDate(quote.createdAt)}</Text>
            <Text>Valid Until: {formatDate(quote.validUntil)}</Text>
          </View>
        </View>

        {/* Validity Badge */}
        <View style={styles.validityBadge}>
          <Text>This quote is valid until {formatDate(quote.validUntil)}</Text>
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{quote.user.firstName} {quote.user.lastName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{quote.user.email}</Text>
          </View>
          {quote.user.phone && (
            <View style={styles.row}>
              <Text style={styles.label}>Phone:</Text>
              <Text style={styles.value}>{quote.user.phone}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Travel Dates:</Text>
            <Text style={styles.value}>
              {formatDate(quote.startDate)} - {formatDate(quote.endDate)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Passengers:</Text>
            <Text style={styles.value}>{quote.totalPax} people</Text>
          </View>
        </View>

        {/* Package Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Package Details</Text>
          <View style={styles.packageCard}>
            <Text style={styles.packageTitle}>{quote.package.name}</Text>
            <Text style={styles.packageDescription}>{quote.package.description}</Text>
            
            <View style={styles.row}>
              <Text style={styles.label}>Duration:</Text>
              <Text style={styles.value}>{quote.package.duration} days</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Category:</Text>
              <Text style={styles.value}>{quote.package.category}</Text>
            </View>
            
            {quote.package.highlights && quote.package.highlights.length > 0 && (
              <View style={styles.highlightsList}>
                <Text style={styles.label}>Package Highlights:</Text>
                {quote.package.highlights.map((highlight, index) => (
                  <Text key={index} style={styles.highlight}>• {highlight}</Text>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Custom Description */}
        {quote.customDescription && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personalized Experience</Text>
            <Text style={styles.packageDescription}>{quote.customDescription}</Text>
          </View>
        )}

        {/* Pricing Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing Breakdown</Text>
          <View style={styles.priceBreakdown}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Base Package Price ({quote.totalPax} pax)</Text>
              <Text style={styles.priceValue}>{formatCurrency(pricingBreakdown.basePrice)}</Text>
            </View>
            
            {pricingBreakdown.seasonalMultiplier !== 1 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Seasonal Adjustment</Text>
                <Text style={styles.priceValue}>
                  {pricingBreakdown.seasonalMultiplier > 1 ? '+' : ''}
                  {formatCurrency((pricingBreakdown.seasonalMultiplier - 1) * pricingBreakdown.basePrice)}
                </Text>
              </View>
            )}
            
            {pricingBreakdown.tierDiscount > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Agent Tier Discount</Text>
                <Text style={styles.priceValue}>-{formatCurrency(pricingBreakdown.tierDiscount)}</Text>
              </View>
            )}
            
            {pricingBreakdown.addOns.map((addOn, index) => (
              <View key={index} style={styles.priceRow}>
                <Text style={styles.priceLabel}>{addOn.name}</Text>
                <Text style={styles.priceValue}>{formatCurrency(addOn.price)}</Text>
              </View>
            ))}
            
            {pricingBreakdown.taxes > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Taxes & Fees</Text>
                <Text style={styles.priceValue}>{formatCurrency(pricingBreakdown.taxes)}</Text>
              </View>
            )}
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>{formatCurrency(parseFloat(quote.totalPrice.toString()))}</Text>
            </View>
          </View>
        </View>

        {/* Terms and Conditions */}
        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>Important Terms & Conditions</Text>
          <Text style={styles.termsList}>
            • This quote is valid until {formatDate(quote.validUntil)}{"\n"}
            • Prices are subject to availability and may change based on travel dates{"\n"}
            • A deposit of 30% is required to confirm booking{"\n"}
            • Full payment is due 30 days before departure{"\n"}
            • Cancellation policy applies as per our terms and conditions{"\n"}
            • Travel insurance is highly recommended{"\n"}
            • Passport must be valid for at least 6 months from travel date
          </Text>
        </View>

        {/* Contact Information */}
        <View style={styles.contactInfo}>
          <View style={styles.contactItem}>
            <Text style={styles.contactLabel}>Your Travel Agent</Text>
            <Text style={styles.contactValue}>{quote.agent.firstName} {quote.agent.lastName}</Text>
            <Text style={styles.contactValue}>{quote.agent.email}</Text>
          </View>
          <View style={styles.contactItem}>
            <Text style={styles.contactLabel}>WhatsApp Support</Text>
            <Text style={styles.contactValue}>+62 812 3456 7890</Text>
          </View>
          <View style={styles.contactItem}>
            <Text style={styles.contactLabel}>Emergency Contact</Text>
            <Text style={styles.contactValue}>+62 811 2345 6789</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Bali DMC - Licensed Tour Operator | www.balidmc.com | info@balidmc.com{"\n"}
          Jl. Raya Ubud No. 123, Ubud, Bali 80571, Indonesia
        </Text>
      </Page>
    </Document>
  )
}

// Utility function to generate PDF buffer
export async function generateQuotePDF(
  quote: QuoteWithDetails,
  pricingBreakdown: QuotePDFProps['pricingBreakdown']
): Promise<Buffer> {
  const { pdf } = await import('@react-pdf/renderer')
  
  const pdfBuffer = await pdf(
    <QuotePDF quote={quote} pricingBreakdown={pricingBreakdown} />
  ).toBuffer()
  
  return pdfBuffer
}

// Function to save PDF to file system
export async function saveQuotePDF(
  quote: QuoteWithDetails,
  pricingBreakdown: QuotePDFProps['pricingBreakdown'],
  filePath: string
): Promise<void> {
  const { pdf } = await import('@react-pdf/renderer')
  const fs = await import('fs/promises')
  
  const pdfBuffer = await pdf(
    <QuotePDF quote={quote} pricingBreakdown={pricingBreakdown} />
  ).toBuffer()
  
  await fs.writeFile(filePath, pdfBuffer)
}

// Function to generate PDF and return as base64
export async function generateQuotePDFBase64(
  quote: QuoteWithDetails,
  pricingBreakdown: QuotePDFProps['pricingBreakdown']
): Promise<string> {
  const pdfBuffer = await generateQuotePDF(quote, pricingBreakdown)
  return pdfBuffer.toString('base64')
}