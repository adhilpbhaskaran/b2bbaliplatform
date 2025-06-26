import Stripe from 'stripe';
import { headers } from 'next/headers';
import { NextRequest } from 'next/server';
import { CryptoUtils, DataMasking } from './crypto';
import { logSecurityEvent } from './db-security';

// Initialize Stripe with security configurations
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
  telemetry: false, // Disable telemetry for security
  maxNetworkRetries: 3,
  timeout: 10000, // 10 second timeout
});

// Webhook endpoint secret
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

// Payment security utilities
export class PaymentSecurity {
  // Verify Stripe webhook signatures
  static async verifyWebhookSignature(
    request: NextRequest,
    body: string
  ): Promise<Stripe.Event> {
    try {
      const signature = request.headers.get('stripe-signature');
      
      if (!signature) {
        throw new Error('Missing Stripe signature');
      }
      
      if (!WEBHOOK_SECRET) {
        throw new Error('Webhook secret not configured');
      }
      
      // Verify the webhook signature
      const event = stripe.webhooks.constructEvent(
        body,
        signature,
        WEBHOOK_SECRET
      );
      
      // Log successful webhook verification
      await logSecurityEvent(null, 'data_access', {
        resource: 'stripe_webhook',
        action: 'verify_signature',
        severity: 'low',
        metadata: {
          eventType: event.type,
          eventId: event.id
        }
      });
      
      return event;
    } catch (error) {
      // Log failed webhook verification
      await logSecurityEvent(null, 'suspicious_activity', {
        resource: 'stripe_webhook',
        action: 'verify_signature_failed',
        severity: 'high',
        metadata: {
          error: error.message,
          hasSignature: !!request.headers.get('stripe-signature')
        }
      });
      
      throw new Error('Webhook signature verification failed');
    }
  }
  
  // Create secure payment intent
  static async createPaymentIntent(
    amount: number,
    currency: string = 'usd',
    metadata: Record<string, string> = {},
    userId?: string
  ): Promise<Stripe.PaymentIntent> {
    try {
      // Validate amount (minimum $0.50 USD)
      if (amount < 50) {
        throw new Error('Amount too small');
      }
      
      // Validate currency
      const allowedCurrencies = ['usd', 'eur', 'gbp', 'idr'];
      if (!allowedCurrencies.includes(currency.toLowerCase())) {
        throw new Error('Currency not supported');
      }
      
      // Sanitize metadata
      const sanitizedMetadata = this.sanitizePaymentMetadata(metadata);
      
      // Create payment intent with security configurations
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: currency.toLowerCase(),
        metadata: sanitizedMetadata,
        automatic_payment_methods: {
          enabled: true,
        },
        capture_method: 'automatic',
        confirmation_method: 'automatic',
        setup_future_usage: undefined, // Don't store payment methods by default
      });
      
      // Log payment intent creation
      await logSecurityEvent(userId || null, 'data_modification', {
        resource: 'payment_intent',
        action: 'create',
        severity: 'medium',
        metadata: {
          paymentIntentId: paymentIntent.id,
          amount,
          currency
        }
      });
      
