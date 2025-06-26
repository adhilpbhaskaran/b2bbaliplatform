from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import uuid
import stripe
import os

from ..database import get_db
from ..models import Payment, Booking, PaymentStatus
from ..schemas import PaymentCreate, PaymentUpdate, Payment as PaymentSchema

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

router = APIRouter(prefix="/payments", tags=["payments"])

@router.post("/", response_model=PaymentSchema)
def create_payment(
    payment: PaymentCreate,
    db: Session = Depends(get_db)
):
    """Create a new payment record"""
    
    # Verify booking exists
    booking = db.query(Booking).filter(Booking.id == payment.booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Create payment record
    db_payment = Payment(
        id=str(uuid.uuid4()),
        **payment.dict()
    )
    
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    
    return db_payment

@router.post("/stripe/create-payment-intent")
def create_stripe_payment_intent(
    booking_id: str,
    amount: float,
    currency: str = "usd",
    db: Session = Depends(get_db)
):
    """Create a Stripe payment intent"""
    
    # Verify booking exists
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    try:
        # Create Stripe payment intent
        intent = stripe.PaymentIntent.create(
            amount=int(amount * 100),  # Stripe expects amount in cents
            currency=currency,
            metadata={
                "booking_id": booking_id,
                "booking_reference": booking.booking_reference
            }
        )
        
        # Create payment record
        payment = Payment(
            id=str(uuid.uuid4()),
            booking_id=booking_id,
            amount=amount,
            currency=currency,
            payment_method="stripe",
            payment_intent_id=intent.id,
            status=PaymentStatus.PENDING
        )
        
        db.add(payment)
        db.commit()
        db.refresh(payment)
        
        return {
            "payment_id": payment.id,
            "client_secret": intent.client_secret,
            "payment_intent_id": intent.id
        }
        
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )

@router.post("/stripe/webhook")
def stripe_webhook(
    request: dict,
    db: Session = Depends(get_db)
):
    """Handle Stripe webhook events"""
    
    event_type = request.get("type")
    
    if event_type == "payment_intent.succeeded":
        payment_intent = request["data"]["object"]
        payment_intent_id = payment_intent["id"]
        
        # Find payment record
        payment = db.query(Payment).filter(
            Payment.payment_intent_id == payment_intent_id
        ).first()
        
        if payment:
            # Update payment status
            payment.status = PaymentStatus.COMPLETED
            payment.payment_date = datetime.utcnow()
            payment.transaction_id = payment_intent.get("charges", {}).get("data", [{}])[0].get("id")
            
            # Update booking payment status
            booking = db.query(Booking).filter(Booking.id == payment.booking_id).first()
            if booking:
                booking.paid_amount += payment.amount
                if booking.paid_amount >= booking.total_amount:
                    booking.payment_status = PaymentStatus.COMPLETED
                else:
                    booking.payment_status = PaymentStatus.PARTIALLY_PAID
            
            db.commit()
    
    elif event_type == "payment_intent.payment_failed":
        payment_intent = request["data"]["object"]
        payment_intent_id = payment_intent["id"]
        
        # Find payment record
        payment = db.query(Payment).filter(
            Payment.payment_intent_id == payment_intent_id
        ).first()
        
        if payment:
            payment.status = PaymentStatus.FAILED
            payment.failure_reason = payment_intent.get("last_payment_error", {}).get("message")
            db.commit()
    
    return {"status": "success"}

@router.get("/booking/{booking_id}", response_model=List[PaymentSchema])
def get_booking_payments(
    booking_id: str,
    db: Session = Depends(get_db)
):
    """Get all payments for a booking"""
    
    payments = db.query(Payment).filter(Payment.booking_id == booking_id).all()
    return payments

@router.get("/{payment_id}", response_model=PaymentSchema)
def get_payment(
    payment_id: str,
    db: Session = Depends(get_db)
):
    """Get a specific payment by ID"""
    
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    return payment

@router.put("/{payment_id}", response_model=PaymentSchema)
def update_payment(
    payment_id: str,
    payment_update: PaymentUpdate,
    db: Session = Depends(get_db)
):
    """Update a payment record"""
    
    db_payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not db_payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    # Update fields
    update_data = payment_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_payment, field, value)
    
    # If payment status is being updated to completed, update booking
    if update_data.get('status') == PaymentStatus.COMPLETED:
        booking = db.query(Booking).filter(Booking.id == db_payment.booking_id).first()
        if booking:
            booking.paid_amount += db_payment.amount
            if booking.paid_amount >= booking.total_amount:
                booking.payment_status = PaymentStatus.COMPLETED
            else:
                booking.payment_status = PaymentStatus.PARTIALLY_PAID
    
    db.commit()
    db.refresh(db_payment)
    
    return db_payment

@router.post("/refund/{payment_id}")
def refund_payment(
    payment_id: str,
    amount: Optional[float] = None,
    reason: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Process a refund for a payment"""
    
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    if payment.status != PaymentStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only refund completed payments"
        )
    
    refund_amount = amount or payment.amount
    
    try:
        if payment.payment_method == "stripe" and payment.payment_intent_id:
            # Process Stripe refund
            refund = stripe.Refund.create(
                payment_intent=payment.payment_intent_id,
                amount=int(refund_amount * 100),
                reason=reason or "requested_by_customer"
            )
            
            # Update payment status
            if refund_amount == payment.amount:
                payment.status = PaymentStatus.REFUNDED
            else:
                payment.status = PaymentStatus.PARTIALLY_PAID
            
            # Update booking
            booking = db.query(Booking).filter(Booking.id == payment.booking_id).first()
            if booking:
                booking.paid_amount -= refund_amount
                if booking.paid_amount <= 0:
                    booking.payment_status = PaymentStatus.REFUNDED
                else:
                    booking.payment_status = PaymentStatus.PARTIALLY_PAID
            
            db.commit()
            
            return {
                "refund_id": refund.id,
                "amount": refund_amount,
                "status": "success"
            }
        
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Refund not supported for this payment method"
            )
            
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Refund failed: {str(e)}"
        )