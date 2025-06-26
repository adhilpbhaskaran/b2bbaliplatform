from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_, or_
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import uuid

from database import get_db
from models import (
    User, Agent, Admin, Quote, Booking, Package, Hotel, AddOn, TierConfig,
    UserRole, UserStatus, BookingStatus, TierLevel
)
from schemas import (
    User as UserSchema,
    Agent as AgentSchema,
    Admin as AdminSchema,
    Hotel as HotelSchema,
    AddOn as AddOnSchema,
    TierConfig as TierConfigSchema,
    UserCreate,
    AgentUpdate,
    HotelCreate,
    HotelUpdate,
    AddOnCreate,
    AddOnUpdate,
    TierConfigUpdate,
    PaginatedResponse
)
from middleware.clerk_auth import get_current_user_id, require_role

router = APIRouter()
security = HTTPBearer()

# User Management
@router.get("/users", response_model=PaginatedResponse)
async def list_users(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    role: Optional[UserRole] = Query(None),
    search: Optional[str] = Query(None)
):
    """List all users (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    query = db.query(User)
    
    # Apply filters
    if role:
        query = query.filter(User.role == role)
    
    if search:
        query = query.filter(
            or_(
                User.email.ilike(f"%{search}%"),
                User.first_name.ilike(f"%{search}%"),
                User.last_name.ilike(f"%{search}%")
            )
        )
    
    # Order by creation date
    query = query.order_by(desc(User.created_at))
    
    # Count total
    total = query.count()
    
    # Apply pagination
    users = query.offset((page - 1) * size).limit(size).all()
    
    return PaginatedResponse(
        items=users,
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size
    )

@router.get("/users/{user_id}", response_model=UserSchema)
async def get_user(
    user_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get specific user (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user

@router.post("/users", response_model=UserSchema)
async def create_user(
    user_data: UserCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Create new user (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Create user
    user = User(
        id=str(uuid.uuid4()),
        **user_data.dict()
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user

@router.put("/users/{user_id}/role", response_model=dict)
async def update_user_role(
    user_id: str,
    new_role: UserRole,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Update user role (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    old_role = user.role
    user.role = new_role
    
    # If changing to admin, create admin profile
    if new_role == UserRole.ADMIN and old_role != UserRole.ADMIN:
        admin_profile = Admin(
            id=str(uuid.uuid4()),
            user_id=user.id,
            permissions=["all"]  # Default admin permissions
        )
        db.add(admin_profile)
    
    db.commit()
    
    return {
        "success": True,
        "message": f"User role updated from {old_role.value} to {new_role.value}"
    }

@router.delete("/users/{user_id}", response_model=dict)
async def delete_user(
    user_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Delete user (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent self-deletion
    current_user_id = get_current_user_id(credentials)
    if user_id == current_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    # Delete related profiles
    if user.role == UserRole.AGENT:
        agent = db.query(Agent).filter(Agent.user_id == user_id).first()
        if agent:
            db.delete(agent)
    elif user.role == UserRole.ADMIN:
        admin = db.query(Admin).filter(Admin.user_id == user_id).first()
        if admin:
            db.delete(admin)
    
    db.delete(user)
    db.commit()
    
    return {"success": True, "message": "User deleted successfully"}

# Agent Management
@router.get("/agents/pending", response_model=List[AgentSchema])
async def get_pending_agents(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get all pending agent registrations (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    pending_agents = db.query(Agent).filter(
        Agent.status == UserStatus.PENDING
    ).order_by(desc(Agent.created_at)).all()
    
    return pending_agents

@router.post("/agents/{agent_id}/approve", response_model=dict)
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
    
    agent.status = UserStatus.APPROVED
    agent.approved_at = datetime.now()
    
    db.commit()
    
    return {"success": True, "message": "Agent approved successfully"}

@router.post("/agents/{agent_id}/reject", response_model=dict)
async def reject_agent(
    agent_id: str,
    reason: str,
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
    
    agent.status = UserStatus.REJECTED
    # You might want to store the rejection reason in a separate field
    
    db.commit()
    
    return {"success": True, "message": "Agent registration rejected"}

@router.put("/agents/{agent_id}/tier", response_model=dict)
async def update_agent_tier(
    agent_id: str,
    new_tier: TierLevel,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Update agent tier manually (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    old_tier = agent.tier
    agent.tier = new_tier
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Agent tier updated from {old_tier.value if old_tier else 'None'} to {new_tier.value}"
    }

# Hotel Management
@router.get("/hotels", response_model=PaginatedResponse)
async def list_hotels(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None)
):
    """List all hotels (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    query = db.query(Hotel)
    
    if search:
        query = query.filter(
            or_(
                Hotel.name.ilike(f"%{search}%"),
                Hotel.location.ilike(f"%{search}%")
            )
        )
    
    query = query.order_by(Hotel.name)
    
    total = query.count()
    hotels = query.offset((page - 1) * size).limit(size).all()
    
    return PaginatedResponse(
        items=hotels,
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size
    )

@router.post("/hotels", response_model=HotelSchema)
async def create_hotel(
    hotel_data: HotelCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Create new hotel (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    hotel = Hotel(
        id=str(uuid.uuid4()),
        **hotel_data.dict()
    )
    
    db.add(hotel)
    db.commit()
    db.refresh(hotel)
    
    return hotel

@router.put("/hotels/{hotel_id}", response_model=HotelSchema)
async def update_hotel(
    hotel_id: str,
    hotel_update: HotelUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Update hotel (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    hotel = db.query(Hotel).filter(Hotel.id == hotel_id).first()
    if not hotel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hotel not found"
        )
    
    update_data = hotel_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(hotel, field, value)
    
    db.commit()
    db.refresh(hotel)
    
    return hotel

@router.delete("/hotels/{hotel_id}", response_model=dict)
async def delete_hotel(
    hotel_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Delete hotel (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    hotel = db.query(Hotel).filter(Hotel.id == hotel_id).first()
    if not hotel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hotel not found"
        )
    
    db.delete(hotel)
    db.commit()
    
    return {"success": True, "message": "Hotel deleted successfully"}

# Add-on Management
@router.get("/addons", response_model=List[AddOnSchema])
async def list_addons(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """List all add-ons (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    addons = db.query(AddOn).order_by(AddOn.name).all()
    return addons

@router.post("/addons", response_model=AddOnSchema)
async def create_addon(
    addon_data: AddOnCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Create new add-on (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    addon = AddOn(
        id=str(uuid.uuid4()),
        **addon_data.dict()
    )
    
    db.add(addon)
    db.commit()
    db.refresh(addon)
    
    return addon

@router.put("/addons/{addon_id}", response_model=AddOnSchema)
async def update_addon(
    addon_id: str,
    addon_update: AddOnUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Update add-on (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    addon = db.query(AddOn).filter(AddOn.id == addon_id).first()
    if not addon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Add-on not found"
        )
    
    update_data = addon_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(addon, field, value)
    
    db.commit()
    db.refresh(addon)
    
    return addon

@router.delete("/addons/{addon_id}", response_model=dict)
async def delete_addon(
    addon_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Delete add-on (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    addon = db.query(AddOn).filter(AddOn.id == addon_id).first()
    if not addon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Add-on not found"
        )
    
    db.delete(addon)
    db.commit()
    
    return {"success": True, "message": "Add-on deleted successfully"}

# Tier Configuration
@router.get("/tier-config", response_model=List[TierConfigSchema])
async def get_tier_config(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get tier configuration (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    tier_configs = db.query(TierConfig).order_by(TierConfig.tier).all()
    return tier_configs

@router.put("/tier-config/{tier}", response_model=TierConfigSchema)
async def update_tier_config(
    tier: TierLevel,
    config_update: TierConfigUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Update tier configuration (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    tier_config = db.query(TierConfig).filter(TierConfig.tier == tier).first()
    if not tier_config:
        # Create new tier config if it doesn't exist
        tier_config = TierConfig(
            id=str(uuid.uuid4()),
            tier=tier,
            **config_update.dict()
        )
        db.add(tier_config)
    else:
        # Update existing config
        update_data = config_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(tier_config, field, value)
    
    db.commit()
    db.refresh(tier_config)
    
    return tier_config

# System Statistics
@router.get("/stats", response_model=Dict[str, Any])
async def get_system_stats(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get system statistics (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    # User stats
    total_users = db.query(User).count()
    total_agents = db.query(Agent).count()
    active_agents = db.query(Agent).filter(Agent.status == UserStatus.APPROVED).count()
    pending_agents = db.query(Agent).filter(Agent.status == UserStatus.PENDING).count()
    
    # Business stats
    total_quotes = db.query(Quote).count()
    total_bookings = db.query(Booking).count()
    confirmed_bookings = db.query(Booking).filter(
        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED])
    ).count()
    
    # Revenue stats
    total_revenue = db.query(Booking).filter(
        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED])
    ).with_entities(func.sum(Booking.total_amount)).scalar() or 0
    
    # Monthly stats
    month_start = datetime.now().replace(day=1)
    monthly_quotes = db.query(Quote).filter(Quote.created_at >= month_start).count()
    monthly_bookings = db.query(Booking).filter(
        Booking.created_at >= month_start,
        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED])
    ).count()
    
    monthly_revenue = db.query(Booking).filter(
        Booking.created_at >= month_start,
        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED])
    ).with_entities(func.sum(Booking.total_amount)).scalar() or 0
    
    # Content stats
    total_packages = db.query(Package).count()
    active_packages = db.query(Package).filter(Package.is_active == True).count()
    total_hotels = db.query(Hotel).count()
    total_addons = db.query(AddOn).count()
    
    return {
        "users": {
            "total": total_users,
            "agents": total_agents,
            "active_agents": active_agents,
            "pending_agents": pending_agents
        },
        "business": {
            "total_quotes": total_quotes,
            "total_bookings": total_bookings,
            "confirmed_bookings": confirmed_bookings,
            "total_revenue": float(total_revenue),
            "conversion_rate": (confirmed_bookings / total_quotes * 100) if total_quotes > 0 else 0
        },
        "monthly": {
            "quotes": monthly_quotes,
            "bookings": monthly_bookings,
            "revenue": float(monthly_revenue)
        },
        "content": {
            "packages": total_packages,
            "active_packages": active_packages,
            "hotels": total_hotels,
            "addons": total_addons
        }
    }

# Bulk Operations
@router.post("/bulk/approve-agents", response_model=dict)
async def bulk_approve_agents(
    agent_ids: List[str],
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Bulk approve agents (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    approved_count = 0
    errors = []
    
    for agent_id in agent_ids:
        try:
            agent = db.query(Agent).filter(Agent.id == agent_id).first()
            if agent and agent.status == UserStatus.PENDING:
                agent.status = UserStatus.APPROVED
                agent.approved_at = datetime.now()
                approved_count += 1
            elif not agent:
                errors.append(f"Agent {agent_id} not found")
            else:
                errors.append(f"Agent {agent_id} is not pending approval")
        except Exception as e:
            errors.append(f"Error approving agent {agent_id}: {str(e)}")
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to approve agents: {str(e)}"
        )
    
    return {
        "success": True,
        "message": f"Bulk approval completed. Approved: {approved_count}",
        "approved_count": approved_count,
        "errors": errors
    }