import Stripe from 'stripe'
import { PaymentMethod, PaymentStatus } from '@prisma/client'
import { db } from './db'

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
})

export { stripe }

// Payment intent creation
export async function createPaymentIntent({
  amount,
  currency = 'usd',
  bookingId,
  customerId,
  metadata = {},
}: {
  amount: number
  currency?: string
  bookingId: string
  customerId: string
  metadata?: Record<string, string>
}) {
  try {
    // Get customer from database
    const customer = await db.user.findUnique({
      where: { id: customerId },
    })

    if (!customer) {
      throw new Error('Customer not found')
    }

    // Create or get Stripe customer
    let stripeCustomer
    if (customer.stripeCustomerId) {
      stripeCustomer = await stripe.customers.retrieve(customer.stripeCustomerId)
    } else {
      stripeCustomer = await stripe.customers.create({
        email: customer.email,
        name: `${customer.firstName} ${customer.lastName}`,
        metadata: {
          userId: customer.id,
        },
      })

      // Update user with Stripe customer ID
      await db.user.update({
        where: { id: customerId },
        data: { stripeCustomerId: stripeCustomer.id },
      })
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      customer: stripeCustomer.id,
      metadata: {
        bookingId,
        customerId,
        ...metadata,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    })

    // Create payment record in database
    await db.payment.create({
      data: {
        bookingId,
        customerId,
        amount,
        currency: currency.toUpperCase(),
        method: PaymentMethod.STRIPE,
        status: PaymentStatus.PENDING,
        transactionId: paymentIntent.id,
        gatewayResponse: paymentIntent as any,
      },
    })

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    }
  } catch (error) {
    console.error('Error creating payment intent:', error)
    throw error
  }
}

// Confirm payment
export async function confirmPayment(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    
    if (paymentIntent.status === 'succeeded') {
      // Update payment record
      await db.payment.updateMany({
        where: { transactionId: paymentIntentId },
        data: {
          status: PaymentStatus.COMPLETED,
          gatewayResponse: paymentIntent as any,
        },
      })

      // Update booking payment status
      const payment = await db.payment.findFirst({
        where: { transactionId: paymentIntentId },
        include: { booking: true },
      })

      if (payment?.booking) {
        const totalPaid = await db.payment.aggregate({
          where: {
            bookingId: payment.bookingId,
            status: PaymentStatus.COMPLETED,
          },
          _sum: { amount: true },
        })

        await db.booking.update({
          where: { id: payment.bookingId },
          data: {
            paidAmount: totalPaid._sum.amount || 0,
          },
        })
      }

      return { success: true, payment }
    }

    return { success: false, status: paymentIntent.status }
  } catch (error) {
    console.error('Error confirming payment:', error)
    throw error
  }
}

// Create refund
export async function createRefund({
  paymentIntentId,
  amount,
  reason,
}: {
  paymentIntentId: string
  amount?: number
  reason?: string
}) {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined,
      reason: reason as Stripe.RefundCreateParams.Reason,
    })

    // Update payment record
    await db.payment.updateMany({
      where: { transactionId: paymentIntentId },
      data: {
        status: amount ? PaymentStatus.PARTIALLY_REFUNDED : PaymentStatus.REFUNDED,
        gatewayResponse: refund as any,
      },
    })

    return refund
  } catch (error) {
    console.error('Error creating refund:', error)
    throw error
  }
}

// Handle webhook events
export async function handleWebhookEvent(event: Stripe.Event) {
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
        break

      case 'charge.dispute.created':
        await handleChargeDispute(event.data.object as Stripe.Dispute)
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (error) {
    console.error('Error handling webhook event:', error)
    throw error
  }
}

// Handle successful payment
async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const payment = await db.payment.findFirst({
    where: { transactionId: paymentIntent.id },
    include: {
      booking: {
        include: {
          customer: true,
          package: true,
        },
      },
    },
  })

  if (!payment) {
    console.error('Payment record not found for payment intent:', paymentIntent.id)
    return
  }

  // Update payment status
  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.COMPLETED,
      gatewayResponse: paymentIntent as any,
    },
  })

  // Update booking paid amount
  const totalPaid = await db.payment.aggregate({
    where: {
      bookingId: payment.bookingId,
      status: PaymentStatus.COMPLETED,
    },
    _sum: { amount: true },
  })

  await db.booking.update({
    where: { id: payment.bookingId },
    data: {
      paidAmount: totalPaid._sum.amount || 0,
    },
  })

  // Send confirmation email
  if (payment.booking?.customer) {
    const { sendEmail, emailTemplates } = await import('./email')
    
    await sendEmail({
      to: payment.booking.customer.email,
      ...emailTemplates.paymentConfirmation(
        `${payment.booking.customer.firstName} ${payment.booking.customer.lastName}`,
        payment.amount,
        payment.booking.bookingRef
      ),
    })
  }

  // Create activity log
  await db.activity.create({
    data: {
      type: 'PAYMENT_COMPLETED',
      description: `Payment of $${payment.amount} completed for booking ${payment.booking?.bookingRef}`,
      metadata: {
        paymentId: payment.id,
        bookingId: payment.bookingId,
        amount: payment.amount,
      },
      userId: payment.customerId,
    },
  })
}

