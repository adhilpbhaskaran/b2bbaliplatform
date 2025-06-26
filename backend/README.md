# Bali Malayali DMC Backend API

A production-ready FastAPI backend for the Bali Malayali DMC platform, providing comprehensive APIs for travel agent management, quote generation, booking processing, and analytics.

## Features

- **Authentication & Authorization**: Clerk integration with role-based access control
- **Agent Management**: Registration, approval, tier system, and performance tracking
- **Quote System**: Smart quote generation with pricing calculations and tier discounts
- **Booking Management**: Complete booking lifecycle from creation to completion
- **Package Management**: Travel package CRUD operations with categorization
- **Seasonal Pricing**: Dynamic pricing based on travel dates with configurable multipliers
- **Payment Processing**: Stripe integration for secure online payments and refunds
- **Analytics & Reporting**: Comprehensive performance metrics and trend analysis
- **Admin Panel**: Full administrative control over users, content, and system settings
- **Database**: PostgreSQL with SQLAlchemy ORM and Alembic migrations
- **API Documentation**: Auto-generated OpenAPI/Swagger documentation

## Tech Stack

- **Framework**: FastAPI 0.104.1
- **Database**: PostgreSQL with SQLAlchemy 2.0
- **Authentication**: Clerk JWT tokens
- **Payment Processing**: Stripe API integration
- **Migrations**: Alembic
- **Validation**: Pydantic v2
- **ASGI Server**: Uvicorn
- **Environment**: Python 3.8+

## Project Structure

```
backend/
├── alembic/                 # Database migrations
│   ├── versions/           # Migration files
│   ├── env.py             # Alembic environment
│   └── script.py.mako     # Migration template
├── middleware/             # Custom middleware
│   └── clerk_auth.py      # Clerk authentication
├── routers/               # API route handlers
│   ├── auth.py           # Authentication endpoints
│   ├── agents.py         # Agent management
│   ├── quotes.py         # Quote operations
│   ├── bookings.py       # Booking management
│   ├── packages.py       # Package CRUD
│   ├── seasonal_rates.py # Seasonal pricing management
│   ├── payments.py       # Payment processing
│   ├── analytics.py      # Analytics & reporting
│   └── admin.py          # Admin operations
├── main.py               # FastAPI application
├── config.py             # Configuration settings
├── database.py           # Database connection
├── models.py             # SQLAlchemy models
├── schemas.py            # Pydantic schemas
├── requirements.txt      # Python dependencies
├── alembic.ini          # Alembic configuration
├── .env.example         # Environment variables template
└── README.md            # This file
```

## Quick Start

### Prerequisites

- Python 3.8 or higher
- PostgreSQL 12 or higher
- Clerk account for authentication

### Installation

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/balidmc_db
   CLERK_SECRET_KEY=your_clerk_secret_key
   CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   SECRET_KEY=your_super_secret_key
   ```

5. **Set up database**
   ```bash
   # Create database
   createdb balidmc_db
   
   # Run migrations
   alembic upgrade head
   ```

6. **Start the server**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8001
   ```

The API will be available at `http://localhost:8001`

## API Documentation

Once the server is running, you can access:

- **Interactive API Docs (Swagger)**: http://localhost:8001/docs
- **Alternative API Docs (ReDoc)**: http://localhost:8001/redoc
- **OpenAPI JSON**: http://localhost:8001/openapi.json

## API Endpoints

### Authentication
- `POST /api/v1/auth/verify` - Verify Clerk token
- `GET /api/v1/auth/me` - Get current user
- `GET /api/v1/auth/profile` - Get user profile with role data

### Agents
- `POST /api/v1/agents/register` - Register new agent
- `GET /api/v1/agents/profile` - Get agent profile
- `PUT /api/v1/agents/profile` - Update agent profile
- `GET /api/v1/agents/analytics` - Get agent analytics

