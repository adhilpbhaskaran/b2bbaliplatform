# Bali DMC - Destination Management Company Platform

A comprehensive platform for managing travel packages, quotes, bookings, and customer relationships for a Destination Management Company in Bali.

## 🌟 Features

### Core Functionality
- **Package Management**: Create and manage travel packages with seasonal pricing
- **Quote System**: Generate detailed quotes with AI assistance and PDF export
- **Booking Management**: Handle reservations with payment tracking
- **Customer Portal**: Self-service dashboard for customers
- **Agent Dashboard**: Tools for travel agents to manage clients
- **Admin Panel**: Comprehensive administration interface

### Advanced Features
- **AI Quote Assistant**: Intelligent quote suggestions and optimization
- **WhatsApp Integration**: Automated notifications and communication
- **Payment Processing**: Stripe integration with multiple payment methods
- **PDF Generation**: Professional quote and invoice documents
- **Analytics Dashboard**: Comprehensive reporting and insights
- **Multi-tier Agent System**: Bronze, Silver, Gold, Platinum tiers with different commissions
- **Seasonal Pricing**: Dynamic pricing based on seasons and demand

## 🛠 Tech Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn/ui**: Modern UI components
- **React Hook Form**: Form management
- **Zod**: Schema validation

### Backend
- **Next.js API Routes**: Serverless API endpoints
- **Prisma**: Database ORM
- **PostgreSQL**: Primary database
- **Clerk**: Authentication and user management

### Integrations
- **Stripe**: Payment processing
- **WhatsApp Business API**: Messaging automation
- **OpenAI/Anthropic**: AI assistance
- **PDF Generation**: Quote and invoice creation
- **Email**: SMTP integration

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Clerk account for authentication
- Stripe account for payments (optional)
- WhatsApp Business API access (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd balidmc
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your configuration values.

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
balidmc/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── admin/         # Admin endpoints
│   │   ├── analytics/     # Analytics endpoints
│   │   ├── bookings/      # Booking management
│   │   ├── packages/      # Package management
│   │   ├── payments/      # Payment processing
│   │   ├── quotes/        # Quote management
│   │   ├── users/         # User management
│   │   └── webhooks/      # External webhooks
│   ├── globals.css        # Global styles
│   └── layout.tsx         # Root layout
├── components/            # React components
├── lib/                   # Utility libraries
│   ├── ai/               # AI integration
│   ├── auth/             # Authentication
│   ├── pdf/              # PDF generation
│   └── whatsapp/         # WhatsApp integration
├── prisma/               # Database schema
├── types/                # TypeScript types
└── middleware.ts         # Next.js middleware
```

## 🔧 Configuration

### Database Setup

1. **Create PostgreSQL database**
   ```sql
   CREATE DATABASE balidmc;
   ```

2. **Update DATABASE_URL in .env.local**
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/balidmc"
   ```

3. **Run migrations**
   ```bash
   npx prisma db push
   ```

### Clerk Authentication

1. Create a Clerk application at [clerk.com](https://clerk.com)
2. Add your Clerk keys to `.env.local`:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
   CLERK_SECRET_KEY="sk_test_..."
   ```

### Stripe Payment Processing

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Add your Stripe keys to `.env.local`:
   ```
   STRIPE_SECRET_KEY="sk_test_..."
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
   ```

### WhatsApp Integration

1. Set up WhatsApp Business API
2. Add configuration to `.env.local`:
   ```
   WHATSAPP_ACCESS_TOKEN="your_token"
   WHATSAPP_PHONE_NUMBER_ID="your_phone_id"
   ```

## 📊 Database Schema

### Core Entities
- **Users**: Customer and agent profiles
- **Packages**: Travel packages with details
- **Quotes**: Price quotes for packages
- **Bookings**: Confirmed reservations
- **Payments**: Payment records and tracking
- **SeasonalRates**: Dynamic pricing rules
- **Agents**: Agent profiles with tier information
- **Admins**: Administrative users

### Relationships
- Users can have multiple quotes and bookings
- Packages can have multiple seasonal rates
- Quotes can be converted to bookings
- Bookings can have multiple payments
- Agents have tier-based commission structures

## 🎯 User Roles

### Customer
- View and request quotes
- Manage bookings
- Make payments
- Access travel documents

### Agent
- Create quotes for customers
- Manage client bookings
- Access commission reports
- Tier-based privileges (Bronze, Silver, Gold, Platinum)

### Admin
- Full system access
- User management
- Package management
- Analytics and reporting
- System configuration

## 🔌 API Endpoints

### Authentication
- All endpoints require authentication via Clerk
- Role-based access control implemented

### Main Endpoints
- `GET/POST /api/packages` - Package management
- `GET/POST /api/quotes` - Quote operations
- `GET/POST /api/bookings` - Booking management
- `GET/POST /api/payments` - Payment processing
- `GET /api/analytics` - Analytics data
- `POST /api/webhooks/whatsapp` - WhatsApp webhooks
- `POST /api/webhooks/stripe` - Stripe webhooks

## 🤖 AI Features

### Quote Assistant
- Intelligent package recommendations
- Pricing optimization suggestions
- Description generation
- Chat-based assistance

### Usage
```typescript
import { quoteAssistant } from '@/lib/ai/quote-assistant'

const suggestion = await quoteAssistant.getSuggestion({
  type: 'package_recommendation',
  context: { budget: 1000, duration: 7, interests: ['culture', 'nature'] }
})
```

## 📱 WhatsApp Automation

### Features
- Booking confirmations
- Payment reminders
- Quote notifications
- Status updates

### Message Templates
- Quote sent notifications
- Booking confirmations
- Payment confirmations
- Reminder messages

## 💳 Payment Processing

### Supported Methods
- Credit/Debit Cards (via Stripe)
- Bank Transfers
- Cash Payments

### Features
- Partial payments
- Payment tracking
- Automatic receipts
- Refund processing

## 📈 Analytics

### Available Metrics
- Revenue tracking
- Booking conversion rates
- Agent performance
- Package popularity
- Customer analytics

### Reporting
- Custom date ranges
- Export capabilities
- Real-time dashboards
- Automated reports

## 🔒 Security

### Authentication
- Clerk-based authentication
- Role-based access control
- Session management

### Data Protection
- Input validation with Zod
- SQL injection prevention
- XSS protection
- CSRF protection

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Docker
```bash
docker build -t balidmc .
docker run -p 3000:3000 balidmc
```

### Environment Variables for Production
```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
DATABASE_URL=your_production_database_url
# ... other production variables
```

## 🧪 Testing

### Run Tests
```bash
npm run test
npm run test:watch
npm run test:coverage
```

### Test Structure
- Unit tests for utilities
- Integration tests for API routes
- E2E tests for critical user flows

## 📚 Development

### Code Style
- ESLint configuration
- Prettier formatting
- TypeScript strict mode
- Conventional commits

### Development Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript checking
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Commit Convention
```
feat: add new feature
fix: bug fix
docs: documentation update
style: formatting changes
refactor: code refactoring
test: add tests
chore: maintenance tasks
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🗺 Roadmap

### Upcoming Features
- [ ] Mobile app development
- [ ] Advanced reporting dashboard
- [ ] Multi-language support
- [ ] Integration with more payment gateways
- [ ] Advanced AI features
- [ ] Real-time chat support
- [ ] Inventory management
- [ ] Supplier portal

---

**Built with ❤️ for the travel industry in Bali**