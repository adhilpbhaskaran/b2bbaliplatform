# Bali DMC - Itemized B2B Platform

A comprehensive B2B travel platform designed for agents to create highly customized, itemized quotes for their clients. This platform provides maximum flexibility and control over pricing, inventory, and quote management.

## 🎯 Platform Overview

This B2B platform is specifically designed for travel agents who need:
- **High-level customization** for client quotes
- **Itemized pricing** with seasonal rate support
- **Flexible inventory management** (hotels, activities, add-ons)
- **Tier-based agent benefits** and commission tracking
- **Professional quote presentation** and management

## 🏗️ Architecture

### Database Schema

The platform uses a flexible, itemized approach with the following key models:

#### Core Models
- **Hotel** - Accommodation properties
- **HotelRoom** - Specific room types with individual pricing
- **BookableActivity** - Tours, experiences, and activities
- **AddOn** - Additional services (transport, meals, insurance)
- **Quote** - Container for itemized or package quotes
- **QuoteItem** - Individual line items in quotes

#### Pricing Models
- **HotelSeasonalRate** - Room-specific seasonal pricing
- **ActivitySeasonalRate** - Activity-specific seasonal pricing
- **TierConfig** - Agent tier benefits and commission rates

#### Management Models
- **Agent** - B2B agent profiles and tier assignments
- **Commission** - Commission tracking and payments
- **Booking** - Confirmed reservations

### Key Features

#### 1. Itemized Quote Builder
- **Flexible Item Selection**: Choose from hotels, activities, and add-ons
- **Room-Level Pricing**: Select specific room types with individual rates
- **Quantity Management**: Specify quantities for each item
- **Seasonal Rate Support**: Automatic seasonal pricing adjustments
- **Real-time Calculations**: Live pricing updates as items are added/removed

#### 2. Advanced Pricing Engine
- **Seasonal Rates**: Different pricing for peak, high, and low seasons
- **Agent Tier Discounts**: Automatic discounts based on agent tier
- **Markup Flexibility**: Customizable markup percentages
- **Commission Tracking**: Automatic commission calculations
- **Bulk Pricing**: Calculate pricing for multiple items simultaneously

#### 3. Professional Quote Management
- **Quote Templates**: Professional, branded quote presentations
- **Status Tracking**: Draft, sent, viewed, accepted, rejected, expired
- **Version Control**: Track quote modifications and updates
- **Export Options**: PDF generation and email integration
- **Client Communication**: Built-in messaging and notes

#### 4. Agent Dashboard
- **Performance Analytics**: Conversion rates, revenue tracking
- **Commission Reports**: Detailed commission breakdowns
- **Tier Progress**: Track progress towards next tier level
- **Recent Activity**: Quick access to recent quotes and bookings
- **Profile Management**: Agent profile and settings

## 📁 File Structure

### Database & Schema
```
prisma/
└── schema.prisma                 # Complete database schema with itemized models
```

### Core Business Logic
```
lib/
├── pricing/
│   ├── itemized-pricing.ts       # Pricing calculations and seasonal rates
│   └── quote-builder.ts          # Quote creation and management
└── utils.ts                      # Utility functions
```

### API Routes
```
app/api/
├── quotes/
│   ├── itemized/route.ts         # Itemized quote CRUD operations
│   └── stats/route.ts            # Quote analytics and statistics
├── hotels/
│   ├── route.ts                  # Hotel listing and management
│   └── [id]/rooms/route.ts       # Hotel room management
├── activities/route.ts           # Activity listing and management
├── add-ons/route.ts             # Add-on services management
├── agents/profile/route.ts       # Agent profile management
└── pricing/calculate/route.ts    # Pricing calculation API
```

### UI Components
```
components/
├── dashboard/
│   └── AgentDashboard.tsx        # Main agent dashboard
└── quotes/
    ├── ItemizedQuoteBuilder.tsx  # Quote creation interface
    ├── ItemSelector.tsx          # Item browsing and selection
    ├── QuoteManagement.tsx       # Quote listing and management
    └── QuoteViewer.tsx           # Professional quote display
```

### Pages
```
app/
├── dashboard/
│   ├── page.tsx                  # Main dashboard page
│   └── quotes/page.tsx           # Quote management page
└── api/                          # API routes (see above)
```

## 🚀 Key Functionalities

### 1. Hotel Management
- **Room-Level Inventory**: Each hotel can have multiple room types
- **Seasonal Pricing**: Different rates for different seasons
- **Capacity Management**: Track room capacity and availability
- **Category Filtering**: Filter by hotel category and location

### 2. Activity Management
- **Diverse Categories**: Tours, adventures, cultural experiences
- **Flexible Pricing**: Duration-based and group-size pricing
- **Location-Based**: Activities organized by location
- **Detailed Information**: Highlights, inclusions, exclusions, requirements

