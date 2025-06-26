from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, extract
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

from database import get_db
from models import (
    Agent, Quote, Booking, Package, User,
    QuoteStatus, BookingStatus, TierLevel
)
from schemas import (
    Analytics as AnalyticsSchema,
    AgentAnalytics,
    MonthlyStats
)
from middleware.clerk_auth import get_current_user_id, require_role

router = APIRouter()
security = HTTPBearer()

@router.get("/dashboard", response_model=AnalyticsSchema)
async def get_dashboard_analytics(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    period: str = Query("month", regex="^(week|month|quarter|year)$")
):
    """Get dashboard analytics for current agent"""
    user_id = get_current_user_id(credentials)
    
    # Get agent
    agent = db.query(Agent).filter(Agent.user_id == user_id).first()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent profile not found"
        )
    
    # Calculate date range based on period
    now = datetime.now()
    if period == "week":
        start_date = now - timedelta(days=7)
    elif period == "month":
        start_date = now - relativedelta(months=1)
    elif period == "quarter":
        start_date = now - relativedelta(months=3)
    else:  # year
        start_date = now - relativedelta(years=1)
    
    # Get quotes in period
    quotes_query = db.query(Quote).filter(
        Quote.agent_id == agent.id,
        Quote.created_at >= start_date
    )
    
    total_quotes = quotes_query.count()
    accepted_quotes = quotes_query.filter(Quote.status == QuoteStatus.ACCEPTED).count()
    
    # Get bookings in period
    bookings_query = db.query(Booking).filter(
        Booking.agent_id == agent.id,
        Booking.created_at >= start_date
    )
    
    total_bookings = bookings_query.count()
    confirmed_bookings = bookings_query.filter(
        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED])
    ).count()
    
    # Calculate revenue
    revenue_result = bookings_query.filter(
        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED])
    ).with_entities(func.sum(Booking.total_amount)).scalar()
    
    total_revenue = float(revenue_result) if revenue_result else 0.0
    
    # Calculate pax
    pax_quotes = quotes_query.all()
    total_pax = sum(quote.pax.get("total", 0) for quote in pax_quotes)
    
    # Calculate conversion rates
    quote_conversion_rate = (accepted_quotes / total_quotes * 100) if total_quotes > 0 else 0
    booking_conversion_rate = (confirmed_bookings / total_quotes * 100) if total_quotes > 0 else 0
    
    # Get top packages
    top_packages_query = db.query(
        Package.name,
        func.count(Quote.id).label("quote_count")
    ).join(
        Quote, Quote.package_id == Package.id
    ).filter(
        Quote.agent_id == agent.id,
        Quote.created_at >= start_date
    ).group_by(Package.id, Package.name).order_by(desc("quote_count")).limit(5)
    
    top_packages = [{
        "package_name": row[0],
        "quote_count": row[1]
    } for row in top_packages_query.all()]
    
    return AnalyticsSchema(
        total_quotes=total_quotes,
        accepted_quotes=accepted_quotes,
        total_bookings=total_bookings,
        confirmed_bookings=confirmed_bookings,
        total_revenue=total_revenue,
        total_pax=total_pax,
        quote_conversion_rate=quote_conversion_rate,
        booking_conversion_rate=booking_conversion_rate,
        average_quote_value=total_revenue / confirmed_bookings if confirmed_bookings > 0 else 0,
        top_packages=top_packages,
        period=period
    )

@router.get("/agent/{agent_id}", response_model=AgentAnalytics)
async def get_agent_analytics(
    agent_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get analytics for specific agent (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    # Get monthly stats for last 12 months
    monthly_stats = []
    for i in range(12):
        month_start = datetime.now().replace(day=1) - relativedelta(months=i)
        month_end = month_start + relativedelta(months=1) - timedelta(days=1)
        
        # Quotes for this month
        quotes_count = db.query(Quote).filter(
            Quote.agent_id == agent.id,
            Quote.created_at >= month_start,
            Quote.created_at <= month_end
        ).count()
        
        # Bookings for this month
        bookings_count = db.query(Booking).filter(
            Booking.agent_id == agent.id,
            Booking.created_at >= month_start,
            Booking.created_at <= month_end,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED])
        ).count()
        
        # Revenue for this month
        revenue_result = db.query(Booking).filter(
            Booking.agent_id == agent.id,
            Booking.created_at >= month_start,
            Booking.created_at <= month_end,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED])
        ).with_entities(func.sum(Booking.total_amount)).scalar()
        
        revenue = float(revenue_result) if revenue_result else 0.0
        
        monthly_stats.append(MonthlyStats(
            month=month_start.strftime("%Y-%m"),
            quotes=quotes_count,
            bookings=bookings_count,
            revenue=revenue
        ))
    
    # Reverse to get chronological order
    monthly_stats.reverse()
    
    return AgentAnalytics(
        agent_id=agent.id,
        agent_name=agent.name,
        total_quotes=db.query(Quote).filter(Quote.agent_id == agent.id).count(),
        total_bookings=db.query(Booking).filter(
            Booking.agent_id == agent.id,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED])
        ).count(),
        total_revenue=agent.total_revenue,
        total_pax=agent.total_pax,
        conversion_rate=agent.conversion_rate,
        tier=agent.tier,
        monthly_stats=monthly_stats
    )

