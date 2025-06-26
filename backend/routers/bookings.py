from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from typing import List, Optional
from datetime import datetime
import uuid
import random
import string

from database import get_db
from models import Booking, Quote, Agent, User, BookingStatus, QuoteStatus
from schemas import (
    Booking as BookingSchema,
    BookingCreate,
    BookingUpdate,
    PaginatedResponse
)
from middleware.clerk_auth import get_current_user_id, require_role

router = APIRouter()
security = HTTPBearer()

def generate_booking_reference() -> str:
    """Generate unique booking reference"""
    prefix = "BMD"
    timestamp = datetime.now().strftime("%y%m%d")
    random_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"{prefix}{timestamp}{random_suffix}"

@router.post("/", response_model=BookingSchema)
async def create_booking(
    booking_data: BookingCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Create a new booking from a quote"""
    user_id = get_current_user_id(credentials)
    
    # Get agent
    agent = db.query(Agent).filter(Agent.user_id == user_id).first()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent profile not found"
        )
    
    # Get quote
    quote = db.query(Quote).filter(Quote.id == booking_data.quote_id).first()
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found"
        )
    
    # Verify quote belongs to agent
    if quote.agent_id != agent.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Quote does not belong to this agent"
        )
    
    # Check if quote is accepted
    if quote.status != QuoteStatus.ACCEPTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quote must be accepted before creating booking"
        )
    
    # Check if booking already exists for this quote
    existing_booking = db.query(Booking).filter(Booking.quote_id == quote.id).first()
    if existing_booking:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking already exists for this quote"
        )
    
    # Generate unique booking reference
    booking_reference = generate_booking_reference()
    while db.query(Booking).filter(Booking.booking_reference == booking_reference).first():
        booking_reference = generate_booking_reference()
    
    # Create booking
    booking = Booking(
        id=str(uuid.uuid4()),
        quote_id=quote.id,
        agent_id=agent.id,
        booking_reference=booking_reference,
        client_details=booking_data.client_details,
        travel_details=booking_data.travel_details,
        selected_option=booking_data.selected_option,
        total_amount=booking_data.total_amount,
        paid_amount=0.0,
        status=BookingStatus.PENDING,
        payment_status="pending",
        special_requests=booking_data.special_requests
    )
    
    db.add(booking)
    
    # Update agent statistics
    agent.total_pax += quote.pax.get("total", 0)
    agent.pax_this_month += quote.pax.get("total", 0)
    agent.total_revenue += booking_data.total_amount
    
    # Recalculate conversion rate
    total_quotes = db.query(Quote).filter(Quote.agent_id == agent.id).count()
    total_bookings = db.query(Booking).filter(Booking.agent_id == agent.id).count() + 1
    agent.conversion_rate = (total_bookings / total_quotes) * 100 if total_quotes > 0 else 0
    
    # Update tier based on total pax
    from routers.agents import calculate_tier
    agent.tier = calculate_tier(agent.total_pax)
    
    db.commit()
    db.refresh(booking)
    
    return booking

@router.get("/", response_model=PaginatedResponse)
async def list_bookings(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    status: Optional[BookingStatus] = Query(None),
    search: Optional[str] = Query(None)
):
    """List bookings for current agent"""
    user_id = get_current_user_id(credentials)
    
    # Get agent
    agent = db.query(Agent).filter(Agent.user_id == user_id).first()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent profile not found"
        )
    
    query = db.query(Booking).filter(Booking.agent_id == agent.id)
    
    # Apply filters
    if status:
        query = query.filter(Booking.status == status)
    
    if search:
        query = query.filter(
            (Booking.booking_reference.ilike(f"%{search}%")) |
            (Booking.client_details["name"].astext.ilike(f"%{search}%"))
        )
    
    # Order by creation date (newest first)
    query = query.order_by(desc(Booking.created_at))
    
    # Count total
    total = query.count()
    
    # Apply pagination
    bookings = query.offset((page - 1) * size).limit(size).all()
    
    return PaginatedResponse(
        items=bookings,
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size
    )

@router.get("/{booking_id}", response_model=BookingSchema)
async def get_booking(
    booking_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get specific booking"""
    user_id = get_current_user_id(credentials)
    
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Check access permissions
    user = db.query(User).filter(User.id == user_id).first()
    if user.role != "admin":
        agent = db.query(Agent).filter(Agent.user_id == user_id).first()
        if not agent or booking.agent_id != agent.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    
    return booking

@router.put("/{booking_id}", response_model=BookingSchema)
async def update_booking(
    booking_id: str,
    booking_update: BookingUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Update booking"""
    user_id = get_current_user_id(credentials)
    
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Check ownership or admin role
    user = db.query(User).filter(User.id == user_id).first()
    if user.role != "admin":
        agent = db.query(Agent).filter(Agent.user_id == user_id).first()
        if not agent or booking.agent_id != agent.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    
    # Update fields
    update_data = booking_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(booking, field, value)
    
    db.commit()
    db.refresh(booking)
    
    return booking

@router.post("/{booking_id}/confirm", response_model=dict)
async def confirm_booking(
    booking_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Confirm booking (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    booking.status = BookingStatus.CONFIRMED
    db.commit()
    
    return {"success": True, "message": "Booking confirmed successfully"}

@router.post("/{booking_id}/cancel", response_model=dict)
async def cancel_booking(
    booking_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Cancel booking"""
    user_id = get_current_user_id(credentials)
    
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Check ownership or admin role
    user = db.query(User).filter(User.id == user_id).first()
    if user.role != "admin":
        agent = db.query(Agent).filter(Agent.user_id == user_id).first()
        if not agent or booking.agent_id != agent.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    
    # Update booking status
    booking.status = BookingStatus.CANCELLED
    
    # Update agent statistics (subtract from totals)
    if booking.status == BookingStatus.CONFIRMED:
        agent = db.query(Agent).filter(Agent.id == booking.agent_id).first()
        if agent:
            quote = db.query(Quote).filter(Quote.id == booking.quote_id).first()
            if quote:
                agent.total_pax = max(0, agent.total_pax - quote.pax.get("total", 0))
                agent.total_revenue = max(0, agent.total_revenue - booking.total_amount)
                
                # Recalculate conversion rate
                total_quotes = db.query(Quote).filter(Quote.agent_id == agent.id).count()
                total_bookings = db.query(Booking).filter(
                    Booking.agent_id == agent.id,
                    Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED])
                ).count()
                agent.conversion_rate = (total_bookings / total_quotes) * 100 if total_quotes > 0 else 0
    
    db.commit()
    
    return {"success": True, "message": "Booking cancelled successfully"}

@router.post("/{booking_id}/complete", response_model=dict)
async def complete_booking(
    booking_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Mark booking as completed (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    booking.status = BookingStatus.COMPLETED
    db.commit()
    
    return {"success": True, "message": "Booking marked as completed"}

@router.post("/{booking_id}/payment", response_model=dict)
async def update_payment(
    booking_id: str,
    amount: float,
    payment_status: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Update payment information (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    booking.paid_amount = amount
    booking.payment_status = payment_status
    
    # Auto-confirm if fully paid
    if amount >= booking.total_amount and payment_status == "completed":
        booking.status = BookingStatus.CONFIRMED
    
    db.commit()
    
    return {
        "success": True, 
        "message": "Payment information updated",
        "booking_status": booking.status
    }