### 3. Add-On Services
- **Transportation**: Airport transfers, private cars, group transport
- **Meals**: Breakfast, lunch, dinner packages
- **Insurance**: Travel insurance options
- **Special Services**: Photography, guides, equipment rental

### 4. Pricing Intelligence
- **Dynamic Seasonal Rates**: Automatic rate adjustments
- **Agent Tier Benefits**: Tiered discount structure
- **Markup Flexibility**: Customizable profit margins
- **Commission Automation**: Automatic commission calculations

### 5. Quote Workflow
1. **Item Selection**: Browse and select hotels, activities, add-ons
2. **Customization**: Specify quantities, dates, special requirements
3. **Pricing Review**: Review calculated prices with seasonal adjustments
4. **Markup Application**: Apply desired markup percentages
5. **Quote Generation**: Create professional quote document
6. **Client Presentation**: Send quote to client with tracking
7. **Follow-up**: Track views, responses, and conversions

## 💼 Agent Tier System

### Tier Benefits
- **Bronze**: 5% discount, 3% commission, $5,000 credit limit
- **Silver**: 10% discount, 5% commission, $15,000 credit limit
- **Gold**: 15% discount, 7% commission, $30,000 credit limit
- **Platinum**: 20% discount, 10% commission, $50,000 credit limit

### Tier Progression
- Based on monthly commission targets
- Automatic tier upgrades
- Additional benefits and privileges
- Enhanced credit limits

## 📊 Analytics & Reporting

### Dashboard Metrics
- **Quote Statistics**: Total quotes, conversion rates, average values
- **Revenue Tracking**: Monthly revenue, commission earned
- **Performance Trends**: Monthly and quarterly trends
- **Status Breakdown**: Quote status distribution

### Detailed Reports
- **Commission Reports**: Detailed commission breakdowns
- **Client Analysis**: Client behavior and preferences
- **Product Performance**: Best-selling hotels and activities
- **Seasonal Trends**: Seasonal booking patterns

## 🔧 Technical Implementation

### Technologies Used
- **Framework**: Next.js 14 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **UI Components**: Shadcn/ui with Tailwind CSS
- **Type Safety**: TypeScript throughout
- **Validation**: Zod for schema validation

### Key Design Patterns
- **Separation of Concerns**: Clear separation between UI, business logic, and data
- **Type Safety**: Comprehensive TypeScript coverage
- **Error Handling**: Robust error handling and validation
- **Performance**: Optimized queries and caching strategies
- **Scalability**: Modular architecture for easy scaling

## 🎨 User Experience

### Agent Interface
- **Intuitive Dashboard**: Clean, organized dashboard with key metrics
- **Efficient Quote Builder**: Streamlined quote creation process
- **Professional Presentation**: Branded, professional quote documents
- **Mobile Responsive**: Works seamlessly on all devices

### Client Experience
- **Professional Quotes**: Well-formatted, detailed quote presentations
- **Clear Pricing**: Transparent, itemized pricing breakdowns
- **Easy Communication**: Built-in messaging and feedback system
- **Quick Responses**: Fast quote generation and delivery

## 🔐 Security & Compliance

### Data Protection
- **Role-Based Access**: Strict role-based access control
- **Data Validation**: Comprehensive input validation
- **Secure APIs**: Protected API endpoints with authentication
- **Audit Logging**: Complete audit trail for all actions

### Business Compliance
- **Commission Tracking**: Accurate commission calculations
- **Financial Records**: Detailed financial transaction records
- **Client Privacy**: Secure client data handling
- **Agent Accountability**: Clear agent performance tracking

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Environment variables configured

### Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up database: `npx prisma migrate dev`
4. Seed initial data: `npx prisma db seed`
5. Start development server: `npm run dev`

### Environment Variables
```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
```

## 📈 Future Enhancements

### Planned Features
- **Mobile App**: Native mobile app for agents
- **Advanced Analytics**: AI-powered insights and recommendations
- **Integration APIs**: Third-party booking system integrations
- **Multi-Currency**: Support for multiple currencies
- **Advanced Reporting**: Custom report builder

### Scalability Considerations
- **Microservices**: Potential migration to microservices architecture
- **Caching Layer**: Redis caching for improved performance
- **CDN Integration**: Asset delivery optimization
- **Load Balancing**: Horizontal scaling capabilities

## 🤝 Support

For technical support or questions about the platform:
- Review the documentation
- Check the API reference
- Contact the development team

---

**Built for B2B Excellence** - This platform is specifically designed to meet the complex needs of B2B travel agents who require maximum flexibility and customization in their quote creation process.