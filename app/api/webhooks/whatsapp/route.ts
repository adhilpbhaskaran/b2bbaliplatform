import { NextRequest, NextResponse } from 'next/server'
import { whatsappAutomation } from '@/lib/whatsapp/automation'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// Webhook verification for WhatsApp/ManyChat
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  )
}

// GET /api/webhooks/whatsapp - Webhook verification
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')
    
    // Verify webhook (for WhatsApp Business API)
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log('WhatsApp webhook verified')
      return new NextResponse(challenge, { status: 200 })
    }
    
    return NextResponse.json(
      { error: 'Webhook verification failed' },
      { status: 403 }
    )
  } catch (error) {
    console.error('Webhook verification error:', error)
    return NextResponse.json(
      { error: 'Webhook verification error' },
      { status: 500 }
    )
  }
}

// POST /api/webhooks/whatsapp - Handle incoming messages
export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('x-hub-signature-256') || ''
    
    // Verify webhook signature
    if (process.env.WHATSAPP_WEBHOOK_SECRET) {
      const isValid = verifyWebhookSignature(
        body,
        signature.replace('sha256=', ''),
        process.env.WHATSAPP_WEBHOOK_SECRET
      )
      
      if (!isValid) {
        console.error('Invalid webhook signature')
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 403 }
        )
      }
    }
    
    const data = JSON.parse(body)
    
    // Handle different webhook types
    if (data.object === 'whatsapp_business_account') {
      // WhatsApp Business API webhook
      await handleWhatsAppBusinessWebhook(data)
    } else if (data.type === 'message') {
      // ManyChat webhook
      await handleManyChatWebhook(data)
    } else {
      console.log('Unknown webhook type:', data)
    }
    
    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleWhatsAppBusinessWebhook(data: any) {
  try {
    const entry = data.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value
    
    if (value?.messages) {
      // Handle incoming messages
      for (const message of value.messages) {
        const whatsappMessage = {
          id: message.id,
          from: message.from,
          to: value.metadata?.phone_number_id || '',
          message: message.text?.body || message.caption || '',
          timestamp: new Date(parseInt(message.timestamp) * 1000),
          type: message.type as 'text' | 'image' | 'document' | 'location',
          metadata: {
            messageType: message.type,
            context: message.context,
            interactive: message.interactive
          }
        }
        
        await whatsappAutomation.handleIncomingMessage(whatsappMessage)
      }
    }
    
    if (value?.statuses) {
      // Handle message status updates
      for (const status of value.statuses) {
        await handleMessageStatus(status)
      }
    }
  } catch (error) {
    console.error('WhatsApp Business webhook error:', error)
  }
}

async function handleManyChatWebhook(data: any) {
  try {
    const message = {
      id: data.message_id || Date.now().toString(),
      from: data.phone || data.subscriber_id,
      to: process.env.MANYCHAT_PHONE_NUMBER || '',
      message: data.text || data.message || '',
      timestamp: new Date(data.timestamp || Date.now()),
      type: 'text' as const,
      metadata: {
        subscriberId: data.subscriber_id,
        firstName: data.first_name,
        lastName: data.last_name,
        tags: data.tags,
        customFields: data.custom_fields
      }
    }
    
    await whatsappAutomation.handleIncomingMessage(message)
  } catch (error) {
    console.error('ManyChat webhook error:', error)
  }
}

async function handleMessageStatus(status: any) {
  try {
    // Update message status in database
    await prisma.whatsAppMessage.updateMany({
      where: {
        messageId: status.id
      },
      data: {
        status: status.status, // sent, delivered, read, failed
        metadata: {
          statusTimestamp: new Date(parseInt(status.timestamp) * 1000),
          recipientId: status.recipient_id,
          errors: status.errors
        }
      }
    })
    
    // Handle specific status events
    if (status.status === 'read') {
      // Message was read by recipient
      await handleMessageRead(status)
    } else if (status.status === 'failed') {
      // Message delivery failed
      await handleMessageFailed(status)
    }
  } catch (error) {
    console.error('Message status update error:', error)
  }
}

async function handleMessageRead(status: any) {
  try {
    // Find related quote or booking
    const message = await prisma.whatsAppMessage.findFirst({
      where: { messageId: status.id }
    })
    
    if (message?.metadata?.quoteId) {
      // Update quote status if it was a quote message
      await prisma.quote.updateMany({
        where: {
          id: message.metadata.quoteId,
          status: 'SENT'
        },
        data: {
          status: 'VIEWED'
        }
      })
    }
  } catch (error) {
    console.error('Message read handler error:', error)
  }
}

async function handleMessageFailed(status: any) {
  try {
    console.error('WhatsApp message failed:', {
      messageId: status.id,
      recipientId: status.recipient_id,
      errors: status.errors
    })
    
    // TODO: Implement retry logic or alternative notification method
    // For example, send email if WhatsApp fails
  } catch (error) {
    console.error('Message failed handler error:', error)
  }
}

// Utility function to send test message (for development)
export async function sendTestMessage(phoneNumber: string, message: string) {
  try {
    const testMessage = {
      id: `test_${Date.now()}`,
      from: phoneNumber,
      to: process.env.WHATSAPP_BUSINESS_PHONE || '',
      message,
      timestamp: new Date(),
      type: 'text' as const,
      metadata: {
        isTest: true
      }
    }
    
    await whatsappAutomation.handleIncomingMessage(testMessage)
    return { success: true, message: 'Test message processed' }
  } catch (error) {
    console.error('Test message error:', error)
    return { success: false, error: 'Test message failed' }
  }
}