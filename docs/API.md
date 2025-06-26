# API Documentation

This document outlines the API endpoints available in the Bali DMC application.

## Base URL

```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## Authentication

Most endpoints require authentication using Clerk. Include the session token in the Authorization header:

```
Authorization: Bearer <session_token>
```

## Endpoints

### Contact

#### Submit Contact Form

```http
POST /api/contact
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "subject": "Inquiry about packages",
  "message": "I'm interested in your Bali packages..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Contact form submitted successfully",
  "id": "contact_123"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "email": ["Invalid email format"]
  }
}
```

### Newsletter

#### Subscribe to Newsletter

```http
POST /api/newsletter/subscribe
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "preferences": ["packages", "deals", "events"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully subscribed to newsletter"
}
```

#### Unsubscribe from Newsletter

```http
POST /api/newsletter/unsubscribe
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "token": "unsubscribe_token_here"
}
```

### Packages

#### Get All Packages

```http
GET /api/packages
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `category` (string): Filter by category
- `minPrice` (number): Minimum price filter
- `maxPrice` (number): Maximum price filter
- `duration` (number): Filter by duration in days
- `search` (string): Search query

**Response:**
```json
{
  "success": true,
  "data": {
    "packages": [
      {
        "id": "pkg_123",
        "title": "Bali Cultural Experience",
        "description": "Explore the rich culture of Bali...",
        "price": 299,
        "duration": 3,
        "category": "cultural",
        "images": ["/images/package1.jpg"],
        "features": ["Hotel", "Transport", "Guide"],
        "rating": 4.8,
        "reviewCount": 124
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

#### Get Package by ID

```http
GET /api/packages/{id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "pkg_123",
    "title": "Bali Cultural Experience",
    "description": "Detailed description...",
    "price": 299,
    "duration": 3,
    "category": "cultural",
    "images": ["/images/package1.jpg"],
    "features": ["Hotel", "Transport", "Guide"],
    "itinerary": [
      {
        "day": 1,
        "title": "Arrival in Bali",
        "activities": ["Airport pickup", "Hotel check-in"]
      }
    ],
    "inclusions": ["Accommodation", "Meals", "Transport"],
    "exclusions": ["Flights", "Personal expenses"],
    "rating": 4.8,
    "reviewCount": 124,
    "reviews": [
      {
        "id": "rev_123",
        "user": "John D.",
        "rating": 5,
        "comment": "Amazing experience!",
        "date": "2024-01-15"
      }
    ]
  }
}
```

### Quotes

#### Submit Quote Request

```http
POST /api/quotes
```

**Request Body:**
```json
{
  "personalInfo": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "country": "USA"
  },
  "travelDetails": {
    "destination": "Ubud, Bali",
    "startDate": "2024-06-01",
    "endDate": "2024-06-07",
    "flexible": false
  },
  "groupInfo": {
    "adults": 2,
    "children": 1,
    "infants": 0
  },
  "budget": {
    "min": 1000,
    "max": 2000,
    "currency": "USD"
  },
  "preferences": {
    "accommodationType": ["hotel", "resort"],
    "activities": ["cultural-tours", "nature-walks"],
    "transportation": ["car", "flight"],
    "mealPreferences": ["vegetarian"],
    "accessibility": false,
    "sustainableTravel": true
  },
  "specialRequests": "We prefer eco-friendly accommodations"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Quote request submitted successfully",
  "data": {
    "id": "quote_123",
    "referenceNumber": "QR-2024-001",
    "status": "pending",
    "estimatedResponse": "24-48 hours"
  }
}
```

#### Get Quote Status

```http
GET /api/quotes/{id}
```

**Headers:**
```
Authorization: Bearer <session_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "quote_123",
    "referenceNumber": "QR-2024-001",
    "status": "completed",
    "submittedAt": "2024-01-15T10:00:00Z",
    "respondedAt": "2024-01-16T14:30:00Z",
    "quote": {
      "totalPrice": 1500,
      "currency": "USD",
      "validUntil": "2024-02-15",
      "packages": [
        {
          "name": "Custom Ubud Experience",
          "price": 1500,
          "duration": 6,
          "description": "Customized package based on your preferences"
        }
      ]
    }
  }
}
```

### Bookings

#### Create Booking

```http
POST /api/bookings
```

**Headers:**
```
Authorization: Bearer <session_token>
```

**Request Body:**
```json
{
  "packageId": "pkg_123",
  "quoteId": "quote_123",
  "travelers": [
    {
      "type": "adult",
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1990-01-01",
      "passport": "US123456789",
      "nationality": "US"
    }
  ],
  "travelDates": {
    "startDate": "2024-06-01",
    "endDate": "2024-06-07"
  },
  "contactInfo": {
    "email": "john@example.com",
    "phone": "+1234567890",
    "emergencyContact": {
      "name": "Jane Doe",
      "phone": "+1234567891",
      "relationship": "spouse"
    }
  },
  "specialRequests": "Vegetarian meals",
  "paymentMethod": "stripe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "booking_123",
    "bookingNumber": "BK-2024-001",
    "status": "pending_payment",
    "totalAmount": 1500,
    "currency": "USD",
    "paymentIntent": "pi_stripe_payment_intent_id",
    "clientSecret": "pi_stripe_client_secret"
  }
}
```

#### Get User Bookings

```http
GET /api/bookings
```

**Headers:**
```
Authorization: Bearer <session_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "booking_123",
      "bookingNumber": "BK-2024-001",
      "packageTitle": "Bali Cultural Experience",
      "status": "confirmed",
      "totalAmount": 1500,
      "currency": "USD",
      "travelDates": {
        "startDate": "2024-06-01",
        "endDate": "2024-06-07"
      },
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### Reviews

