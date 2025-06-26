from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
import uvicorn
import os
from datetime import datetime, timedelta

from database import get_db, engine
from models import Base
from routers import auth, agents, quotes, bookings, packages, analytics, admin, seasonal_rates, payments
from config import settings
from middleware.clerk_auth import verify_clerk_token

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Bali Malayali DMC API",
    description="Backend API for Bali Malayali DMC B2B Travel Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://localhost:3000",
        "http://127.0.0.1:3000",
        settings.FRONTEND_URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(agents.router, prefix="/api/agents", tags=["Agents"])
app.include_router(quotes.router, prefix="/api/quotes", tags=["Quotes"])
app.include_router(bookings.router, prefix="/api/bookings", tags=["Bookings"])
app.include_router(packages.router, prefix="/api/packages", tags=["Packages"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(seasonal_rates.router, prefix="/api", tags=["Seasonal Rates"])
app.include_router(payments.router, prefix="/api", tags=["Payments"])

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )