from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
import uuid

from ..database import get_db
from ..models import SeasonalRate, Package
from ..schemas import SeasonalRateCreate, SeasonalRateUpdate, SeasonalRate as SeasonalRateSchema

router = APIRouter(prefix="/seasonal-rates", tags=["seasonal-rates"])

@router.post("/", response_model=SeasonalRateSchema)
def create_seasonal_rate(
    seasonal_rate: SeasonalRateCreate,
    db: Session = Depends(get_db)
):
    """Create a new seasonal rate for a package"""
    
    # Verify package exists
    package = db.query(Package).filter(Package.id == seasonal_rate.package_id).first()
    if not package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Package not found"
        )
    
    # Validate date range
    if seasonal_rate.start_date >= seasonal_rate.end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start date must be before end date"
        )
    
    # Check for overlapping seasonal rates
    overlapping_rate = db.query(SeasonalRate).filter(
        SeasonalRate.package_id == seasonal_rate.package_id,
        SeasonalRate.is_active == True,
        SeasonalRate.start_date <= seasonal_rate.end_date,
        SeasonalRate.end_date >= seasonal_rate.start_date
    ).first()
    
    if overlapping_rate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Seasonal rate overlaps with existing rate: {overlapping_rate.season_name}"
        )
    
    # Create new seasonal rate
    db_seasonal_rate = SeasonalRate(
        id=str(uuid.uuid4()),
        **seasonal_rate.dict()
    )
    
    db.add(db_seasonal_rate)
    db.commit()
    db.refresh(db_seasonal_rate)
    
    return db_seasonal_rate

@router.get("/", response_model=List[SeasonalRateSchema])
def get_seasonal_rates(
    package_id: Optional[str] = None,
    active_only: bool = True,
    current_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """Get seasonal rates with optional filters"""
    
    query = db.query(SeasonalRate)
    
    if package_id:
        query = query.filter(SeasonalRate.package_id == package_id)
    
    if active_only:
        query = query.filter(SeasonalRate.is_active == True)
    
    if current_date:
        query = query.filter(
            SeasonalRate.start_date <= current_date,
            SeasonalRate.end_date >= current_date
        )
    
    return query.order_by(SeasonalRate.start_date).all()

@router.get("/{seasonal_rate_id}", response_model=SeasonalRateSchema)
def get_seasonal_rate(
    seasonal_rate_id: str,
    db: Session = Depends(get_db)
):
    """Get a specific seasonal rate by ID"""
    
    seasonal_rate = db.query(SeasonalRate).filter(SeasonalRate.id == seasonal_rate_id).first()
    if not seasonal_rate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seasonal rate not found"
        )
    
    return seasonal_rate

@router.put("/{seasonal_rate_id}", response_model=SeasonalRateSchema)
def update_seasonal_rate(
    seasonal_rate_id: str,
    seasonal_rate_update: SeasonalRateUpdate,
    db: Session = Depends(get_db)
):
    """Update a seasonal rate"""
    
    db_seasonal_rate = db.query(SeasonalRate).filter(SeasonalRate.id == seasonal_rate_id).first()
    if not db_seasonal_rate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seasonal rate not found"
        )
    
    # Update fields
    update_data = seasonal_rate_update.dict(exclude_unset=True)
    
    # Validate date range if dates are being updated
    start_date = update_data.get('start_date', db_seasonal_rate.start_date)
    end_date = update_data.get('end_date', db_seasonal_rate.end_date)
    
    if start_date >= end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start date must be before end date"
        )
    
    for field, value in update_data.items():
        setattr(db_seasonal_rate, field, value)
    
    db.commit()
    db.refresh(db_seasonal_rate)
    
    return db_seasonal_rate

@router.delete("/{seasonal_rate_id}")
def delete_seasonal_rate(
    seasonal_rate_id: str,
    db: Session = Depends(get_db)
):
    """Delete a seasonal rate (soft delete by setting is_active to False)"""
    
    db_seasonal_rate = db.query(SeasonalRate).filter(SeasonalRate.id == seasonal_rate_id).first()
    if not db_seasonal_rate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seasonal rate not found"
        )
    
    db_seasonal_rate.is_active = False
    db.commit()
    
    return {"message": "Seasonal rate deleted successfully"}

@router.get("/package/{package_id}/calculate-price")
def calculate_seasonal_price(
    package_id: str,
    travel_date: date,
    db: Session = Depends(get_db)
):
    """Calculate the price for a package on a specific travel date"""
    
    # Get package
    package = db.query(Package).filter(Package.id == package_id).first()
    if not package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Package not found"
        )
    
    # Find applicable seasonal rate
    seasonal_rate = db.query(SeasonalRate).filter(
        SeasonalRate.package_id == package_id,
        SeasonalRate.is_active == True,
        SeasonalRate.start_date <= travel_date,
        SeasonalRate.end_date >= travel_date
    ).first()
    
    base_price = package.base_price
    
    if seasonal_rate:
        if seasonal_rate.fixed_price:
            final_price = seasonal_rate.fixed_price
        else:
            final_price = base_price * seasonal_rate.price_multiplier
        
        return {
            "package_id": package_id,
            "travel_date": travel_date,
            "base_price": base_price,
            "seasonal_rate": {
                "id": seasonal_rate.id,
                "season_name": seasonal_rate.season_name,
                "season_type": seasonal_rate.season_type,
                "price_multiplier": seasonal_rate.price_multiplier,
                "fixed_price": seasonal_rate.fixed_price
            },
            "final_price": final_price
        }
    else:
        return {
            "package_id": package_id,
            "travel_date": travel_date,
            "base_price": base_price,
            "seasonal_rate": None,
            "final_price": base_price
        }