#### Submit Review

```http
POST /api/reviews
```

**Headers:**
```
Authorization: Bearer <session_token>
```

**Request Body:**
```json
{
  "packageId": "pkg_123",
  "bookingId": "booking_123",
  "rating": 5,
  "title": "Amazing experience!",
  "comment": "The tour was absolutely fantastic. Our guide was knowledgeable and friendly.",
  "photos": ["/uploads/review1.jpg", "/uploads/review2.jpg"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Review submitted successfully",
  "data": {
    "id": "review_123",
    "status": "pending_moderation"
  }
}
```

### Payments

#### Create Payment Intent

```http
POST /api/payments/create-intent
```

**Headers:**
```
Authorization: Bearer <session_token>
```

**Request Body:**
```json
{
  "bookingId": "booking_123",
  "amount": 1500,
  "currency": "USD"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "clientSecret": "pi_stripe_client_secret",
    "paymentIntentId": "pi_stripe_payment_intent_id"
  }
}
```

#### Confirm Payment

```http
POST /api/payments/confirm
```

**Request Body:**
```json
{
  "paymentIntentId": "pi_stripe_payment_intent_id",
  "bookingId": "booking_123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment confirmed successfully",
  "data": {
    "bookingStatus": "confirmed",
    "paymentStatus": "succeeded"
  }
}
```

## Error Handling

All API endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Human-readable error message",
  "details": {
    "field": ["Specific validation errors"]
  },
  "code": "ERROR_CODE",
  "statusCode": 400
}
```

### Common Error Codes

- `VALIDATION_ERROR` (400): Request validation failed
- `AUTHENTICATION_ERROR` (401): Authentication required
- `AUTHORIZATION_ERROR` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `RATE_LIMIT` (429): Too many requests
- `SERVER_ERROR` (500): Internal server error

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **General endpoints**: 100 requests per minute
- **Authentication endpoints**: 10 requests per minute
- **Payment endpoints**: 20 requests per minute

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Webhooks

### Stripe Webhooks

```http
POST /api/webhooks/stripe
```

Handles Stripe payment events:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `invoice.payment_succeeded`
- `customer.subscription.updated`

### Clerk Webhooks

```http
POST /api/webhooks/clerk
```

Handles Clerk user events:
- `user.created`
- `user.updated`
- `user.deleted`
- `session.created`

## Testing

Use the following test data for development:

### Test Credit Cards (Stripe)

- **Success**: 4242424242424242
- **Decline**: 4000000000000002
- **Insufficient funds**: 4000000000009995

### Test Users

- **Email**: test@example.com
- **Password**: TestPassword123!

## Postman Collection

A Postman collection with all endpoints is available at:
`/docs/postman/Bali-DMC-API.postman_collection.json`

## SDK

TypeScript SDK is available for easier integration:

```typescript
import { BaliDMCClient } from '@balidmc/sdk'

const client = new BaliDMCClient({
  apiKey: 'your_api_key',
  baseUrl: 'https://api.balidmc.com'
})

// Get packages
const packages = await client.packages.list({
  category: 'cultural',
  limit: 10
})

// Submit quote request
const quote = await client.quotes.create({
  personalInfo: { /* ... */ },
  travelDetails: { /* ... */ }
})
```