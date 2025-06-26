from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import uuid
import json

from database import get_db
from models import Quote, Agent, Package, User, QuoteStatus, TierLevel
from schemas import (
    Quote as QuoteSchema,
    QuoteCreate,
    QuoteUpdate,
    PaginatedResponse,
    PricingBreakdown
)
from middleware.clerk_auth import get_current_user_id, require_role

router = APIRouter()
security = HTTPBearer()

# Pricing configuration
TIER_DISCOUNTS = {
    TierLevel.BRONZE: 5,
    TierLevel.SILVER: 10,
    TierLevel.GOLD: 15,
    TierLevel.PLATINUM: 20
}

# Vehicle pricing based on group size
VEHICLE_PRICING = [
    {"type": "Avanza", "capacity": 6, "price_per_day": 35},
    {"type": "Innova", "capacity": 8, "price_per_day": 45},
    {"type": "ELF", "capacity": 15, "price_per_day": 65},
    {"type": "Bus", "capacity": 25, "price_per_day": 85}
]

def calculate_rooms(adults: int, child_with_bed: int, child_without_bed: int) -> Dict[str, int]:
    """Calculate number of rooms needed"""
    # Children without bed don't count towards room calculation
    total_bed_occupants = adults + child_with_bed
    
    # Assume 2 people per room (can be customized)
    rooms = (total_bed_occupants + 1) // 2  # Round up
    
    return {
        "rooms": max(1, rooms),
        "total_occupants": total_bed_occupants,
        "children_without_bed": child_without_bed
    }

def select_vehicle(total_pax: int) -> Dict[str, Any]:
    """Select appropriate vehicle based on group size"""
    for vehicle in VEHICLE_PRICING:
        if total_pax <= vehicle["capacity"]:
            return vehicle
    
    # If group is larger than largest vehicle, use bus
    return VEHICLE_PRICING[-1]

def calculate_quote_pricing(
    package: Package,
    options: List[Dict[str, Any]],
    pax: Dict[str, int],
    agent: Agent
) -> List[PricingBreakdown]:
    """Calculate pricing for all quote options"""
    pricing_breakdowns = []
    
    for option in options:
        # Base package price
        base_price = package.base_price * pax["total"]
        
        # Hotel costs
        hotel_cost = 0
        room_calc = calculate_rooms(
            pax["adults"], 
            pax.get("child_with_bed", 0), 
            pax.get("child_without_bed", 0)
        )
        
        for i, hotel in enumerate(option["hotels"]):
            nights = package.nights[i] if i < len(package.nights) else 1
            hotel_cost += hotel["price_per_night"] * nights * room_calc["rooms"]
        
        # Vehicle cost
        vehicle = select_vehicle(pax["total"])
        vehicle_cost = vehicle["price_per_day"] * package.duration
        
        # Add-ons cost
        addon_cost = 0
        for addon in option.get("add_ons", []):
            addon_cost += addon["price"] * pax["total"]
        
        # Subtotal before discounts
        subtotal = base_price + hotel_cost + vehicle_cost + addon_cost
        
        # Apply tier discount
        tier_discount_amount = TIER_DISCOUNTS.get(agent.tier, 0) * pax["total"]
        discounted_price = subtotal - tier_discount_amount
        
        # Apply markup
        markup_amount = option.get("markup", 0)
        if option.get("markup_type") == "percentage":
            markup_amount = discounted_price * (markup_amount / 100)
        
        final_price = discounted_price + markup_amount
        
        pricing_breakdown = PricingBreakdown(
            base_price=base_price,
            hotel_cost=hotel_cost,
            vehicle_cost=vehicle_cost,
            addon_cost=addon_cost,
            tier_discount=tier_discount_amount,
            markup=markup_amount,
            final_price=final_price
        )
        
        pricing_breakdowns.append(pricing_breakdown)
    
    return pricing_breakdowns

@router.post("/", response_model=QuoteSchema)
async def create_quote(
    quote_data: QuoteCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Create a new quote"""
    user_id = get_current_user_id(credentials)
    
    # Get agent
    agent = db.query(Agent).filter(Agent.user_id == user_id).first()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent profile not found"
        )
    
    # Check agent status
    user = db.query(User).filter(User.id == user_id).first()
    if user.status != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Agent not approved"
        )
    
    # Get package
    package = db.query(Package).filter(
        Package.id == quote_data.package_id,
        Package.is_active == True
    ).first()
    if not package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Package not found or inactive"
        )
    
    # Calculate pricing for all options
    pricing_breakdowns = calculate_quote_pricing(
        package, 
        [opt.dict() for opt in quote_data.options], 
        quote_data.pax.dict(), 
        agent
    )
    
    # Create quote
    quote = Quote(
        id=str(uuid.uuid4()),
        agent_id=agent.id,
        package_id=package.id,
        client_name=quote_data.client_name,
        client_email=quote_data.client_email,
        client_phone=quote_data.client_phone,
        travel_dates=quote_data.travel_dates.dict(),
        pax=quote_data.pax.dict(),
        options=[opt.dict() for opt in quote_data.options],
        pricing=[pricing.dict() for pricing in pricing_breakdowns],
        status=QuoteStatus.DRAFT,
        valid_until=datetime.utcnow() + timedelta(days=30),
        notes=quote_data.notes
    )
    
    db.add(quote)
    db.commit()
    db.refresh(quote)
    
    return quote

@router.get("/", response_model=PaginatedResponse)
async def list_quotes(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    status: Optional[QuoteStatus] = Query(None),
    search: Optional[str] = Query(None)
):
    """List quotes for current agent"""
    user_id = get_current_user_id(credentials)
    
    # Get agent
    agent = db.query(Agent).filter(Agent.user_id == user_id).first()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent profile not found"
        )
    
    query = db.query(Quote).filter(Quote.agent_id == agent.id)
    
    # Apply filters
    if status:
        query = query.filter(Quote.status == status)
    
    if search:
        query = query.filter(
            (Quote.client_name.ilike(f"%{search}%")) |
            (Quote.client_email.ilike(f"%{search}%"))
        )
    
    # Order by creation date (newest first)
    query = query.order_by(desc(Quote.created_at))
    
    # Count total
    total = query.count()
    
    # Apply pagination
    quotes = query.offset((page - 1) * size).limit(size).all()
    
    return PaginatedResponse(
        items=quotes,
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size
    )

@router.get("/{quote_id}", response_model=QuoteSchema)
async def get_quote(
    quote_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get specific quote"""
    user_id = get_current_user_id(credentials)
    
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found"
        )
    
    # Check access permissions
    user = db.query(User).filter(User.id == user_id).first()
    if user.role != "admin":
        agent = db.query(Agent).filter(Agent.user_id == user_id).first()
        if not agent or quote.agent_id != agent.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    
    return quote