// Handle failed payment
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const payment = await db.payment.findFirst({
    where: { transactionId: paymentIntent.id },
    include: {
      booking: {
        include: { customer: true },
      },
    },
  })

  if (!payment) {
    console.error('Payment record not found for payment intent:', paymentIntent.id)
    return
  }

  // Update payment status
  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.FAILED,
      gatewayResponse: paymentIntent as any,
    },
  })

  // Create activity log
  await db.activity.create({
    data: {
      type: 'PAYMENT_FAILED',
      description: `Payment of $${payment.amount} failed for booking ${payment.booking?.bookingRef}`,
      metadata: {
        paymentId: payment.id,
        bookingId: payment.bookingId,
        amount: payment.amount,
        error: paymentIntent.last_payment_error?.message,
      },
      userId: payment.customerId,
    },
  })
}

// Handle charge dispute
async function handleChargeDispute(dispute: Stripe.Dispute) {
  // Find the payment associated with this charge
  const payment = await db.payment.findFirst({
    where: {
      gatewayResponse: {
        path: ['latest_charge'],
        equals: dispute.charge,
      },
    },
    include: {
      booking: true,
    },
  })

  if (payment) {
    // Create activity log for dispute
    await db.activity.create({
      data: {
        type: 'PAYMENT_DISPUTED',
        description: `Payment dispute created for booking ${payment.booking?.bookingRef}`,
        metadata: {
          paymentId: payment.id,
          disputeId: dispute.id,
          amount: dispute.amount / 100,
          reason: dispute.reason,
        },
        userId: payment.customerId,
      },
    })
  }
}

// Handle subscription changes
async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  // This would be used for subscription-based features
  // For now, just log the event
  console.log('Subscription event:', subscription.id, subscription.status)
}

// Get payment methods for customer
export async function getCustomerPaymentMethods(customerId: string) {
  try {
    const customer = await db.user.findUnique({
      where: { id: customerId },
    })

    if (!customer?.stripeCustomerId) {
      return []
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer.stripeCustomerId,
      type: 'card',
    })

    return paymentMethods.data
  } catch (error) {
    console.error('Error getting payment methods:', error)
    return []
  }
}

// Create setup intent for saving payment method
export async function createSetupIntent(customerId: string) {
  try {
    const customer = await db.user.findUnique({
      where: { id: customerId },
    })

    if (!customer) {
      throw new Error('Customer not found')
    }

    // Create or get Stripe customer
    let stripeCustomer
    if (customer.stripeCustomerId) {
      stripeCustomer = await stripe.customers.retrieve(customer.stripeCustomerId)
    } else {
      stripeCustomer = await stripe.customers.create({
        email: customer.email,
        name: `${customer.firstName} ${customer.lastName}`,
        metadata: {
          userId: customer.id,
        },
      })

      await db.user.update({
        where: { id: customerId },
        data: { stripeCustomerId: stripeCustomer.id },
      })
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomer.id,
      payment_method_types: ['card'],
    })

    return {
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
    }
  } catch (error) {
    console.error('Error creating setup intent:', error)
    throw error
  }
}

// Delete payment method
export async function deletePaymentMethod(paymentMethodId: string) {
  try {
    await stripe.paymentMethods.detach(paymentMethodId)
    return { success: true }
  } catch (error) {
    console.error('Error deleting payment method:', error)
    throw error
  }
}

// Get payment analytics
export async function getPaymentAnalytics(startDate: Date, endDate: Date) {
  try {
    const payments = await db.payment.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: PaymentStatus.COMPLETED,
      },
      include: {
        booking: {
          include: {
            package: true,
          },
        },
      },
    })

    const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0)
    const totalTransactions = payments.length
    const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

    const revenueByPackage = payments.reduce((acc, payment) => {
      const packageTitle = payment.booking?.package?.title || 'Unknown'
      acc[packageTitle] = (acc[packageTitle] || 0) + payment.amount
      return acc
    }, {} as Record<string, number>)

    const revenueByMonth = payments.reduce((acc, payment) => {
      const month = payment.createdAt.toISOString().slice(0, 7) // YYYY-MM
      acc[month] = (acc[month] || 0) + payment.amount
      return acc
    }, {} as Record<string, number>)

    return {
      totalRevenue,
      totalTransactions,
      averageTransactionValue,
      revenueByPackage,
      revenueByMonth,
    }
  } catch (error) {
    console.error('Error getting payment analytics:', error)
    throw error
  }
}

// Verify webhook signature
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
) {
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    throw error
  }
}

export default {
  stripe,
  createPaymentIntent,
  confirmPayment,
  createRefund,
  handleWebhookEvent,
  getCustomerPaymentMethods,
  createSetupIntent,
  deletePaymentMethod,
  getPaymentAnalytics,
  verifyWebhookSignature,
}