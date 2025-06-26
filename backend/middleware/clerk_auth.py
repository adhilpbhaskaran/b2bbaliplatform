import jwt
import requests
from fastapi import HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from typing import Optional, Dict, Any
from config import settings
import logging

logger = logging.getLogger(__name__)

class ClerkAuthError(Exception):
    pass

def get_clerk_jwks():
    """Fetch Clerk's JSON Web Key Set (JWKS)"""
    try:
        response = requests.get(f"https://api.clerk.dev/v1/jwks")
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        logger.error(f"Failed to fetch Clerk JWKS: {e}")
        raise ClerkAuthError("Failed to fetch authentication keys")

def verify_clerk_token(credentials: HTTPAuthorizationCredentials) -> Dict[str, Any]:
    """Verify Clerk JWT token and return user data"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing"
        )
    
    token = credentials.credentials
    
    try:
        # For development, we'll use a simpler verification
        # In production, you should verify against Clerk's JWKS
        
        # Decode without verification for development
        # WARNING: This is not secure for production!
        if settings.ENVIRONMENT == "development":
            # Simple token validation for development
            if token.startswith("dev_"):
                # Mock user data for development
                return {
                    "sub": "user_dev_123",
                    "email": "dev@example.com",
                    "role": "agent"
                }
        
        # For production, implement proper JWT verification
        # jwks = get_clerk_jwks()
        # Verify token signature, expiration, etc.
        
        # Decode the token header to get the key ID
        unverified_header = jwt.get_unverified_header(token)
        
        # For now, we'll decode without verification
        # In production, use proper verification with JWKS
        payload = jwt.decode(
            token, 
            options={"verify_signature": False},  # Disable for development
            algorithms=["RS256"]
        )
        
        return payload
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError as e:
        logger.error(f"Invalid token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )

def get_current_user_id(credentials: HTTPAuthorizationCredentials) -> str:
    """Extract user ID from verified token"""
    payload = verify_clerk_token(credentials)
    user_id = payload.get("sub")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user ID"
        )
    
    return user_id

def require_role(required_role: str):
    """Decorator to require specific role"""
    def decorator(credentials: HTTPAuthorizationCredentials):
        payload = verify_clerk_token(credentials)
        user_role = payload.get("role")
        
        if user_role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {required_role}"
            )
        
        return payload
    
    return decorator