@router.put("/{quote_id}", response_model=QuoteSchema)
async def update_quote(
    quote_id: str,
    quote_update: QuoteUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Update quote"""
    user_id = get_current_user_id(credentials)
    
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found"
        )
    
    # Check ownership
    agent = db.query(Agent).filter(Agent.user_id == user_id).first()
    if not agent or quote.agent_id != agent.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Update fields
    update_data = quote_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field in ["travel_dates", "pax", "options"] and value:
            setattr(quote, field, value.dict() if hasattr(value, 'dict') else value)
        else:
            setattr(quote, field, value)
    
    # Recalculate pricing if options changed
    if "options" in update_data or "pax" in update_data:
        package = db.query(Package).filter(Package.id == quote.package_id).first()
        pricing_breakdowns = calculate_quote_pricing(
            package, 
            quote.options, 
            quote.pax, 
            agent
        )
        quote.pricing = [pricing.dict() for pricing in pricing_breakdowns]
    
    db.commit()
    db.refresh(quote)
    
    return quote

@router.post("/{quote_id}/send", response_model=dict)
async def send_quote(
    quote_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Send quote to client"""
    user_id = get_current_user_id(credentials)
    
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found"
        )
    
    # Check ownership
    agent = db.query(Agent).filter(Agent.user_id == user_id).first()
    if not agent or quote.agent_id != agent.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Update status
    quote.status = QuoteStatus.SENT
    db.commit()
    
    # TODO: Implement email sending logic here
    # send_quote_email(quote, agent)
    
    return {"success": True, "message": "Quote sent successfully"}

@router.post("/{quote_id}/duplicate", response_model=QuoteSchema)
async def duplicate_quote(
    quote_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Duplicate an existing quote"""
    user_id = get_current_user_id(credentials)
    
    original_quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not original_quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found"
        )
    
    # Check ownership
    agent = db.query(Agent).filter(Agent.user_id == user_id).first()
    if not agent or original_quote.agent_id != agent.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Create duplicate
    new_quote = Quote(
        id=str(uuid.uuid4()),
        agent_id=original_quote.agent_id,
        package_id=original_quote.package_id,
        client_name=f"Copy of {original_quote.client_name}",
        client_email=original_quote.client_email,
        client_phone=original_quote.client_phone,
        travel_dates=original_quote.travel_dates,
        pax=original_quote.pax,
        options=original_quote.options,
        pricing=original_quote.pricing,
        status=QuoteStatus.DRAFT,
        valid_until=datetime.utcnow() + timedelta(days=30),
        notes=original_quote.notes
    )
    
    db.add(new_quote)
    db.commit()
    db.refresh(new_quote)
    
    return new_quote

@router.delete("/{quote_id}", response_model=dict)
async def delete_quote(
    quote_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Delete quote"""
    user_id = get_current_user_id(credentials)
    
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found"
        )
    
    # Check ownership
    agent = db.query(Agent).filter(Agent.user_id == user_id).first()
    if not agent or quote.agent_id != agent.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Only allow deletion of draft quotes
    if quote.status != QuoteStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only delete draft quotes"
        )
    
    db.delete(quote)
    db.commit()
    
    return {"success": True, "message": "Quote deleted successfully"}

@router.post("/calculate", response_model=List[PricingBreakdown])
async def calculate_pricing(
    package_id: str,
    options: List[Dict[str, Any]],
    pax: Dict[str, int],
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Calculate pricing for quote options without creating a quote"""
    user_id = get_current_user_id(credentials)
    
    # Get agent
    agent = db.query(Agent).filter(Agent.user_id == user_id).first()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent profile not found"
        )
    
    # Get package
    package = db.query(Package).filter(
        Package.id == package_id,
        Package.is_active == True
    ).first()
    if not package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Package not found or inactive"
        )
    
    # Calculate pricing
    pricing_breakdowns = calculate_quote_pricing(package, options, pax, agent)
    
    return pricing_breakdowns