import nodemailer from 'nodemailer'
import { render } from '@react-email/render'
import { ReactElement } from 'react'

// Email configuration
const emailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
}

// Create transporter
const transporter = nodemailer.createTransporter(emailConfig)

// Email templates
export interface EmailTemplate {
  subject: string
  html: string
  text?: string
}

// Base email interface
export interface EmailOptions {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  template?: ReactElement
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

// Send email function
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    let html = options.html
    let text = options.text

    // Render React template if provided
    if (options.template) {
      html = render(options.template)
      text = text || render(options.template, { plainText: true })
    }

    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME || 'Bali DMC'} <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html,
      text,
      attachments: options.attachments,
    }

    const result = await transporter.sendMail(mailOptions)
    console.log('Email sent successfully:', result.messageId)
    return true
  } catch (error) {
    console.error('Failed to send email:', error)
    return false
  }
}

// Email templates
export const emailTemplates = {
  // Welcome email
  welcome: (name: string, loginUrl: string): EmailTemplate => ({
    subject: 'Welcome to Bali DMC!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Bali DMC!</h1>
        </div>
        <div style="padding: 40px 20px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${name}!</h2>
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Thank you for joining Bali DMC! We're excited to help you discover the magic of Bali with our curated travel experiences.
          </p>
          <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
            Get started by exploring our packages and creating your first quote.
          </p>
          <div style="text-align: center;">
            <a href="${loginUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Get Started</a>
          </div>
        </div>
        <div style="padding: 20px; text-align: center; color: #999; font-size: 14px;">
          <p>Best regards,<br>The Bali DMC Team</p>
        </div>
      </div>
    `,
  }),

  // Quote confirmation
  quoteConfirmation: (clientName: string, quoteId: string, packageTitle: string, totalAmount: number): EmailTemplate => ({
    subject: 'Your Bali Travel Quote is Ready!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Your Quote is Ready!</h1>
        </div>
        <div style="padding: 40px 20px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${clientName}!</h2>
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Thank you for your interest in our ${packageTitle} package. We've prepared a customized quote for you.
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Quote Details</h3>
            <p><strong>Quote ID:</strong> ${quoteId}</p>
            <p><strong>Package:</strong> ${packageTitle}</p>
            <p><strong>Total Amount:</strong> $${totalAmount.toLocaleString()}</p>
          </div>
          <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
            Please review your quote and let us know if you have any questions. We're here to help make your Bali adventure perfect!
          </p>
          <div style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/quotes/${quoteId}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">View Quote</a>
          </div>
        </div>
        <div style="padding: 20px; text-align: center; color: #999; font-size: 14px;">
          <p>Best regards,<br>The Bali DMC Team</p>
        </div>
      </div>
    `,
  }),

  // Booking confirmation
  bookingConfirmation: (clientName: string, bookingRef: string, packageTitle: string, startDate: string, endDate: string): EmailTemplate => ({
    subject: 'Booking Confirmed - Your Bali Adventure Awaits!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Booking Confirmed!</h1>
        </div>
        <div style="padding: 40px 20px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Congratulations ${clientName}!</h2>
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Your booking has been confirmed! We're thrilled to be part of your Bali adventure.
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Booking Details</h3>
            <p><strong>Booking Reference:</strong> ${bookingRef}</p>
            <p><strong>Package:</strong> ${packageTitle}</p>
            <p><strong>Travel Dates:</strong> ${startDate} - ${endDate}</p>
          </div>
          <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
            You'll receive detailed itinerary and travel information closer to your departure date. If you have any questions, don't hesitate to contact us.
          </p>
          <div style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/bookings/${bookingRef}" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">View Booking</a>
          </div>
        </div>
        <div style="padding: 20px; text-align: center; color: #999; font-size: 14px;">
          <p>Best regards,<br>The Bali DMC Team</p>
        </div>
      </div>
    `,
  }),

  // Payment confirmation
  paymentConfirmation: (clientName: string, amount: number, bookingRef: string): EmailTemplate => ({
    subject: 'Payment Received - Thank You!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Payment Received!</h1>
        </div>
        <div style="padding: 40px 20px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Thank you ${clientName}!</h2>
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            We've successfully received your payment. Your booking is now fully confirmed.
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Payment Details</h3>
            <p><strong>Amount Paid:</strong> $${amount.toLocaleString()}</p>
            <p><strong>Booking Reference:</strong> ${bookingRef}</p>
            <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
            A receipt has been generated for your records. We'll be in touch with more details about your upcoming trip.
          </p>
          <div style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/bookings/${bookingRef}" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">View Booking</a>
          </div>
        </div>
        <div style="padding: 20px; text-align: center; color: #999; font-size: 14px;">
          <p>Best regards,<br>The Bali DMC Team</p>
        </div>
      </div>
    `,
  }),

  // Contact form submission
  contactSubmission: (name: string, email: string, subject: string, message: string): EmailTemplate => ({
    subject: `New Contact Form Submission: ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #667eea; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">New Contact Form Submission</h1>
        </div>
        <div style="padding: 20px; background: #f8f9fa;">
          <h3>Contact Details:</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <h3>Message:</h3>
          <div style="background: white; padding: 15px; border-radius: 5px;">
            <p style="margin: 0; white-space: pre-wrap;">${message}</p>
          </div>
        </div>
      </div>
    `,
  }),

  // Password reset
  passwordReset: (name: string, resetUrl: string): EmailTemplate => ({
    subject: 'Reset Your Password - Bali DMC',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #667eea; padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset</h1>
        </div>
        <div style="padding: 40px 20px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${name}!</h2>
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            We received a request to reset your password. Click the button below to create a new password.
          </p>
          <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
            If you didn't request this, you can safely ignore this email.
          </p>
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${resetUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
          </div>
          <p style="color: #999; font-size: 14px;">
            This link will expire in 24 hours for security reasons.
          </p>
        </div>
        <div style="padding: 20px; text-align: center; color: #999; font-size: 14px;">
          <p>Best regards,<br>The Bali DMC Team</p>
        </div>
      </div>
    `,
  }),
}

// Bulk email function
export async function sendBulkEmail(
  recipients: string[],
  template: EmailTemplate,
  batchSize: number = 50
): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize)
    
    const promises = batch.map(async (email) => {
      try {
        await sendEmail({
          to: email,
          subject: template.subject,
          html: template.html,
          text: template.text,
        })
        sent++
      } catch (error) {
        console.error(`Failed to send email to ${email}:`, error)
        failed++
      }
    })

    await Promise.allSettled(promises)
    
    // Add delay between batches to avoid rate limiting
    if (i + batchSize < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return { sent, failed }
}

// Newsletter subscription
export async function sendNewsletterEmail(
  subscribers: string[],
  subject: string,
  content: string
): Promise<{ sent: number; failed: number }> {
  const template: EmailTemplate = {
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Bali DMC Newsletter</h1>
        </div>
        <div style="padding: 40px 20px; background: #f8f9fa;">
          ${content}
        </div>
        <div style="padding: 20px; text-align: center; color: #999; font-size: 14px;">
          <p>You're receiving this because you subscribed to our newsletter.</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe" style="color: #667eea;">Unsubscribe</a></p>
        </div>
      </div>
    `,
  }

  return await sendBulkEmail(subscribers, template)
}

// Email verification
export async function verifyEmailConfiguration(): Promise<boolean> {
  try {
    await transporter.verify()
    console.log('Email configuration verified successfully')
    return true
  } catch (error) {
    console.error('Email configuration verification failed:', error)
    return false
  }
}

// Email queue (for production use with Redis/Bull)
export interface EmailJob {
  id: string
  to: string | string[]
  template: string
  data: Record<string, any>
  priority?: number
  delay?: number
  attempts?: number
}

// Simple in-memory queue for development
const emailQueue: EmailJob[] = []

export function addEmailToQueue(job: EmailJob): void {
  emailQueue.push(job)
  processEmailQueue() // In production, this would be handled by a worker
}

export async function processEmailQueue(): Promise<void> {
  while (emailQueue.length > 0) {
    const job = emailQueue.shift()
    if (!job) continue

    try {
      // Get template function
      const templateFn = (emailTemplates as any)[job.template]
      if (!templateFn) {
        console.error(`Email template '${job.template}' not found`)
        continue
      }

      // Generate template with data
      const template = templateFn(...Object.values(job.data))
      
      // Send email
      await sendEmail({
        to: job.to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      })

      console.log(`Email job ${job.id} completed successfully`)
    } catch (error) {
      console.error(`Email job ${job.id} failed:`, error)
      
      // Retry logic could be implemented here
      if ((job.attempts || 0) < 3) {
        job.attempts = (job.attempts || 0) + 1
        emailQueue.push(job) // Re-queue for retry
      }
    }
  }
}

export default {
  sendEmail,
  sendBulkEmail,
  sendNewsletterEmail,
  emailTemplates,
  verifyEmailConfiguration,
  addEmailToQueue,
  processEmailQueue,
}