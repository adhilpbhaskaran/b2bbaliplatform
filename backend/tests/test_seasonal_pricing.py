import pytest
from datetime import date, datetime
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from main import app
from models import Package, SeasonalRate, SeasonType
from schemas import SeasonalRateCreate, SeasonalRateUpdate

client = TestClient(app)


class TestSeasonalPricing:
    """Test suite for seasonal pricing functionality"""
    
    def test_create_seasonal_rate(self, db_session: Session, sample_package: Package):
        """Test creating a new seasonal rate"""
        seasonal_rate_data = {
            "package_id": str(sample_package.id),
            "season_type": "peak",
            "start_date": "2024-12-15",
            "end_date": "2025-01-15",
            "price_multiplier": 1.5,
            "description": "Christmas and New Year peak season"
        }
        
        response = client.post("/api/v1/seasonal-rates/", json=seasonal_rate_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data["package_id"] == seasonal_rate_data["package_id"]
        assert data["season_type"] == seasonal_rate_data["season_type"]
        assert data["price_multiplier"] == seasonal_rate_data["price_multiplier"]
        assert data["is_active"] is True
    
    def test_get_seasonal_rates_by_package(self, db_session: Session, sample_package: Package):
        """Test retrieving seasonal rates for a specific package"""
        # Create test seasonal rates
        peak_rate = SeasonalRate(
            package_id=sample_package.id,
            season_type=SeasonType.PEAK,
            start_date=date(2024, 12, 15),
            end_date=date(2025, 1, 15),
            price_multiplier=Decimal('1.5'),
            description="Peak season"
        )
        
        low_rate = SeasonalRate(
            package_id=sample_package.id,
            season_type=SeasonType.LOW,
            start_date=date(2024, 6, 1),
            end_date=date(2024, 6, 30),
            price_multiplier=Decimal('0.8'),
            description="Low season"
        )
        
        db_session.add_all([peak_rate, low_rate])
        db_session.commit()
        
        response = client.get(f"/api/v1/seasonal-rates/package/{sample_package.id}")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == 2
        
        # Check that both rates are returned
        season_types = [rate["season_type"] for rate in data]
        assert "peak" in season_types
        assert "low" in season_types
    
    def test_calculate_package_price_with_seasonal_rate(self, db_session: Session, sample_package: Package):
        """Test calculating package price with seasonal multiplier"""
        # Create a peak season rate
        peak_rate = SeasonalRate(
            package_id=sample_package.id,
            season_type=SeasonType.PEAK,
            start_date=date(2024, 12, 15),
            end_date=date(2025, 1, 15),
            price_multiplier=Decimal('1.5'),
            description="Peak season"
        )
        
        db_session.add(peak_rate)
        db_session.commit()
        
        # Test date within peak season
        travel_date = "2024-12-25"
        response = client.get(
            f"/api/v1/seasonal-rates/package/{sample_package.id}/price?travel_date={travel_date}"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        expected_price = float(sample_package.base_price * Decimal('1.5'))
        assert data["final_price"] == expected_price
        assert data["base_price"] == float(sample_package.base_price)
        assert data["price_multiplier"] == 1.5
        assert data["season_type"] == "peak"
    
    def test_calculate_package_price_without_seasonal_rate(self, db_session: Session, sample_package: Package):
        """Test calculating package price when no seasonal rate applies"""
        # Test date with no seasonal rate
        travel_date = "2024-10-15"
        response = client.get(
            f"/api/v1/seasonal-rates/package/{sample_package.id}/price?travel_date={travel_date}"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["final_price"] == float(sample_package.base_price)
        assert data["base_price"] == float(sample_package.base_price)
        assert data["price_multiplier"] == 1.0
        assert data["season_type"] == "regular"
    
    def test_update_seasonal_rate(self, db_session: Session, sample_package: Package):
        """Test updating an existing seasonal rate"""
        # Create a seasonal rate
        seasonal_rate = SeasonalRate(
            package_id=sample_package.id,
            season_type=SeasonType.HIGH,
            start_date=date(2024, 3, 1),
            end_date=date(2024, 5, 31),
            price_multiplier=Decimal('1.2'),
            description="High season"
        )
        
        db_session.add(seasonal_rate)
        db_session.commit()
        
        # Update the seasonal rate
        update_data = {
            "price_multiplier": 1.3,
            "description": "Updated high season pricing"
        }
        
        response = client.put(
            f"/api/v1/seasonal-rates/{seasonal_rate.id}",
            json=update_data
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["price_multiplier"] == 1.3
        assert data["description"] == "Updated high season pricing"
    
    def test_delete_seasonal_rate(self, db_session: Session, sample_package: Package):
        """Test soft deleting a seasonal rate"""
        # Create a seasonal rate
        seasonal_rate = SeasonalRate(
            package_id=sample_package.id,
            season_type=SeasonType.LOW,
            start_date=date(2024, 2, 1),
            end_date=date(2024, 2, 29),
            price_multiplier=Decimal('0.8'),
            description="Low season"
        )
        
        db_session.add(seasonal_rate)
        db_session.commit()
        
        # Delete the seasonal rate
        response = client.delete(f"/api/v1/seasonal-rates/{seasonal_rate.id}")
        assert response.status_code == 200
        
        # Verify it's soft deleted (is_active = False)
        db_session.refresh(seasonal_rate)
        assert seasonal_rate.is_active is False
    
    def test_overlapping_seasonal_rates(self, db_session: Session, sample_package: Package):
        """Test handling of overlapping seasonal rates"""
        # Create first seasonal rate
        first_rate = SeasonalRate(
            package_id=sample_package.id,
            season_type=SeasonType.PEAK,
            start_date=date(2024, 12, 15),
            end_date=date(2025, 1, 15),
            price_multiplier=Decimal('1.5'),
            description="Peak season"
        )
        
        db_session.add(first_rate)
        db_session.commit()
        
        # Try to create overlapping seasonal rate
        overlapping_data = {
            "package_id": str(sample_package.id),
            "season_type": "high",
            "start_date": "2024-12-20",
            "end_date": "2025-01-10",
            "price_multiplier": 1.3,
            "description": "Overlapping season"
        }
        
        response = client.post("/api/v1/seasonal-rates/", json=overlapping_data)
        # Should handle overlapping dates gracefully
        # Implementation may vary - could reject, merge, or prioritize
        assert response.status_code in [201, 400, 409]
    
    def test_seasonal_rate_validation(self):
        """Test validation of seasonal rate data"""
        # Test invalid date range (end before start)
        invalid_data = {
            "package_id": "550e8400-e29b-41d4-a716-446655440010",
            "season_type": "peak",
            "start_date": "2024-12-31",
            "end_date": "2024-12-01",  # End before start
            "price_multiplier": 1.5
        }
        
        response = client.post("/api/v1/seasonal-rates/", json=invalid_data)
        assert response.status_code == 422
        
        # Test invalid price multiplier (negative)
        invalid_data["end_date"] = "2025-01-31"
        invalid_data["price_multiplier"] = -0.5
        
        response = client.post("/api/v1/seasonal-rates/", json=invalid_data)
        assert response.status_code == 422
    
    def test_get_active_seasonal_rates_only(self, db_session: Session, sample_package: Package):
        """Test that only active seasonal rates are returned"""
        # Create active and inactive seasonal rates
        active_rate = SeasonalRate(
            package_id=sample_package.id,
            season_type=SeasonType.PEAK,
            start_date=date(2024, 12, 15),
            end_date=date(2025, 1, 15),
            price_multiplier=Decimal('1.5'),
            is_active=True
        )
        
        inactive_rate = SeasonalRate(
            package_id=sample_package.id,
            season_type=SeasonType.LOW,
            start_date=date(2024, 6, 1),
            end_date=date(2024, 6, 30),
            price_multiplier=Decimal('0.8'),
            is_active=False
        )
        
        db_session.add_all([active_rate, inactive_rate])
        db_session.commit()
        
        response = client.get(f"/api/v1/seasonal-rates/package/{sample_package.id}")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == 1  # Only active rate should be returned
        assert data[0]["season_type"] == "peak"
        assert data[0]["is_active"] is True


@pytest.fixture
def sample_package(db_session: Session) -> Package:
    """Create a sample package for testing"""
    package = Package(
        name="Test Package",
        description="A test package for seasonal pricing",
        duration=4,
        location="Test Location",
        category="Cultural",
        base_price=Decimal('299.00'),
        inclusions=["Test inclusion"],
        exclusions=["Test exclusion"],
        highlights=["Test highlight"],
        is_active=True
    )
    
    db_session.add(package)
    db_session.commit()
    db_session.refresh(package)
    
    return package