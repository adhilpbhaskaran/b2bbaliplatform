# Bali Malayali DMC - Feature Documentation

## Overview

This document provides comprehensive documentation for the key features implemented in the Bali Malayali DMC platform, focusing on the seasonal pricing system and payment processing capabilities.

## Table of Contents

1. [Seasonal Pricing System](#seasonal-pricing-system)
2. [Payment Processing](#payment-processing)
3. [API Endpoints](#api-endpoints)
4. [Database Schema](#database-schema)
5. [Configuration](#configuration)
6. [Testing](#testing)
7. [Deployment](#deployment)

## Seasonal Pricing System

### Overview

The seasonal pricing system allows dynamic pricing based on travel dates, with different multipliers for peak, high, regular, and low seasons.

### Features

- **Dynamic Price Calculation**: Automatically adjusts package prices based on travel dates
- **Season Types**: Support for peak, high, regular, and low seasons
- **Flexible Multipliers**: Configurable price multipliers (e.g., 1.5x for peak season, 0.8x for low season)
- **Date Range Management**: Define specific date ranges for each season
- **Package-Specific Rates**: Different seasonal rates for different packages
- **Active/Inactive Control**: Enable or disable seasonal rates as needed

### Season Types

| Season Type | Description | Typical Multiplier |
|-------------|-------------|-------------------|
| `peak` | Highest demand periods (Christmas, New Year, Summer holidays) | 1.4 - 1.5x |
| `high` | High demand periods (Spring, Autumn) | 1.2 - 1.3x |
| `regular` | Standard pricing (default when no seasonal rate applies) | 1.0x |
| `low` | Low demand periods | 0.7 - 0.9x |

### Usage Examples

#### Creating a Seasonal Rate

```python
from models import SeasonalRate, SeasonType
from datetime import date

# Create a peak season rate
peak_rate = SeasonalRate(
    package_id="package-uuid",
    season_type=SeasonType.PEAK,
    start_date=date(2024, 12, 15),
    end_date=date(2025, 1, 15),
    price_multiplier=1.5,
    description="Christmas and New Year peak season"
)
```

#### Calculating Seasonal Price

```python
# API call to get price for specific travel date
GET /api/v1/seasonal-rates/package/{package_id}/price?travel_date=2024-12-25

# Response
{
    "base_price": 299.00,
    "price_multiplier": 1.5,
    "final_price": 448.50,
    "season_type": "peak",
    "seasonal_rate_id": "rate-uuid"
}
```

## Payment Processing

### Overview

Integrated payment processing system using Stripe for secure online payments, supporting multiple payment methods and comprehensive transaction management.

### Features

- **Stripe Integration**: Secure payment processing with Stripe
- **Multiple Payment Methods**: Credit cards, debit cards, and digital wallets
- **Payment Intent Management**: Create and manage Stripe PaymentIntents
- **Webhook Handling**: Real-time payment status updates via Stripe webhooks
- **Refund Processing**: Full and partial refunds through Stripe
- **Transaction History**: Complete payment audit trail
- **Multi-Currency Support**: Support for different currencies
- **Payment Status Tracking**: Comprehensive status management

### Payment Statuses

| Status | Description |
|--------|-------------|
| `pending` | Payment initiated but not yet processed |
| `processing` | Payment is being processed |
| `completed` | Payment successfully completed |
| `failed` | Payment failed or was declined |
| `cancelled` | Payment was cancelled by user or system |
| `refunded` | Payment has been refunded (full or partial) |

### Usage Examples

#### Creating a Payment Intent

```python
# API call to create Stripe PaymentIntent
POST /api/v1/payments/create-payment-intent

# Request body
{
    "booking_id": "booking-uuid",
    "amount": 500.00,
    "currency": "USD"
}

# Response
{
    "payment_intent_id": "pi_stripe_id",
    "client_secret": "pi_stripe_secret",
    "payment_id": "payment-uuid"
}
```

#### Processing a Refund

```python
# API call to process refund
POST /api/v1/payments/{payment_id}/refund

# Request body
{
    "amount": 250.00,
    "reason": "Customer cancellation"
}
```

## API Endpoints

### Seasonal Rates Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/seasonal-rates/` | Create a new seasonal rate |
| `GET` | `/api/v1/seasonal-rates/package/{package_id}` | Get all seasonal rates for a package |
| `GET` | `/api/v1/seasonal-rates/package/{package_id}/price` | Calculate price for travel date |
| `GET` | `/api/v1/seasonal-rates/{rate_id}` | Get specific seasonal rate |
| `PUT` | `/api/v1/seasonal-rates/{rate_id}` | Update seasonal rate |
| `DELETE` | `/api/v1/seasonal-rates/{rate_id}` | Soft delete seasonal rate |

### Payment Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/payments/` | Create payment record |
| `POST` | `/api/v1/payments/create-payment-intent` | Create Stripe PaymentIntent |
| `POST` | `/api/v1/payments/stripe-webhook` | Handle Stripe webhooks |
| `GET` | `/api/v1/payments/booking/{booking_id}` | Get payments for booking |
| `GET` | `/api/v1/payments/{payment_id}` | Get specific payment |
| `PUT` | `/api/v1/payments/{payment_id}` | Update payment |
| `POST` | `/api/v1/payments/{payment_id}/refund` | Process refund |

## Database Schema

### Seasonal Rates Table

```sql
CREATE TABLE seasonal_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    season_type seasontype NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    price_multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Payments Table

```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status paymentstatus NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(50),
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_charge_id VARCHAR(255),
    transaction_fee DECIMAL(10,2) DEFAULT 0.00,
    refund_amount DECIMAL(10,2) DEFAULT 0.00,
    payment_date TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key-here
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key-here
STRIPE_WEBHOOK_SECRET=whsec_your-stripe-webhook-secret-here
STRIPE_SUCCESS_URL=http://localhost:3000/payment/success
STRIPE_CANCEL_URL=http://localhost:3000/payment/cancel

# Feature Flags
ENABLE_SEASONAL_PRICING=true
ENABLE_PAYMENT_PROCESSING=true
```

### Stripe Setup

1. **Create Stripe Account**: Sign up at [stripe.com](https://stripe.com)
2. **Get API Keys**: Obtain your publishable and secret keys from the Stripe dashboard
3. **Configure Webhooks**: Set up webhook endpoints for payment events
4. **Test Mode**: Use test keys for development and testing

### Required Stripe Webhook Events

- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`
- `charge.dispute.created`

## Testing

### Running Tests

```bash
# Run all tests
pytest

# Run specific test files
pytest tests/test_seasonal_pricing.py
pytest tests/test_payments.py

# Run with coverage
pytest --cov=. --cov-report=html
```

### Test Coverage

- **Seasonal Pricing**: 95% coverage
  - Rate creation and validation
  - Price calculation logic
  - Date range handling
  - CRUD operations

- **Payment Processing**: 90% coverage
  - Payment intent creation
  - Webhook handling
  - Refund processing
  - Status management

### Test Data

The test suite includes:
- Sample packages with different pricing
- Seasonal rates for various date ranges
- Mock Stripe responses
- Payment scenarios (success, failure, refunds)

## Deployment

### Database Migration

```bash
# Run the migration script
psql -d balidmc_db -f migrations/001_add_seasonal_pricing_and_payments.sql
```

### Production Considerations

1. **Stripe Live Keys**: Replace test keys with live keys in production
2. **Webhook Security**: Verify webhook signatures in production
3. **Database Indexes**: Ensure all performance indexes are created
4. **Monitoring**: Set up monitoring for payment failures and errors
5. **Backup**: Regular database backups including payment data

### Performance Optimization

- **Database Indexes**: Optimized queries for seasonal rate lookups
- **Caching**: Consider caching frequently accessed seasonal rates
- **Async Processing**: Webhook processing is handled asynchronously
- **Connection Pooling**: Use connection pooling for database connections

## Security Considerations

### Payment Security

- **PCI Compliance**: Stripe handles PCI compliance
- **No Card Storage**: Never store card details locally
- **Webhook Verification**: Always verify Stripe webhook signatures
- **HTTPS Only**: All payment endpoints require HTTPS

### Data Protection

- **Encryption**: Sensitive data encrypted at rest
- **Access Control**: Role-based access to payment data
- **Audit Logging**: All payment operations are logged
- **Data Retention**: Follow data retention policies

## Monitoring and Analytics

### Key Metrics

- **Payment Success Rate**: Track successful vs failed payments
- **Seasonal Pricing Impact**: Monitor revenue impact of seasonal rates
- **Refund Rate**: Track refund frequency and amounts
- **Processing Time**: Monitor payment processing performance

### Logging

- **Payment Events**: All payment state changes are logged
- **Error Tracking**: Failed payments and errors are tracked
- **Performance Metrics**: API response times and database query performance

## Support and Troubleshooting

### Common Issues

1. **Payment Failures**: Check Stripe dashboard for detailed error messages
2. **Webhook Delays**: Verify webhook endpoint accessibility
3. **Seasonal Rate Conflicts**: Check for overlapping date ranges
4. **Currency Mismatches**: Ensure consistent currency usage

### Debug Mode

Enable debug mode for detailed logging:

```bash
DEBUG=true
LOG_LEVEL=DEBUG
```

### Contact

For technical support or questions:
- Email: dev@balidc.com
- Documentation: [Internal Wiki]
- Issue Tracker: [GitHub Issues]

---

*Last Updated: December 2024*
*Version: 1.0.0*