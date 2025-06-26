from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from typing import List, Optional
from datetime import datetime, timedelta

from database import get_db
from models import Agent, User, Quote, Booking, TierLevel
from schemas import (
    Agent as AgentSchema,
    AgentCreate,
    AgentUpdate,
    PaginatedResponse,
    AgentAnalytics
)
from middleware.clerk_auth import get_current_user_id, require_role
import uuid

router = APIRouter()
security = HTTPBearer()

# Tier configuration
TIER_CONFIG = {
    TierLevel.BRONZE: {"min_pax": 0, "discount": 5},
    TierLevel.SILVER: {"min_pax": 50, "discount": 10},
    TierLevel.GOLD: {"min_pax": 200, "discount": 15},
    TierLevel.PLATINUM: {"min_pax": 500, "discount": 20}
}

def calculate_tier(total_pax: int) -> TierLevel:
    """Calculate agent tier based on total pax"""
    if total_pax >= 500:
        return TierLevel.PLATINUM
    elif total_pax >= 200:
        return TierLevel.GOLD
    elif total_pax >= 50:
        return TierLevel.SILVER
    else:
        return TierLevel.BRONZE

@router.post("/register", response_model=AgentSchema)
async def register_agent(
    agent_data: AgentCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Register a new agent profile"""
    user_id = get_current_user_id(credentials)
    
    # Check if user exists and is authorized
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if agent profile already exists
    existing_agent = db.query(Agent).filter(Agent.user_id == user_id).first()
    if existing_agent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Agent profile already exists"
        )
    
    # Create agent profile
    agent = Agent(
        id=str(uuid.uuid4()),
        user_id=user_id,
        contact_person=agent_data.contact_person,
        company_name=agent_data.company_name,
        phone=agent_data.phone,
        whatsapp=agent_data.whatsapp,
        country=agent_data.country,
        city=agent_data.city,
        experience=agent_data.experience,
        specialization=agent_data.specialization,
        website=agent_data.website,
        social_media=agent_data.social_media.dict() if agent_data.social_media else None,
        business_license=agent_data.business_license,
        tier=TierLevel.BRONZE,
        total_pax=0,
        pax_this_month=0,
        total_revenue=0.0,
        conversion_rate=0.0,
        preferences=agent_data.preferences.dict() if agent_data.preferences else {
            "currency": "USD",
            "timezone": "Asia/Jakarta",
            "notifications": {"email": True, "whatsapp": True, "sms": False}
        }
    )
    
    db.add(agent)
    db.commit()
    db.refresh(agent)
    
    return agent

@router.get("/me", response_model=AgentSchema)
async def get_my_profile(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get current agent's profile"""
    user_id = get_current_user_id(credentials)
    
    agent = db.query(Agent).filter(Agent.user_id == user_id).first()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent profile not found"
        )
    
    return agent

@router.put("/me", response_model=AgentSchema)
async def update_my_profile(
    agent_update: AgentUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Update current agent's profile"""
    user_id = get_current_user_id(credentials)
    
    agent = db.query(Agent).filter(Agent.user_id == user_id).first()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent profile not found"
        )
    
    # Update fields
    update_data = agent_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field == "social_media" and value:
            setattr(agent, field, value.dict())
        elif field == "preferences" and value:
            setattr(agent, field, value.dict())
        else:
            setattr(agent, field, value)
    
    db.commit()
    db.refresh(agent)
    
    return agent

@router.get("/analytics", response_model=AgentAnalytics)
async def get_agent_analytics(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get agent analytics and performance data"""
    user_id = get_current_user_id(credentials)
    
    agent = db.query(Agent).filter(Agent.user_id == user_id).first()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent profile not found"
        )
    
    # Calculate analytics
    total_quotes = db.query(Quote).filter(Quote.agent_id == agent.id).count()
    total_bookings = db.query(Booking).filter(Booking.agent_id == agent.id).count()
    
    # Monthly stats (last 12 months)
    monthly_stats = {}
    for i in range(12):
        month_start = datetime.now().replace(day=1) - timedelta(days=30*i)
        month_end = month_start + timedelta(days=30)
        
        month_quotes = db.query(Quote).filter(
            Quote.agent_id == agent.id,
            Quote.created_at >= month_start,
            Quote.created_at < month_end
        ).count()
        
        month_bookings = db.query(Booking).filter(
            Booking.agent_id == agent.id,
            Booking.created_at >= month_start,
            Booking.created_at < month_end
        ).count()
        
        monthly_stats[month_start.strftime("%Y-%m")] = {
            "quotes": month_quotes,
            "bookings": month_bookings
        }
    
    # Tier progress
    current_tier = agent.tier
    next_tier_config = None
    
    if current_tier == TierLevel.BRONZE:
        next_tier_config = TIER_CONFIG[TierLevel.SILVER]
    elif current_tier == TierLevel.SILVER:
        next_tier_config = TIER_CONFIG[TierLevel.GOLD]
    elif current_tier == TierLevel.GOLD:
        next_tier_config = TIER_CONFIG[TierLevel.PLATINUM]
    
    tier_progress = {
        "current_tier": current_tier,
        "current_pax": agent.total_pax,
        "next_tier_min_pax": next_tier_config["min_pax"] if next_tier_config else None,
        "progress_percentage": min(100, (agent.total_pax / next_tier_config["min_pax"]) * 100) if next_tier_config else 100
    }
    
    return AgentAnalytics(
        total_quotes=total_quotes,
        total_bookings=total_bookings,
        total_revenue=agent.total_revenue,
        conversion_rate=agent.conversion_rate,
        monthly_stats=monthly_stats,
        tier_progress=tier_progress
    )

@router.get("/", response_model=PaginatedResponse)
async def list_agents(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    tier: Optional[TierLevel] = Query(None),
    status: Optional[str] = Query(None)
):
    """List all agents (admin only)"""
    # Verify admin role
    payload = require_role("admin")(credentials)
    
    query = db.query(Agent).join(User)
    
    # Apply filters
    if search:
        query = query.filter(
            (Agent.company_name.ilike(f"%{search}%")) |
            (Agent.contact_person.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%"))
        )
    
    if tier:
        query = query.filter(Agent.tier == tier)
    
    if status:
        query = query.filter(User.status == status)
    
    # Count total
    total = query.count()
    
    # Apply pagination
    agents = query.offset((page - 1) * size).limit(size).all()
    
    return PaginatedResponse(
        items=agents,
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size
    )

@router.get("/{agent_id}", response_model=AgentSchema)
async def get_agent(
    agent_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get specific agent (admin only or own profile)"""
    user_id = get_current_user_id(credentials)
    
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    # Check if user can access this agent
    user = db.query(User).filter(User.id == user_id).first()
    if user.role != "admin" and agent.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return agent

@router.put("/{agent_id}/tier", response_model=AgentSchema)
async def update_agent_tier(
    agent_id: str,
    tier: TierLevel,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Update agent tier (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    agent.tier = tier
    db.commit()
    db.refresh(agent)
    
    return agent

@router.post("/{agent_id}/approve", response_model=dict)
async def approve_agent(
    agent_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Approve agent registration (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    # Update user status
    user = db.query(User).filter(User.id == agent.user_id).first()
    user.status = "approved"
    
    db.commit()
    
    return {"success": True, "message": "Agent approved successfully"}

@router.post("/{agent_id}/reject", response_model=dict)
async def reject_agent(
    agent_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Reject agent registration (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    # Update user status
    user = db.query(User).filter(User.id == agent.user_id).first()
    user.status = "rejected"
    
    db.commit()
    
    return {"success": True, "message": "Agent rejected"}