### Quotes
- `POST /api/v1/quotes/` - Create quote
- `GET /api/v1/quotes/` - List quotes
- `GET /api/v1/quotes/{quote_id}` - Get quote details
- `PUT /api/v1/quotes/{quote_id}` - Update quote
- `POST /api/v1/quotes/calculate` - Calculate pricing
- `POST /api/v1/quotes/{quote_id}/send` - Send quote to client

### Bookings
- `POST /api/v1/bookings/` - Create booking from quote
- `GET /api/v1/bookings/` - List bookings
- `GET /api/v1/bookings/{booking_id}` - Get booking details
- `PUT /api/v1/bookings/{booking_id}` - Update booking
- `POST /api/v1/bookings/{booking_id}/confirm` - Confirm booking

### Packages
- `GET /api/v1/packages/` - List packages
- `GET /api/v1/packages/{package_id}` - Get package details
- `GET /api/v1/packages/categories` - Get package categories
- `GET /api/v1/packages/popular/top` - Get popular packages

### Analytics
- `GET /api/v1/analytics/dashboard` - Dashboard analytics
- `GET /api/v1/analytics/trends` - Trend data
- `GET /api/v1/analytics/overview` - Platform overview (admin)

### Seasonal Rates
- `POST /api/v1/seasonal-rates/` - Create seasonal rate
- `GET /api/v1/seasonal-rates/` - List seasonal rates
- `GET /api/v1/seasonal-rates/{rate_id}` - Get seasonal rate details
- `PUT /api/v1/seasonal-rates/{rate_id}` - Update seasonal rate
- `DELETE /api/v1/seasonal-rates/{rate_id}` - Soft delete seasonal rate
- `POST /api/v1/seasonal-rates/calculate-price` - Calculate package price with seasonal rates

### Payments
- `POST /api/v1/payments/` - Create payment record
- `POST /api/v1/payments/create-intent` - Create Stripe payment intent
- `POST /api/v1/payments/webhook` - Handle Stripe webhooks
- `GET /api/v1/payments/booking/{booking_id}` - Get payments for booking
- `GET /api/v1/payments/{payment_id}` - Get payment details
- `PUT /api/v1/payments/{payment_id}` - Update payment status
- `POST /api/v1/payments/{payment_id}/refund` - Process refund

### Admin
- `GET /api/v1/admin/users` - List users
- `POST /api/v1/admin/agents/{agent_id}/approve` - Approve agent
- `GET /api/v1/admin/stats` - System statistics
- `POST /api/v1/admin/hotels` - Create hotel
- `GET /api/v1/admin/tier-config` - Get tier configuration

## Database Schema

### Core Models

- **User**: Base user information with Clerk integration
- **Agent**: Travel agent profiles with tier system
- **Admin**: Administrator profiles with permissions
- **Package**: Travel packages with pricing and details
- **Quote**: Quote requests with calculations
- **Booking**: Confirmed bookings with payment tracking
- **SeasonalRate**: Dynamic pricing based on travel dates and seasons
- **Payment**: Payment records with Stripe integration
- **Hotel**: Hotel information and room types
- **AddOn**: Additional services and activities
- **TierConfig**: Tier system configuration

### Key Relationships

- User → Agent/Admin (one-to-one)
- Agent → Quotes (one-to-many)
- Agent → Bookings (one-to-many)
- Quote → Booking (one-to-one)
- Package → Quotes (one-to-many)
- Package → SeasonalRates (one-to-many)
- Booking → Payments (one-to-many)

## Authentication

