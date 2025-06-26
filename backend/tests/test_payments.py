import pytest
from datetime import datetime
from decimal import Decimal
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from main import app
from models import Booking, Payment, PaymentStatus, BookingStatus
from schemas import PaymentCreate

client = TestClient(app)


class TestPayments:
    """Test suite for payment processing functionality"""
    
    def test_create_payment_record(self, db_session: Session, sample_booking: Booking):
        """Test creating a new payment record"""
        payment_data = {
            "booking_id": str(sample_booking.id),
            "amount": 500.00,
            "currency": "USD",
            "payment_method": "card"
        }
        
        response = client.post("/api/v1/payments/", json=payment_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data["booking_id"] == payment_data["booking_id"]
        assert data["amount"] == payment_data["amount"]
        assert data["currency"] == payment_data["currency"]
        assert data["status"] == "pending"
    
    @patch('stripe.PaymentIntent.create')
    def test_create_stripe_payment_intent(self, mock_stripe_create, db_session: Session, sample_booking: Booking):
        """Test creating a Stripe payment intent"""
        # Mock Stripe response
        mock_payment_intent = Mock()
        mock_payment_intent.id = "pi_test_123456789"
        mock_payment_intent.client_secret = "pi_test_123456789_secret_test"
        mock_payment_intent.amount = 50000  # $500.00 in cents
        mock_payment_intent.currency = "usd"
        mock_payment_intent.status = "requires_payment_method"
        mock_stripe_create.return_value = mock_payment_intent
        
        payment_data = {
            "booking_id": str(sample_booking.id),
            "amount": 500.00,
            "currency": "USD"
        }
        
        response = client.post("/api/v1/payments/create-payment-intent", json=payment_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["payment_intent_id"] == "pi_test_123456789"
        assert data["client_secret"] == "pi_test_123456789_secret_test"
        assert "payment_id" in data
        
        # Verify Stripe was called with correct parameters
        mock_stripe_create.assert_called_once()
        call_args = mock_stripe_create.call_args[1]
        assert call_args["amount"] == 50000
        assert call_args["currency"] == "usd"
        assert call_args["metadata"]["booking_id"] == str(sample_booking.id)
    
    def test_get_payments_for_booking(self, db_session: Session, sample_booking: Booking):
        """Test retrieving all payments for a specific booking"""
        # Create test payments
        payment1 = Payment(
            booking_id=sample_booking.id,
            amount=Decimal('250.00'),
            currency="USD",
            status=PaymentStatus.COMPLETED,
            payment_method="card",
            stripe_payment_intent_id="pi_test_1"
        )
        
        payment2 = Payment(
            booking_id=sample_booking.id,
            amount=Decimal('250.00'),
            currency="USD",
            status=PaymentStatus.PENDING,
            payment_method="card",
            stripe_payment_intent_id="pi_test_2"
        )
        
        db_session.add_all([payment1, payment2])
        db_session.commit()
        
        response = client.get(f"/api/v1/payments/booking/{sample_booking.id}")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == 2
        
        # Check payment statuses
        statuses = [payment["status"] for payment in data]
        assert "completed" in statuses
        assert "pending" in statuses
    
    def test_get_payment_by_id(self, db_session: Session, sample_booking: Booking):
        """Test retrieving a specific payment by ID"""
        payment = Payment(
            booking_id=sample_booking.id,
            amount=Decimal('500.00'),
            currency="USD",
            status=PaymentStatus.COMPLETED,
            payment_method="card",
            stripe_payment_intent_id="pi_test_123",
            stripe_charge_id="ch_test_123"
        )
        
        db_session.add(payment)
        db_session.commit()
        
        response = client.get(f"/api/v1/payments/{payment.id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == str(payment.id)
        assert data["amount"] == 500.00
        assert data["status"] == "completed"
        assert data["stripe_payment_intent_id"] == "pi_test_123"
    
    def test_update_payment_status(self, db_session: Session, sample_booking: Booking):
        """Test updating payment status"""
        payment = Payment(
            booking_id=sample_booking.id,
            amount=Decimal('500.00'),
            currency="USD",
            status=PaymentStatus.PENDING,
            payment_method="card"
        )
        
        db_session.add(payment)
        db_session.commit()
        
        update_data = {
            "status": "completed",
            "stripe_charge_id": "ch_test_123",
            "payment_date": datetime.utcnow().isoformat()
        }
        
        response = client.put(f"/api/v1/payments/{payment.id}", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "completed"
        assert data["stripe_charge_id"] == "ch_test_123"
        assert data["payment_date"] is not None
    
    @patch('stripe.Refund.create')
    def test_process_refund(self, mock_stripe_refund, db_session: Session, sample_booking: Booking):
        """Test processing a refund through Stripe"""
        # Mock Stripe refund response
        mock_refund = Mock()
        mock_refund.id = "re_test_123456789"
        mock_refund.amount = 25000  # $250.00 in cents
        mock_refund.status = "succeeded"
        mock_stripe_refund.return_value = mock_refund
        
        # Create a completed payment
        payment = Payment(
            booking_id=sample_booking.id,
            amount=Decimal('500.00'),
            currency="USD",
            status=PaymentStatus.COMPLETED,
            payment_method="card",
            stripe_charge_id="ch_test_123"
        )
        
        db_session.add(payment)
        db_session.commit()
        
        refund_data = {
            "amount": 250.00,
            "reason": "Customer request"
        }
        
        response = client.post(f"/api/v1/payments/{payment.id}/refund", json=refund_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["refund_amount"] == 250.00
        assert data["status"] == "refunded"
        
        # Verify Stripe was called
        mock_stripe_refund.assert_called_once()
        call_args = mock_stripe_refund.call_args[1]
        assert call_args["charge"] == "ch_test_123"
        assert call_args["amount"] == 25000
    
    def test_stripe_webhook_payment_succeeded(self, db_session: Session, sample_booking: Booking):
        """Test handling Stripe webhook for successful payment"""
        # Create a pending payment
        payment = Payment(
            booking_id=sample_booking.id,
            amount=Decimal('500.00'),
            currency="USD",
            status=PaymentStatus.PENDING,
            stripe_payment_intent_id="pi_test_123"
        )
        
        db_session.add(payment)
        db_session.commit()
        
        # Mock Stripe webhook event
        webhook_data = {
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_test_123",
                    "amount": 50000,
                    "currency": "usd",
                    "status": "succeeded",
                    "charges": {
                        "data": [
                            {
                                "id": "ch_test_123",
                                "amount": 50000,
                                "status": "succeeded"
                            }
                        ]
                    }
                }
            }
        }
        
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_construct.return_value = webhook_data
            
            response = client.post(
                "/api/v1/payments/stripe-webhook",
                json=webhook_data,
                headers={"stripe-signature": "test_signature"}
            )
            
            assert response.status_code == 200
            
            # Verify payment was updated
            db_session.refresh(payment)
            assert payment.status == PaymentStatus.COMPLETED
            assert payment.stripe_charge_id == "ch_test_123"
    
    def test_stripe_webhook_payment_failed(self, db_session: Session, sample_booking: Booking):
        """Test handling Stripe webhook for failed payment"""
        # Create a pending payment
        payment = Payment(
            booking_id=sample_booking.id,
            amount=Decimal('500.00'),
            currency="USD",
            status=PaymentStatus.PENDING,
            stripe_payment_intent_id="pi_test_123"
        )
        
        db_session.add(payment)
        db_session.commit()
        
        # Mock Stripe webhook event for failed payment
        webhook_data = {
            "type": "payment_intent.payment_failed",
            "data": {
                "object": {
                    "id": "pi_test_123",
                    "status": "requires_payment_method",
                    "last_payment_error": {
                        "message": "Your card was declined."
                    }
                }
            }
        }
        
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_construct.return_value = webhook_data
            
            response = client.post(
                "/api/v1/payments/stripe-webhook",
                json=webhook_data,
                headers={"stripe-signature": "test_signature"}
            )
            
            assert response.status_code == 200
            
            # Verify payment was updated
            db_session.refresh(payment)
            assert payment.status == PaymentStatus.FAILED
            assert "declined" in payment.failure_reason.lower()
    
    def test_payment_validation(self):
        """Test validation of payment data"""
        # Test invalid amount (negative)
        invalid_data = {
            "booking_id": "550e8400-e29b-41d4-a716-446655440010",
            "amount": -100.00,
            "currency": "USD"
        }
        
        response = client.post("/api/v1/payments/", json=invalid_data)
        assert response.status_code == 422
        
        # Test invalid currency
        invalid_data["amount"] = 100.00
        invalid_data["currency"] = "INVALID"
        
        response = client.post("/api/v1/payments/", json=invalid_data)
        assert response.status_code == 422
    
    def test_payment_not_found(self):
        """Test handling of non-existent payment"""
        fake_payment_id = "550e8400-e29b-41d4-a716-446655440999"
        
        response = client.get(f"/api/v1/payments/{fake_payment_id}")
        assert response.status_code == 404
    
    def test_refund_validation(self, db_session: Session, sample_booking: Booking):
        """Test refund amount validation"""
        payment = Payment(
            booking_id=sample_booking.id,
            amount=Decimal('500.00'),
            currency="USD",
            status=PaymentStatus.COMPLETED,
            stripe_charge_id="ch_test_123"
        )
        
        db_session.add(payment)
        db_session.commit()
        
        # Test refund amount greater than payment amount
        refund_data = {
            "amount": 600.00,  # More than payment amount
            "reason": "Test refund"
        }
        
        response = client.post(f"/api/v1/payments/{payment.id}/refund", json=refund_data)
        assert response.status_code == 400
        
        # Test negative refund amount
        refund_data["amount"] = -100.00
        
        response = client.post(f"/api/v1/payments/{payment.id}/refund", json=refund_data)
        assert response.status_code == 422


@pytest.fixture
def sample_booking(db_session: Session) -> Booking:
    """Create a sample booking for testing"""
    from models import Package, Quote, Agent, User
    
    # Create user
    user = User(
        email="test@example.com",
        clerk_id="test_clerk_id",
        role="agent"
    )
    db_session.add(user)
    db_session.flush()
    
    # Create agent
    agent = Agent(
        user_id=user.id,
        company_name="Test Company",
        status="active",
        tier="bronze"
    )
    db_session.add(agent)
    db_session.flush()
    
    # Create package
    package = Package(
        name="Test Package",
        description="A test package",
        duration=4,
        location="Test Location",
        category="Cultural",
        base_price=Decimal('500.00'),
        inclusions=["Test inclusion"],
        exclusions=["Test exclusion"],
        highlights=["Test highlight"],
        is_active=True
    )
    db_session.add(package)
    db_session.flush()
    
    # Create quote
    quote = Quote(
        agent_id=agent.id,
        package_id=package.id,
        pax_count=2,
        travel_date=datetime.utcnow().date(),
        total_price=Decimal('1000.00'),
        status="confirmed"
    )
    db_session.add(quote)
    db_session.flush()
    
    # Create booking
    booking = Booking(
        agent_id=agent.id,
        quote_id=quote.id,
        booking_reference="TEST-BOOK-001",
        customer_name="Test Customer",
        customer_email="customer@example.com",
        customer_phone="+1234567890",
        total_amount=Decimal('1000.00'),
        status=BookingStatus.CONFIRMED,
        payment_status=PaymentStatus.PENDING
    )
    
    db_session.add(booking)
    db_session.commit()
    db_session.refresh(booking)
    
    return booking