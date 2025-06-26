from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Dict, Any

from database import get_db
from models import User, Agent, Admin
from schemas import User as UserSchema, Agent as AgentSchema
from middleware.clerk_auth import verify_clerk_token, get_current_user_id
import uuid

router = APIRouter()
security = HTTPBearer()

@router.post("/verify", response_model=Dict[str, Any])
async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Verify Clerk token and return user info"""
    try:
        payload = verify_clerk_token(credentials)
        user_id = payload.get("sub")
        email = payload.get("email")
        
        # Check if user exists in our database
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            # Create new user if doesn't exist
            user = User(
                id=user_id,
                email=email,
                role="agent",  # Default role
                status="pending"  # Requires admin approval
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        # Get additional profile data
        profile_data = None
        if user.role == "agent" and user.agent_profile:
            profile_data = user.agent_profile
        elif user.role == "admin" and user.admin_profile:
            profile_data = user.admin_profile
        
        return {
            "success": True,
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.role,
                "status": user.status,
                "profile": profile_data
            },
            "token_valid": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication error: {str(e)}"
        )

@router.get("/me", response_model=UserSchema)
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get current authenticated user"""
    user_id = get_current_user_id(credentials)
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user

@router.get("/profile", response_model=Dict[str, Any])
async def get_user_profile(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get user profile with role-specific data"""
    user_id = get_current_user_id(credentials)
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    profile_data = {
        "user": user,
        "profile": None
    }
    
    if user.role == "agent":
        agent = db.query(Agent).filter(Agent.user_id == user_id).first()
        profile_data["profile"] = agent
    elif user.role == "admin":
        admin = db.query(Admin).filter(Admin.user_id == user_id).first()
        profile_data["profile"] = admin
    
    return profile_data

@router.post("/logout")
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Logout user (client-side token removal)"""
    # Since we're using Clerk, logout is handled client-side
    # This endpoint can be used for any server-side cleanup if needed
    return {
        "success": True,
        "message": "Logged out successfully"
    }

@router.post("/refresh")
async def refresh_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Refresh token (handled by Clerk client-side)"""
    # Verify current token is valid
    payload = verify_clerk_token(credentials)
    
    return {
        "success": True,
        "message": "Token is valid",
        "expires_at": payload.get("exp")
    }