@router.get("/overview", response_model=Dict[str, Any])
async def get_platform_overview(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get platform overview analytics (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    # Total counts
    total_agents = db.query(Agent).count()
    active_agents = db.query(Agent).filter(Agent.status == "active").count()
    pending_agents = db.query(Agent).filter(Agent.status == "pending").count()
    
    total_quotes = db.query(Quote).count()
    total_bookings = db.query(Booking).count()
    confirmed_bookings = db.query(Booking).filter(
        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED])
    ).count()
    
    # Revenue
    total_revenue_result = db.query(Booking).filter(
        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED])
    ).with_entities(func.sum(Booking.total_amount)).scalar()
    
    total_revenue = float(total_revenue_result) if total_revenue_result else 0.0
    
    # This month stats
    month_start = datetime.now().replace(day=1)
    
    monthly_quotes = db.query(Quote).filter(Quote.created_at >= month_start).count()
    monthly_bookings = db.query(Booking).filter(
        Booking.created_at >= month_start,
        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED])
    ).count()
    
    monthly_revenue_result = db.query(Booking).filter(
        Booking.created_at >= month_start,
        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED])
    ).with_entities(func.sum(Booking.total_amount)).scalar()
    
    monthly_revenue = float(monthly_revenue_result) if monthly_revenue_result else 0.0
    
    # Tier distribution
    tier_distribution = {}
    for tier in TierLevel:
        count = db.query(Agent).filter(Agent.tier == tier).count()
        tier_distribution[tier.value] = count
    
    # Top performing agents
    top_agents = db.query(
        Agent.id,
        Agent.name,
        Agent.total_revenue,
        Agent.total_pax,
        Agent.conversion_rate,
        Agent.tier
    ).filter(
        Agent.status == "active"
    ).order_by(desc(Agent.total_revenue)).limit(10).all()
    
    top_agents_data = [{
        "id": agent[0],
        "name": agent[1],
        "revenue": float(agent[2]),
        "pax": agent[3],
        "conversion_rate": float(agent[4]),
        "tier": agent[5].value if agent[5] else "bronze"
    } for agent in top_agents]
    
    # Popular packages
    popular_packages = db.query(
        Package.name,
        func.count(Quote.id).label("quote_count")
    ).join(
        Quote, Quote.package_id == Package.id
    ).group_by(Package.id, Package.name).order_by(desc("quote_count")).limit(10).all()
    
    popular_packages_data = [{
        "package_name": pkg[0],
        "quote_count": pkg[1]
    } for pkg in popular_packages]
    
    return {
        "total_agents": total_agents,
        "active_agents": active_agents,
        "pending_agents": pending_agents,
        "total_quotes": total_quotes,
        "total_bookings": total_bookings,
        "confirmed_bookings": confirmed_bookings,
        "total_revenue": total_revenue,
        "monthly_quotes": monthly_quotes,
        "monthly_bookings": monthly_bookings,
        "monthly_revenue": monthly_revenue,
        "conversion_rate": (confirmed_bookings / total_quotes * 100) if total_quotes > 0 else 0,
        "tier_distribution": tier_distribution,
        "top_agents": top_agents_data,
        "popular_packages": popular_packages_data
    }

