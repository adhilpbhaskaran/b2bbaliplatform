import asyncio
import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from database import get_db, Base
from config import get_settings

# Test database URL (SQLite for testing)
TEST_DATABASE_URL = "sqlite:///./test.db"

# Create test engine
engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for testing."""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


def override_get_settings():
    """Override settings for testing."""
    from config import Settings
    return Settings(
        environment="testing",
        database_url=TEST_DATABASE_URL,
        secret_key="test_secret_key",
        debug=True,
        clerk_publishable_key="pk_test_testing",
        clerk_secret_key="sk_test_testing",
        clerk_webhook_secret="whsec_test_testing",
    )


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test."""
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Create session
    session = TestingSessionLocal()
    
    try:
        yield session
    finally:
        session.close()
        # Drop tables after test
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """Create a test client with database override."""
    # Override dependencies
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_settings] = override_get_settings
    
    with TestClient(app) as test_client:
        yield test_client
    
    # Clean up overrides
    app.dependency_overrides.clear()


@pytest.fixture
def sample_user_data():
    """Sample user data for testing."""
    return {
        "clerk_id": "user_test123",
        "email": "test@example.com",
        "first_name": "Test",
        "last_name": "User",
        "role": "agent"
    }


@pytest.fixture
def sample_agent_data():
    """Sample agent data for testing."""
    return {
        "company_name": "Test Travel Agency",
        "phone": "+1234567890",
        "address": "123 Test Street, Test City",
        "license_number": "LIC123456",
        "experience_years": 5,
        "specializations": ["Cultural Tours", "Adventure Travel"]
    }


@pytest.fixture
def sample_package_data():
    """Sample package data for testing."""
    return {
        "name": "Test Package",
        "description": "A test travel package",
        "duration": 3,
        "location": "Test Location",
        "category": "Cultural",
        "base_price": 299.99,
        "inclusions": ["Accommodation", "Meals", "Transportation"],
        "exclusions": ["Flights", "Personal expenses"],
        "highlights": ["Temple visits", "Cultural shows"]
    }


@pytest.fixture
def sample_hotel_data():
    """Sample hotel data for testing."""
    return {
        "name": "Test Hotel",
        "location": "Test Location",
        "star_rating": 4,
        "description": "A test hotel",
        "amenities": ["WiFi", "Pool", "Spa"],
        "room_types": [
            {"type": "Standard", "capacity": 2, "price": 100.0},
            {"type": "Deluxe", "capacity": 3, "price": 150.0}
        ],
        "contact_info": {
            "phone": "+1234567890",
            "email": "test@hotel.com"
        }
    }


@pytest.fixture
def sample_quote_data():
    """Sample quote data for testing."""
    return {
        "customer_name": "John Doe",
        "customer_email": "john@example.com",
        "customer_phone": "+1234567890",
        "travel_dates": {
            "start_date": "2024-06-01",
            "end_date": "2024-06-04"
        },
        "pax_details": {
            "adults": 2,
            "children": 1,
            "infants": 0
        },
        "accommodation_preference": "4-star",
        "special_requests": "Vegetarian meals"
    }


@pytest.fixture
def auth_headers():
    """Mock authentication headers for testing."""
    return {
        "Authorization": "Bearer test_token",
        "X-User-ID": "user_test123",
        "X-User-Role": "agent"
    }


@pytest.fixture
def admin_headers():
    """Mock admin authentication headers for testing."""
    return {
        "Authorization": "Bearer admin_test_token",
        "X-User-ID": "admin_test123",
        "X-User-Role": "admin"
    }


# Async fixtures
@pytest_asyncio.fixture
async def async_client():
    """Create an async test client."""
    from httpx import AsyncClient
    
    # Override dependencies
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_settings] = override_get_settings
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    
    # Clean up overrides
    app.dependency_overrides.clear()


# Helper functions for tests
def create_test_user(db_session, user_data=None):
    """Create a test user in the database."""
    from models import User
    
    if user_data is None:
        user_data = {
            "clerk_id": "user_test123",
            "email": "test@example.com",
            "first_name": "Test",
            "last_name": "User",
            "role": "agent"
        }
    
    user = User(**user_data)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def create_test_agent(db_session, user_id, agent_data=None):
    """Create a test agent in the database."""
    from models import Agent
    
    if agent_data is None:
        agent_data = {
            "user_id": user_id,
            "company_name": "Test Travel Agency",
            "phone": "+1234567890",
            "address": "123 Test Street, Test City",
            "license_number": "LIC123456",
            "experience_years": 5,
            "specializations": ["Cultural Tours", "Adventure Travel"],
            "status": "approved"
        }
    
    agent = Agent(**agent_data)
    db_session.add(agent)
    db_session.commit()
    db_session.refresh(agent)
    return agent


def create_test_package(db_session, package_data=None):
    """Create a test package in the database."""
    from models import Package
    
    if package_data is None:
        package_data = {
            "name": "Test Package",
            "description": "A test travel package",
            "duration": 3,
            "location": "Test Location",
            "category": "Cultural",
            "base_price": 299.99,
            "inclusions": ["Accommodation", "Meals", "Transportation"],
            "exclusions": ["Flights", "Personal expenses"],
            "highlights": ["Temple visits", "Cultural shows"]
        }
    
    package = Package(**package_data)
    db_session.add(package)
    db_session.commit()
    db_session.refresh(package)
    return package