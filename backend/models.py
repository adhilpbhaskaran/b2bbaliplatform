from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey, Enum, Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, date
import enum

Base = declarative_base()

class UserRole(str, enum.Enum):
    AGENT = "agent"
    ADMIN = "admin"

class UserStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"

class TierLevel(str, enum.Enum):
    BRONZE = "Bronze"
    SILVER = "Silver"
    GOLD = "Gold"
    PLATINUM = "Platinum"

class QuoteStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    VIEWED = "viewed"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"

class BookingStatus(str, enum.Enum):
    CONFIRMED = "confirmed"
    PENDING = "pending"
    CANCELLED = "cancelled"
    COMPLETED = "completed"

class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    PARTIALLY_PAID = "partially_paid"

class SeasonType(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    PEAK = "peak"

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    status = Column(Enum(UserStatus), default=UserStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    agent_profile = relationship("Agent", back_populates="user", uselist=False)
    admin_profile = relationship("Admin", back_populates="user", uselist=False)

class Agent(Base):
    __tablename__ = "agents"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), unique=True)
    contact_person = Column(String, nullable=False)
    company_name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    whatsapp = Column(String, nullable=False)
    country = Column(String, nullable=False)
    city = Column(String, nullable=False)
    experience = Column(String, nullable=False)
    specialization = Column(JSON)  # Array of strings
    website = Column(String, nullable=True)
    social_media = Column(JSON, nullable=True)  # Object with instagram, facebook, linkedin
    business_license = Column(String, nullable=True)
    tier = Column(Enum(TierLevel), default=TierLevel.BRONZE)
    total_pax = Column(Integer, default=0)
    pax_this_month = Column(Integer, default=0)
    total_revenue = Column(Float, default=0.0)
    conversion_rate = Column(Float, default=0.0)
    last_active = Column(DateTime(timezone=True), server_default=func.now())
    preferences = Column(JSON)  # Object with currency, timezone, notifications
    
    # Relationships
    user = relationship("User", back_populates="agent_profile")
    quotes = relationship("Quote", back_populates="agent")
    bookings = relationship("Booking", back_populates="agent")

class Admin(Base):
    __tablename__ = "admins"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), unique=True)
    contact_person = Column(String, nullable=False)
    permissions = Column(JSON)  # Array of strings
    
    # Relationships
    user = relationship("User", back_populates="admin_profile")

class Package(Base):
    __tablename__ = "packages"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    duration = Column(Integer, nullable=False)
    locations = Column(JSON)  # Array of strings
    nights = Column(JSON)  # Array of integers
    base_price = Column(Float, nullable=False)
    inclusions = Column(JSON)  # Array of strings
    exclusions = Column(JSON, nullable=True)  # Array of strings
    highlights = Column(JSON)  # Array of strings
    description = Column(Text, nullable=False)
    images = Column(JSON)  # Array of strings (URLs)
    category = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    quotes = relationship("Quote", back_populates="package")
    seasonal_rates = relationship("SeasonalRate", back_populates="package")

class Hotel(Base):
    __tablename__ = "hotels"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    location = Column(String, nullable=False)
    category = Column(String, nullable=False)  # Standard, Premium, Luxury
    price_per_night = Column(Float, nullable=False)
    rating = Column(Float, nullable=False)
    amenities = Column(JSON)  # Array of strings
    images = Column(JSON)  # Array of strings
    description = Column(Text, nullable=False)
    room_types = Column(JSON)  # Array of room type objects
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Quote(Base):
    __tablename__ = "quotes"
    
    id = Column(String, primary_key=True, index=True)
    agent_id = Column(String, ForeignKey("agents.id"))
    package_id = Column(String, ForeignKey("packages.id"))
    client_name = Column(String, nullable=False)
    client_email = Column(String, nullable=False)
    client_phone = Column(String, nullable=True)
    travel_dates = Column(JSON)  # Object with start and end dates
    pax = Column(JSON)  # Object with adults, children, etc.
    options = Column(JSON)  # Array of quote options
    pricing = Column(JSON)  # Pricing breakdown
    status = Column(Enum(QuoteStatus), default=QuoteStatus.DRAFT)
    valid_until = Column(DateTime(timezone=True))
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    agent = relationship("Agent", back_populates="quotes")
    package = relationship("Package", back_populates="quotes")
    booking = relationship("Booking", back_populates="quote", uselist=False)

class Booking(Base):
    __tablename__ = "bookings"
    
    id = Column(String, primary_key=True, index=True)
    quote_id = Column(String, ForeignKey("quotes.id"), unique=True)
    agent_id = Column(String, ForeignKey("agents.id"))
    booking_reference = Column(String, unique=True, nullable=False)
    client_details = Column(JSON)  # Complete client information
    travel_details = Column(JSON)  # Travel dates, pax, etc.
    selected_option = Column(JSON)  # Selected quote option
    total_amount = Column(Float, nullable=False)
    paid_amount = Column(Float, default=0.0)
    status = Column(Enum(BookingStatus), default=BookingStatus.PENDING)
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    special_requests = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    quote = relationship("Quote", back_populates="booking")
    agent = relationship("Agent", back_populates="bookings")
    payments = relationship("Payment", back_populates="booking")

class AddOn(Base):
    __tablename__ = "addons"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    category = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class TierConfig(Base):
    __tablename__ = "tier_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    level = Column(Enum(TierLevel), unique=True, nullable=False)
    min_pax = Column(Integer, nullable=False)
    discount = Column(Float, nullable=False)
    benefits = Column(JSON)  # Array of strings
    color = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class SeasonalRate(Base):
    __tablename__ = "seasonal_rates"
    
    id = Column(String, primary_key=True, index=True)
    package_id = Column(String, ForeignKey("packages.id"), nullable=False)
    season_name = Column(String, nullable=False)  # e.g., "Christmas 2024", "Summer 2024"
    season_type = Column(Enum(SeasonType), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    price_multiplier = Column(Float, nullable=False, default=1.0)  # 1.0 = base price, 1.5 = 50% increase
    fixed_price = Column(Float, nullable=True)  # Optional: override base price completely
    min_stay = Column(Integer, default=1)  # Minimum nights required
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    package = relationship("Package", back_populates="seasonal_rates")

class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(String, primary_key=True, index=True)
    booking_id = Column(String, ForeignKey("bookings.id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="USD")
    payment_method = Column(String, nullable=False)  # stripe, paypal, bank_transfer
    payment_intent_id = Column(String, nullable=True)  # Stripe payment intent ID
    transaction_id = Column(String, nullable=True)  # External transaction reference
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    payment_date = Column(DateTime(timezone=True), nullable=True)
    failure_reason = Column(String, nullable=True)
    metadata = Column(JSON, nullable=True)  # Additional payment data
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    booking = relationship("Booking", back_populates="payments")