from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from typing import List, Optional
import uuid

from database import get_db
from models import Package, User
from schemas import (
    Package as PackageSchema,
    PackageCreate,
    PackageUpdate,
    PaginatedResponse
)
from middleware.clerk_auth import get_current_user_id, require_role

router = APIRouter()
security = HTTPBearer()

@router.get("/", response_model=PaginatedResponse)
async def list_packages(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    active_only: bool = Query(True)
):
    """List all packages"""
    user_id = get_current_user_id(credentials)
    
    query = db.query(Package)
    
    # Filter by active status unless admin
    user = db.query(User).filter(User.id == user_id).first()
    if user.role != "admin" and active_only:
        query = query.filter(Package.is_active == True)
    
    # Apply filters
    if category:
        query = query.filter(Package.category == category)
    
    if search:
        query = query.filter(
            or_(
                Package.name.ilike(f"%{search}%"),
                Package.description.ilike(f"%{search}%"),
                Package.location.ilike(f"%{search}%")
            )
        )
    
    # Order by name
    query = query.order_by(Package.name)
    
    # Count total
    total = query.count()
    
    # Apply pagination
    packages = query.offset((page - 1) * size).limit(size).all()
    
    return PaginatedResponse(
        items=packages,
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size
    )

@router.get("/categories", response_model=List[str])
async def get_package_categories(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get all package categories"""
    user_id = get_current_user_id(credentials)
    
    categories = db.query(Package.category).distinct().filter(
        Package.category.isnot(None),
        Package.is_active == True
    ).all()
    
    return [cat[0] for cat in categories if cat[0]]

@router.get("/{package_id}", response_model=PackageSchema)
async def get_package(
    package_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get specific package"""
    user_id = get_current_user_id(credentials)
    
    package = db.query(Package).filter(Package.id == package_id).first()
    if not package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Package not found"
        )
    
    # Check if package is active (unless admin)
    user = db.query(User).filter(User.id == user_id).first()
    if user.role != "admin" and not package.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Package not found"
        )
    
    return package

@router.post("/", response_model=PackageSchema)
async def create_package(
    package_data: PackageCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Create new package (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    # Check if package with same name exists
    existing_package = db.query(Package).filter(Package.name == package_data.name).first()
    if existing_package:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Package with this name already exists"
        )
    
    # Create package
    package = Package(
        id=str(uuid.uuid4()),
        **package_data.dict()
    )
    
    db.add(package)
    db.commit()
    db.refresh(package)
    
    return package

@router.put("/{package_id}", response_model=PackageSchema)
async def update_package(
    package_id: str,
    package_update: PackageUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Update package (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    package = db.query(Package).filter(Package.id == package_id).first()
    if not package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Package not found"
        )
    
    # Check if name is being changed and conflicts
    if package_update.name and package_update.name != package.name:
        existing_package = db.query(Package).filter(
            Package.name == package_update.name,
            Package.id != package_id
        ).first()
        if existing_package:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Package with this name already exists"
            )
    
    # Update fields
    update_data = package_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(package, field, value)
    
    db.commit()
    db.refresh(package)
    
    return package

@router.delete("/{package_id}", response_model=dict)
async def delete_package(
    package_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Delete package (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    package = db.query(Package).filter(Package.id == package_id).first()
    if not package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Package not found"
        )
    
    # Soft delete by setting is_active to False
    package.is_active = False
    db.commit()
    
    return {"success": True, "message": "Package deleted successfully"}

@router.post("/{package_id}/activate", response_model=dict)
async def activate_package(
    package_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Activate package (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    package = db.query(Package).filter(Package.id == package_id).first()
    if not package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Package not found"
        )
    
    package.is_active = True
    db.commit()
    
    return {"success": True, "message": "Package activated successfully"}

@router.post("/{package_id}/deactivate", response_model=dict)
async def deactivate_package(
    package_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Deactivate package (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    package = db.query(Package).filter(Package.id == package_id).first()
    if not package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Package not found"
        )
    
    package.is_active = False
    db.commit()
    
    return {"success": True, "message": "Package deactivated successfully"}

@router.get("/popular/top", response_model=List[PackageSchema])
async def get_popular_packages(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    limit: int = Query(10, ge=1, le=50)
):
    """Get popular packages based on booking frequency"""
    user_id = get_current_user_id(credentials)
    
    # For now, return packages ordered by creation date
    # In a real implementation, you'd join with bookings and order by booking count
    packages = db.query(Package).filter(
        Package.is_active == True
    ).order_by(desc(Package.created_at)).limit(limit).all()
    
    return packages

@router.post("/bulk-import", response_model=dict)
async def bulk_import_packages(
    packages_data: List[PackageCreate],
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Bulk import packages (admin only)"""
    # Verify admin role
    require_role("admin")(credentials)
    
    created_count = 0
    skipped_count = 0
    errors = []
    
    for package_data in packages_data:
        try:
            # Check if package already exists
            existing_package = db.query(Package).filter(
                Package.name == package_data.name
            ).first()
            
            if existing_package:
                skipped_count += 1
                continue
            
            # Create package
            package = Package(
                id=str(uuid.uuid4()),
                **package_data.dict()
            )
            
            db.add(package)
            created_count += 1
            
        except Exception as e:
            errors.append(f"Error creating package '{package_data.name}': {str(e)}")
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save packages: {str(e)}"
        )
    
    return {
        "success": True,
        "message": f"Bulk import completed. Created: {created_count}, Skipped: {skipped_count}",
        "created_count": created_count,
        "skipped_count": skipped_count,
        "errors": errors
    }