@router.get("/trends", response_model=Dict[str, Any])
async def get_trends(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    period: str = Query("month", regex="^(week|month|quarter)$"),
    agent_id: Optional[str] = Query(None)
):
    """Get trend data for charts"""
    user_id = get_current_user_id(credentials)
    
    # Check permissions
    user = db.query(User).filter(User.id == user_id).first()
    if agent_id and user.role != "admin":
        # Non-admin users can only view their own data
        agent = db.query(Agent).filter(Agent.user_id == user_id).first()
        if not agent or agent.id != agent_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    elif not agent_id and user.role != "admin":
        # Get current agent's data
        agent = db.query(Agent).filter(Agent.user_id == user_id).first()
        if agent:
            agent_id = agent.id
    
    # Determine periods to analyze
    if period == "week":
        periods = 12  # Last 12 weeks
        delta = timedelta(weeks=1)
        format_str = "%Y-W%U"
    elif period == "month":
        periods = 12  # Last 12 months
        delta = relativedelta(months=1)
        format_str = "%Y-%m"
    else:  # quarter
        periods = 8  # Last 8 quarters
        delta = relativedelta(months=3)
        format_str = "%Y-Q"
    
    trends_data = []
    
    for i in range(periods):
        if period == "week":
            period_start = datetime.now() - timedelta(weeks=i+1)
            period_end = period_start + timedelta(weeks=1)
            period_label = period_start.strftime(format_str)
        elif period == "month":
            period_start = datetime.now().replace(day=1) - relativedelta(months=i)
            period_end = period_start + relativedelta(months=1) - timedelta(days=1)
            period_label = period_start.strftime(format_str)
        else:  # quarter
            current_quarter = (datetime.now().month - 1) // 3
            quarter_start_month = current_quarter * 3 + 1
            period_start = datetime.now().replace(month=quarter_start_month, day=1) - relativedelta(months=i*3)
            period_end = period_start + relativedelta(months=3) - timedelta(days=1)
            quarter_num = (period_start.month - 1) // 3 + 1
            period_label = f"{period_start.year}-Q{quarter_num}"
        
        # Build base queries
        quotes_query = db.query(Quote).filter(
            Quote.created_at >= period_start,
            Quote.created_at <= period_end
        )
        
        bookings_query = db.query(Booking).filter(
            Booking.created_at >= period_start,
            Booking.created_at <= period_end
        )
        
        # Filter by agent if specified
        if agent_id:
            quotes_query = quotes_query.filter(Quote.agent_id == agent_id)
            bookings_query = bookings_query.filter(Booking.agent_id == agent_id)
        
        # Get counts
        quotes_count = quotes_query.count()
        bookings_count = bookings_query.filter(
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED])
        ).count()
        
        # Get revenue
        revenue_result = bookings_query.filter(
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED])
        ).with_entities(func.sum(Booking.total_amount)).scalar()
        
        revenue = float(revenue_result) if revenue_result else 0.0
        
        trends_data.append({
            "period": period_label,
            "quotes": quotes_count,
            "bookings": bookings_count,
            "revenue": revenue,
            "conversion_rate": (bookings_count / quotes_count * 100) if quotes_count > 0 else 0
        })
    
    # Reverse to get chronological order
    trends_data.reverse()
    
    return {
        "period_type": period,
        "data": trends_data
    }

@router.get("/export", response_model=Dict[str, Any])
async def export_analytics(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    agent_id: Optional[str] = Query(None)
):
    """Export analytics data (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    # Parse dates
    if start_date:
        start_dt = datetime.fromisoformat(start_date)
    else:
        start_dt = datetime.now() - relativedelta(months=3)
    
    if end_date:
        end_dt = datetime.fromisoformat(end_date)
    else:
        end_dt = datetime.now()
    
    # Build queries
    quotes_query = db.query(Quote).filter(
        Quote.created_at >= start_dt,
        Quote.created_at <= end_dt
    )
    
    bookings_query = db.query(Booking).filter(
        Booking.created_at >= start_dt,
        Booking.created_at <= end_dt
    )
    
    if agent_id:
        quotes_query = quotes_query.filter(Quote.agent_id == agent_id)
        bookings_query = bookings_query.filter(Booking.agent_id == agent_id)
    
    # Get detailed data
    quotes_data = []
    for quote in quotes_query.all():
        quotes_data.append({
            "id": quote.id,
            "agent_name": quote.agent.name if quote.agent else "Unknown",
            "package_name": quote.package.name if quote.package else "Unknown",
            "pax_total": quote.pax.get("total", 0),
            "total_price": float(quote.total_price),
            "status": quote.status.value,
            "created_at": quote.created_at.isoformat()
        })
    
    bookings_data = []
    for booking in bookings_query.all():
        bookings_data.append({
            "id": booking.id,
            "booking_reference": booking.booking_reference,
            "agent_name": booking.agent.name if booking.agent else "Unknown",
            "total_amount": float(booking.total_amount),
            "paid_amount": float(booking.paid_amount),
            "status": booking.status.value,
            "payment_status": booking.payment_status,
            "created_at": booking.created_at.isoformat()
        })
    
    return {
        "export_date": datetime.now().isoformat(),
        "period": {
            "start": start_dt.isoformat(),
            "end": end_dt.isoformat()
        },
        "quotes": quotes_data,
        "bookings": bookings_data,
        "summary": {
            "total_quotes": len(quotes_data),
            "total_bookings": len(bookings_data),
            "total_revenue": sum(b["total_amount"] for b in bookings_data)
        }
    }