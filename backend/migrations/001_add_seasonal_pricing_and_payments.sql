-- Migration: Add Seasonal Pricing and Payment Processing
-- Version: 001
-- Date: 2024-12-19
-- Description: Adds seasonal_rates and payments tables with proper relationships

-- Create SeasonType enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE seasontype AS ENUM ('peak', 'high', 'regular', 'low');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create PaymentStatus enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE paymentstatus AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create seasonal_rates table
CREATE TABLE IF NOT EXISTS seasonal_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    season_type seasontype NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    price_multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT seasonal_rates_valid_dates CHECK (end_date >= start_date),
    CONSTRAINT seasonal_rates_valid_multiplier CHECK (price_multiplier > 0),
    CONSTRAINT seasonal_rates_unique_package_season UNIQUE (package_id, season_type, start_date, end_date)
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status paymentstatus NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(50),
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_charge_id VARCHAR(255),
    transaction_fee DECIMAL(10,2) DEFAULT 0.00,
    refund_amount DECIMAL(10,2) DEFAULT 0.00,
    payment_date TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT payments_valid_amount CHECK (amount > 0),
    CONSTRAINT payments_valid_refund CHECK (refund_amount >= 0 AND refund_amount <= amount),
    CONSTRAINT payments_valid_fee CHECK (transaction_fee >= 0)
);

-- Update bookings table to use PaymentStatus enum
DO $$ 
BEGIN
    -- Check if payment_status column exists and is not already an enum
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'payment_status' 
        AND data_type != 'USER-DEFINED'
    ) THEN
        -- Add new enum column
        ALTER TABLE bookings ADD COLUMN payment_status_new paymentstatus DEFAULT 'pending';
        
        -- Update values based on existing string values
        UPDATE bookings SET payment_status_new = 
            CASE 
                WHEN payment_status = 'pending' THEN 'pending'::paymentstatus
                WHEN payment_status = 'processing' THEN 'processing'::paymentstatus
                WHEN payment_status = 'completed' THEN 'completed'::paymentstatus
                WHEN payment_status = 'failed' THEN 'failed'::paymentstatus
                WHEN payment_status = 'cancelled' THEN 'cancelled'::paymentstatus
                WHEN payment_status = 'refunded' THEN 'refunded'::paymentstatus
                ELSE 'pending'::paymentstatus
            END;
        
        -- Drop old column and rename new one
        ALTER TABLE bookings DROP COLUMN payment_status;
        ALTER TABLE bookings RENAME COLUMN payment_status_new TO payment_status;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_seasonal_rates_package_id ON seasonal_rates(package_id);
CREATE INDEX IF NOT EXISTS idx_seasonal_rates_season_type ON seasonal_rates(season_type);
CREATE INDEX IF NOT EXISTS idx_seasonal_rates_dates ON seasonal_rates(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_seasonal_rates_active ON seasonal_rates(is_active);
CREATE INDEX IF NOT EXISTS idx_seasonal_rates_package_active ON seasonal_rates(package_id, is_active);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_intent ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_charge ON payments(stripe_charge_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_seasonal_rates_updated_at ON seasonal_rates;
CREATE TRIGGER update_seasonal_rates_updated_at
    BEFORE UPDATE ON seasonal_rates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample seasonal rates data
INSERT INTO seasonal_rates (id, package_id, season_type, start_date, end_date, price_multiplier, description, is_active) VALUES
-- Peak Season (December - January, July - August)
('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440010', 'peak', '2024-12-15', '2025-01-15', 1.5, 'Christmas and New Year peak season', true),
('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440010', 'peak', '2024-07-01', '2024-08-31', 1.4, 'Summer holiday peak season', true),

('550e8400-e29b-41d4-a716-446655440042', '550e8400-e29b-41d4-a716-446655440011', 'peak', '2024-12-15', '2025-01-15', 1.5, 'Christmas and New Year peak season', true),
('550e8400-e29b-41d4-a716-446655440043', '550e8400-e29b-41d4-a716-446655440011', 'peak', '2024-07-01', '2024-08-31', 1.4, 'Summer holiday peak season', true),

-- High Season (March - May, September - November)
('550e8400-e29b-41d4-a716-446655440044', '550e8400-e29b-41d4-a716-446655440010', 'high', '2024-03-01', '2024-05-31', 1.2, 'Spring high season', true),
('550e8400-e29b-41d4-a716-446655440045', '550e8400-e29b-41d4-a716-446655440010', 'high', '2024-09-01', '2024-11-30', 1.2, 'Autumn high season', true),

('550e8400-e29b-41d4-a716-446655440046', '550e8400-e29b-41d4-a716-446655440011', 'high', '2024-03-01', '2024-05-31', 1.2, 'Spring high season', true),
('550e8400-e29b-41d4-a716-446655440047', '550e8400-e29b-41d4-a716-446655440011', 'high', '2024-09-01', '2024-11-30', 1.2, 'Autumn high season', true),

-- Low Season (February, June)
('550e8400-e29b-41d4-a716-446655440048', '550e8400-e29b-41d4-a716-446655440010', 'low', '2024-02-01', '2024-02-29', 0.8, 'Low season discount', true),
('550e8400-e29b-41d4-a716-446655440049', '550e8400-e29b-41d4-a716-446655440010', 'low', '2024-06-01', '2024-06-30', 0.8, 'Low season discount', true),

('550e8400-e29b-41d4-a716-446655440050', '550e8400-e29b-41d4-a716-446655440011', 'low', '2024-02-01', '2024-02-29', 0.8, 'Low season discount', true),
('550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440011', 'low', '2024-06-01', '2024-06-30', 0.8, 'Low season discount', true)
ON CONFLICT (id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE seasonal_rates IS 'Stores seasonal pricing multipliers for packages';
COMMENT ON TABLE payments IS 'Stores payment transactions and Stripe integration data';
COMMENT ON COLUMN seasonal_rates.price_multiplier IS 'Multiplier applied to base package price (1.0 = no change, 1.5 = 50% increase, 0.8 = 20% discount)';
COMMENT ON COLUMN payments.stripe_payment_intent_id IS 'Stripe PaymentIntent ID for tracking payments';
COMMENT ON COLUMN payments.metadata IS 'Additional payment metadata in JSON format';

-- Log successful migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 001 completed successfully!';
    RAISE NOTICE 'Added seasonal_rates table with % records', (SELECT COUNT(*) FROM seasonal_rates);
    RAISE NOTICE 'Added payments table';
    RAISE NOTICE 'Updated bookings.payment_status to use enum type';
END $$;