      return paymentIntent;
    } catch (error) {
      // Log failed payment intent creation
      await logSecurityEvent(userId || null, 'suspicious_activity', {
        resource: 'payment_intent',
        action: 'create_failed',
        severity: 'high',
        metadata: {
          error: error.message,
          amount,
          currency
        }
      });
      
      throw error;
    }
  }
  
  // Confirm payment intent securely
  static async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId?: string,
    userId?: string
  ): Promise<Stripe.PaymentIntent> {
    try {
      // Validate payment intent ID format
      if (!paymentIntentId.startsWith('pi_')) {
        throw new Error('Invalid payment intent ID');
      }
      
      const confirmParams: Stripe.PaymentIntentConfirmParams = {};
      
      if (paymentMethodId) {
        // Validate payment method ID format
        if (!paymentMethodId.startsWith('pm_')) {
          throw new Error('Invalid payment method ID');
        }
        confirmParams.payment_method = paymentMethodId;
      }
      
      const paymentIntent = await stripe.paymentIntents.confirm(
        paymentIntentId,
        confirmParams
      );
      
      // Log payment confirmation
      await logSecurityEvent(userId || null, 'data_modification', {
        resource: 'payment_intent',
        action: 'confirm',
        severity: 'medium',
        metadata: {
          paymentIntentId,
          status: paymentIntent.status
        }
      });
      
      return paymentIntent;
    } catch (error) {
      // Log failed payment confirmation
      await logSecurityEvent(userId || null, 'suspicious_activity', {
        resource: 'payment_intent',
        action: 'confirm_failed',
        severity: 'high',
        metadata: {
          paymentIntentId,
          error: error.message
        }
      });
      
      throw error;
    }
  }
  
  // Process secure refund
  static async processRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: Stripe.RefundCreateParams.Reason,
    userId?: string
  ): Promise<Stripe.Refund> {
    try {
      // Validate payment intent ID
      if (!paymentIntentId.startsWith('pi_')) {
        throw new Error('Invalid payment intent ID');
      }
      
      // Validate refund reason
      const allowedReasons: Stripe.RefundCreateParams.Reason[] = [
        'duplicate',
        'fraudulent',
        'requested_by_customer'
      ];
      
      if (reason && !allowedReasons.includes(reason)) {
        throw new Error('Invalid refund reason');
      }
      
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
        reason: reason || 'requested_by_customer'
      };
      
      if (amount) {
        refundParams.amount = amount;
      }
      
      const refund = await stripe.refunds.create(refundParams);
      
      // Log refund processing
      await logSecurityEvent(userId || null, 'data_modification', {
        resource: 'refund',
        action: 'create',
        severity: 'medium',
        metadata: {
          refundId: refund.id,
          paymentIntentId,
          amount: refund.amount,
          reason
        }
      });
      
      return refund;
    } catch (error) {
      // Log failed refund
      await logSecurityEvent(userId || null, 'suspicious_activity', {
        resource: 'refund',
        action: 'create_failed',
        severity: 'high',
        metadata: {
          paymentIntentId,
          error: error.message
        }
      });
      
      throw error;
    }
  }
  
  // Sanitize payment metadata
  static sanitizePaymentMetadata(
    metadata: Record<string, string>
  ): Record<string, string> {
    const sanitized: Record<string, string> = {};
    
    // Stripe metadata keys and values have specific requirements
    for (const [key, value] of Object.entries(metadata)) {
      // Key validation: max 40 characters, alphanumeric and underscores only
      const sanitizedKey = key
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .substring(0, 40);
      
      // Value validation: max 500 characters
      const sanitizedValue = String(value)
        .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
        .substring(0, 500);
      
      if (sanitizedKey && sanitizedValue) {
        sanitized[sanitizedKey] = sanitizedValue;
      }
    }
    
    return sanitized;
  }
  
  // Retrieve payment intent securely
  static async getPaymentIntent(
    paymentIntentId: string,
    userId?: string
  ): Promise<Stripe.PaymentIntent> {
    try {
      // Validate payment intent ID
      if (!paymentIntentId.startsWith('pi_')) {
        throw new Error('Invalid payment intent ID');
      }
      
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      // Log payment intent retrieval
      await logSecurityEvent(userId || null, 'data_access', {
        resource: 'payment_intent',
        action: 'retrieve',
        severity: 'low',
        metadata: {
          paymentIntentId,
          status: paymentIntent.status
        }
      });
      
      return paymentIntent;
    } catch (error) {
      // Log failed retrieval
      await logSecurityEvent(userId || null, 'suspicious_activity', {
        resource: 'payment_intent',
        action: 'retrieve_failed',
        severity: 'medium',
        metadata: {
          paymentIntentId,
          error: error.message
        }
      });
      
      throw error;
    }
  }
}

// PCI compliance helpers
export class PCICompliance {
  // Sanitize payment data for logging
  static sanitizePaymentData(data: any): any {
    if (!data || typeof data !== 'object') return data;
    
    const sensitiveFields = [
      'card_number', 'cardNumber', 'number',
      'cvc', 'cvv', 'security_code',
      'exp_month', 'exp_year', 'expiry',
      'account_number', 'routing_number',
      'bank_account', 'iban'
    ];
    
    const sanitized = { ...data };
    
    for (const [key, value] of Object.entries(sanitized)) {
      const lowerKey = key.toLowerCase();
      
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        sanitized[key] = '***';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizePaymentData(value);
      }
    }
    
    return sanitized;
  }
  
  // Validate card number format (without storing)
  static validateCardNumber(cardNumber: string): boolean {
    // Remove spaces and dashes
    const cleaned = cardNumber.replace(/[\s-]/g, '');
    
    // Check if it's all digits
    if (!/^\d+$/.test(cleaned)) return false;
    
    // Check length (13-19 digits for most cards)
    if (cleaned.length < 13 || cleaned.length > 19) return false;
    
    // Luhn algorithm check
    let sum = 0;
    let isEven = false;
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }
  
  // Validate expiry date
  static validateExpiryDate(month: number, year: number): boolean {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    // Validate month
    if (month < 1 || month > 12) return false;
    
    // Validate year (current year to 10 years in the future)
    if (year < currentYear || year > currentYear + 10) return false;
    
    // Check if the card is expired
    if (year === currentYear && month < currentMonth) return false;
    
    return true;
  }
  
  // Validate CVC
  static validateCVC(cvc: string, cardType?: string): boolean {
    // Remove spaces
    const cleaned = cvc.replace(/\s/g, '');
    
    // Check if it's all digits
    if (!/^\d+$/.test(cleaned)) return false;
    
    // Check length based on card type
    if (cardType === 'amex') {
      return cleaned.length === 4;
    } else {
      return cleaned.length === 3;
    }
  }
  
  // Get card type from number (for validation only)
  static getCardType(cardNumber: string): string {
    const cleaned = cardNumber.replace(/[\s-]/g, '');
    
    // Visa
    if (/^4/.test(cleaned)) return 'visa';
    
    // Mastercard
    if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) return 'mastercard';
    
    // American Express
    if (/^3[47]/.test(cleaned)) return 'amex';
    
    // Discover
    if (/^6(?:011|5)/.test(cleaned)) return 'discover';
    
    // JCB
    if (/^35/.test(cleaned)) return 'jcb';
    
    return 'unknown';
  }
}

