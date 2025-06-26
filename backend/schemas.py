from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, date
from enum import Enum

# Enums
class UserRole(str, Enum):
    AGENT = "agent"
    ADMIN = "admin"

class UserStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"

class TierLevel(str, Enum):
    BRONZE = "Bronze"
    SILVER = "Silver"
    GOLD = "Gold"
    PLATINUM = "Platinum"

class QuoteStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    VIEWED = "viewed"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"

class BookingStatus(str, Enum):
    CONFIRMED = "confirmed"
    PENDING = "pending"
    CANCELLED = "cancelled"
    COMPLETED = "completed"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    PARTIALLY_PAID = "partially_paid"

class SeasonType(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    PEAK = "peak"

# Base schemas
class UserBase(BaseModel):
    email: EmailStr
    role: UserRole

class UserCreate(UserBase):
    pass

class UserUpdate(BaseModel):
    status: Optional[UserStatus] = None

class User(UserBase):
    id: str
    status: UserStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Agent schemas
class SocialMedia(BaseModel):
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    linkedin: Optional[str] = None

class AgentPreferences(BaseModel):
    currency: str = "USD"
    timezone: str = "Asia/Jakarta"
    notifications: Dict[str, bool] = {
        "email": True,
        "whatsapp": True,
        "sms": False
    }

class AgentBase(BaseModel):
    contact_person: str
    company_name: str
    phone: str
    whatsapp: str
    country: str
    city: str
    experience: str
    specialization: List[str]
    website: Optional[str] = None
    social_media: Optional[SocialMedia] = None
    business_license: Optional[str] = None

class AgentCreate(AgentBase):
    user_id: str
    preferences: Optional[AgentPreferences] = None

class AgentUpdate(BaseModel):
    contact_person: Optional[str] = None
    company_name: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    experience: Optional[str] = None
    specialization: Optional[List[str]] = None
    website: Optional[str] = None
    social_media: Optional[SocialMedia] = None
    business_license: Optional[str] = None
    tier: Optional[TierLevel] = None
    preferences: Optional[AgentPreferences] = None

class Agent(AgentBase):
    id: str
    user_id: str
    tier: TierLevel
    total_pax: int
    pax_this_month: int
    total_revenue: float
    conversion_rate: float
    last_active: datetime
    preferences: AgentPreferences
    user: User
    
    class Config:
        from_attributes = True

# Admin schemas
class AdminBase(BaseModel):
    contact_person: str
    permissions: Optional[Dict[str, Any]] = None

class AdminCreate(AdminBase):
    user_id: str

class AdminUpdate(BaseModel):
    contact_person: Optional[str] = None
    permissions: Optional[Dict[str, Any]] = None

class Admin(AdminBase):
    id: str
    user_id: str
    user: User
    
    class Config:
        from_attributes = True

# Package schemas
class PackageBase(BaseModel):
    name: str
    duration: int
    locations: List[str]
    nights: List[int]
    base_price: float
    inclusions: List[str]
    exclusions: Optional[List[str]] = None
    highlights: List[str]
    description: str
    images: List[str]
    category: str

class PackageCreate(PackageBase):
    pass

class PackageUpdate(BaseModel):
    name: Optional[str] = None
    duration: Optional[int] = None
    locations: Optional[List[str]] = None
    nights: Optional[List[int]] = None
    base_price: Optional[float] = None
    inclusions: Optional[List[str]] = None
    exclusions: Optional[List[str]] = None
    highlights: Optional[List[str]] = None
    description: Optional[str] = None
    images: Optional[List[str]] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None

class Package(PackageBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Quote schemas
class PaxDetails(BaseModel):
    adults: int
    children: int = 0
    child_with_bed: int = 0
    child_without_bed: int = 0
    total: int

class TravelDates(BaseModel):
    start_date: datetime
    end_date: datetime

class HotelOption(BaseModel):
    id: str
    name: str
    category: str
    price_per_night: float
    location: str

class QuoteOption(BaseModel):
    hotels: List[HotelOption]
    add_ons: List[Dict[str, Any]]
    markup: float
    markup_type: str  # "flat" or "percentage"
    total_price: float

class PricingBreakdown(BaseModel):
    base_price: float
    hotel_cost: float
    vehicle_cost: float
    addon_cost: float
    tier_discount: float
    markup: float
    final_price: float

class QuoteBase(BaseModel):
    client_name: str
    client_email: EmailStr
    client_phone: Optional[str] = None
    travel_dates: TravelDates
    pax: PaxDetails
    notes: Optional[str] = None

class QuoteCreate(QuoteBase):
    package_id: str
    options: List[QuoteOption]

class QuoteUpdate(BaseModel):
    client_name: Optional[str] = None
    client_email: Optional[EmailStr] = None
    client_phone: Optional[str] = None
    travel_dates: Optional[TravelDates] = None
    pax: Optional[PaxDetails] = None
    options: Optional[List[QuoteOption]] = None
    status: Optional[QuoteStatus] = None
    notes: Optional[str] = None

class Quote(QuoteBase):
    id: str
    agent_id: str
    package_id: str
    options: List[QuoteOption]
    pricing: PricingBreakdown
    status: QuoteStatus
    valid_until: datetime
    created_at: datetime
    updated_at: Optional[datetime] = None
    agent: Agent
    package: Package
    
    class Config:
        from_attributes = True

# Booking schemas
class BookingBase(BaseModel):
    client_details: Dict[str, Any]
    travel_details: Dict[str, Any]
    selected_option: Dict[str, Any]
    total_amount: float
    special_requests: Optional[str] = None

class BookingCreate(BookingBase):
    quote_id: str

class BookingUpdate(BaseModel):
    status: Optional[BookingStatus] = None
    payment_status: Optional[str] = None
    paid_amount: Optional[float] = None
    special_requests: Optional[str] = None

class Booking(BookingBase):
    id: str
    quote_id: str
    agent_id: str
    booking_reference: str
    paid_amount: float
    status: BookingStatus
    payment_status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    quote: Quote
    agent: Agent
    
    class Config:
        from_attributes = True

# Analytics schemas
class MonthlyStats(BaseModel):
    month: str
    year: int
    quotes: int
    bookings: int
    revenue: float
    conversion_rate: float

class Analytics(BaseModel):
    total_quotes: int
    total_bookings: int
    total_revenue: float
    conversion_rate: float
    monthly_stats: List[MonthlyStats]
    tier_progress: Dict[str, Any]
    recent_activity: List[Dict[str, Any]]

class AgentAnalytics(BaseModel):
    total_quotes: int
    total_bookings: int
    total_revenue: float
    conversion_rate: float
    monthly_stats: Dict[str, Any]
    tier_progress: Dict[str, Any]

class PlatformAnalytics(BaseModel):
    total_agents: int
    active_agents: int
    total_quotes: int
    total_bookings: int
    total_revenue: float
    monthly_growth: Dict[str, Any]
    tier_distribution: Dict[str, int]

# Response schemas
class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None

class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    size: int
    pages: int

# Hotel schemas
class RoomType(BaseModel):
    id: str
    name: str
    capacity: int
    price_per_night: float
    amenities: List[str]

class HotelBase(BaseModel):
    name: str
    location: str
    category: str
    price_per_night: float
    rating: float
    amenities: List[str]
    images: List[str]
    description: str
    room_types: List[RoomType]

class HotelCreate(HotelBase):
    pass

class HotelUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    category: Optional[str] = None
    price_per_night: Optional[float] = None
    rating: Optional[float] = None
    amenities: Optional[List[str]] = None
    images: Optional[List[str]] = None
    description: Optional[str] = None
    room_types: Optional[List[RoomType]] = None
    is_active: Optional[bool] = None

class Hotel(HotelBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Add-on schemas
class AddOnBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    category: str

class AddOnCreate(AddOnBase):
    pass

class AddOnUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None

class AddOn(AddOnBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Tier configuration schemas
class TierConfigBase(BaseModel):
    level: TierLevel
    min_pax: int
    discount: float
    benefits: List[str]
    color: str

class TierConfigCreate(TierConfigBase):
    pass

class TierConfigUpdate(BaseModel):
    level: Optional[TierLevel] = None
    min_pax: Optional[int] = None
    discount: Optional[float] = None
    benefits: Optional[List[str]] = None
    color: Optional[str] = None

class TierConfig(TierConfigBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Seasonal Rate schemas
class SeasonalRateBase(BaseModel):
    package_id: str
    season_name: str
    season_type: SeasonType
    start_date: date
    end_date: date
    price_multiplier: float = 1.0
    fixed_price: Optional[float] = None
    min_stay: int = 1
    is_active: bool = True

class SeasonalRateCreate(SeasonalRateBase):
    pass

class SeasonalRateUpdate(BaseModel):
    season_name: Optional[str] = None
    season_type: Optional[SeasonType] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    price_multiplier: Optional[float] = None
    fixed_price: Optional[float] = None
    min_stay: Optional[int] = None
    is_active: Optional[bool] = None

class SeasonalRate(SeasonalRateBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Payment schemas
class PaymentBase(BaseModel):
    booking_id: str
    amount: float
    currency: str = "USD"
    payment_method: str
    payment_intent_id: Optional[str] = None
    transaction_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class PaymentCreate(PaymentBase):
    pass

class PaymentUpdate(BaseModel):
    status: Optional[PaymentStatus] = None
    payment_date: Optional[datetime] = None
    failure_reason: Optional[str] = None
    transaction_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class Payment(PaymentBase):
    id: str
    status: PaymentStatus
    payment_date: Optional[datetime] = None
    failure_reason: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True