The API uses Clerk for authentication with JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <clerk_jwt_token>
```

### Role-Based Access Control

- **Agent**: Can manage own quotes, bookings, and profile
- **Admin**: Full access to all resources and admin functions

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `CLERK_SECRET_KEY` | Clerk secret key for JWT verification | Yes |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key | Yes |
| `SECRET_KEY` | Application secret key | Yes |
| `ENVIRONMENT` | Environment (development/production) | No |
| `DEBUG` | Enable debug mode | No |
| `API_HOST` | API host (default: 0.0.0.0) | No |
| `API_PORT` | API port (default: 8001) | No |
| `STRIPE_SECRET_KEY` | Stripe secret key for payments | No |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | No |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook endpoint secret | No |
| `STRIPE_SUCCESS_URL` | Payment success redirect URL | No |
| `STRIPE_CANCEL_URL` | Payment cancel redirect URL | No |
| `ENABLE_SEASONAL_PRICING` | Enable seasonal pricing feature | No |
| `ENABLE_PAYMENT_PROCESSING` | Enable payment processing | No |

## Database Migrations

### Create a new migration
```bash
alembic revision --autogenerate -m "Description of changes"
```

### Apply migrations
```bash
alembic upgrade head
```

### Rollback migration
```bash
alembic downgrade -1
```

## Development

### Running in development mode
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

### Running tests
```bash
pytest
```

### Code formatting
```bash
black .
ruff --fix .
```

## New Features

### Seasonal Pricing

Dynamic pricing system that adjusts package costs based on travel dates and seasonal demand.

**Features:**
- Configurable seasonal rates with multipliers
- Support for Peak, High, and Low seasons
- Date range-based pricing rules
- Automatic price calculation integration
- Soft delete functionality for rate management

**Usage Example:**
```python
# Calculate package price with seasonal rates
response = requests.post(
    "http://localhost:8001/api/v1/seasonal-rates/calculate-price",
    json={
        "package_id": 1,
        "travel_date": "2024-12-25",
        "base_price": 1000.00
    }
)
```

### Payment Processing

Secure payment processing with Stripe integration for handling bookings and refunds.

**Features:**
- Stripe payment intent creation
- Webhook handling for payment status updates
- Automatic payment record management
- Refund processing capabilities
- Payment status tracking

**Setup:**
1. Create a Stripe account and get API keys
2. Configure webhook endpoint in Stripe dashboard
3. Set environment variables for Stripe integration
4. Enable payment processing feature flag

**Usage Example:**
```python
# Create payment intent
response = requests.post(
    "http://localhost:8001/api/v1/payments/create-intent",
    json={
        "booking_id": 1,
        "amount": 1500.00,
        "currency": "usd"
    }
)
```

### Migration and Setup

To enable the new features:

1. **Run the migration:**
   ```bash
   # Apply the seasonal pricing and payments migration
   python migrations/001_add_seasonal_pricing_and_payments.sql
   ```

2. **Update environment variables:**
   ```bash
   # Copy the updated example file
   cp .env.example .env
   
   # Add Stripe configuration
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   
   # Enable features
   ENABLE_SEASONAL_PRICING=true
   ENABLE_PAYMENT_PROCESSING=true
   ```

3. **Install new dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run tests:**
   ```bash
   pytest tests/test_seasonal_pricing.py
   pytest tests/test_payments.py
   ```

## Production Deployment

### Using Gunicorn
```bash
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8001
```

### Docker Deployment
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001

CMD ["gunicorn", "main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8001"]
```

### Environment Setup

1. Set `ENVIRONMENT=production`
2. Use strong `SECRET_KEY`
3. Configure proper database credentials
4. Set up SSL/TLS certificates
5. Configure reverse proxy (nginx)
6. Set up monitoring and logging

## API Rate Limiting

Consider implementing rate limiting for production:

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

## Monitoring

### Health Check
```bash
curl http://localhost:8001/health
```

### Metrics
The API includes basic metrics endpoints for monitoring:
- `/metrics` - Prometheus metrics (if enabled)
- `/health` - Health check endpoint

## Security Considerations

1. **Environment Variables**: Never commit sensitive data
2. **CORS**: Configure appropriate origins for production
3. **Rate Limiting**: Implement rate limiting for API endpoints
4. **Input Validation**: All inputs are validated using Pydantic
5. **SQL Injection**: Protected by SQLAlchemy ORM
6. **Authentication**: Secure JWT token validation with Clerk

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run tests and ensure they pass
6. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the API documentation at `/docs`