// Fraud detection utilities
export class FraudDetection {
  // Check for suspicious payment patterns
  static async checkSuspiciousActivity(
    paymentData: {
      amount: number;
      currency: string;
      customerEmail?: string;
      ipAddress?: string;
      userAgent?: string;
    },
    userId?: string
  ): Promise<{
    riskScore: number;
    flags: string[];
    recommendation: 'approve' | 'review' | 'decline';
  }> {
    const flags: string[] = [];
    let riskScore = 0;
    
    // Check amount patterns
    if (paymentData.amount > 100000) { // $1000+
      flags.push('high_amount');
      riskScore += 30;
    }
    
    if (paymentData.amount % 100 === 0 && paymentData.amount > 10000) {
      flags.push('round_amount');
      riskScore += 10;
    }
    
    // Check for suspicious user agent
    if (paymentData.userAgent) {
      const suspiciousAgents = ['bot', 'crawler', 'spider', 'scraper'];
      if (suspiciousAgents.some(agent => 
        paymentData.userAgent!.toLowerCase().includes(agent)
      )) {
        flags.push('suspicious_user_agent');
        riskScore += 50;
      }
    }
    
    // Check for VPN/Proxy (simplified check)
    if (paymentData.ipAddress) {
      // This is a simplified check - in production, use a proper IP intelligence service
      const suspiciousIPs = ['10.', '192.168.', '172.'];
      if (suspiciousIPs.some(ip => paymentData.ipAddress!.startsWith(ip))) {
        flags.push('private_ip');
        riskScore += 20;
      }
    }
    
    // Determine recommendation
    let recommendation: 'approve' | 'review' | 'decline';
    if (riskScore >= 70) {
      recommendation = 'decline';
    } else if (riskScore >= 30) {
      recommendation = 'review';
    } else {
      recommendation = 'approve';
    }
    
    // Log fraud check
    await logSecurityEvent(userId || null, 'data_access', {
      resource: 'fraud_detection',
      action: 'check_payment',
      severity: riskScore >= 50 ? 'high' : 'medium',
      metadata: {
        riskScore,
        flags,
        recommendation,
        amount: paymentData.amount
      }
    });
    
    return {
      riskScore,
      flags,
      recommendation
    };
  }
  
  // Check velocity limits
  static async checkVelocityLimits(
    userId: string,
    amount: number
  ): Promise<{
    withinLimits: boolean;
    dailyTotal: number;
    weeklyTotal: number;
    monthlyTotal: number;
  }> {
    // This would typically query your database for recent transactions
    // For now, we'll return a mock implementation
    
    const dailyLimit = 500000; // $5000
    const weeklyLimit = 2000000; // $20000
    const monthlyLimit = 10000000; // $100000
    
    // In a real implementation, you would:
    // 1. Query recent transactions for this user
    // 2. Calculate totals for different time periods
    // 3. Check against limits
    
    const dailyTotal = 0; // Calculate from DB
    const weeklyTotal = 0; // Calculate from DB
    const monthlyTotal = 0; // Calculate from DB
    
    const withinLimits = 
      (dailyTotal + amount) <= dailyLimit &&
      (weeklyTotal + amount) <= weeklyLimit &&
      (monthlyTotal + amount) <= monthlyLimit;
    
    return {
      withinLimits,
      dailyTotal,
      weeklyTotal,
      monthlyTotal
    };
  }
}

// Export utilities
export const paymentSecurity = {
  PaymentSecurity,
  PCICompliance,
  FraudDetection,
  stripe
};

// Default exports for common operations
export const {
  verifyWebhookSignature,
  createPaymentIntent,
  confirmPaymentIntent,
  processRefund,
  getPaymentIntent
} = PaymentSecurity;

export const {
  sanitizePaymentData,
  validateCardNumber,
  validateExpiryDate,
  validateCVC
} = PCICompliance;