-- Initial database setup for Bali Malayali DMC
-- This script creates initial data and configurations

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Insert default tier configurations
INSERT INTO tier_configs (id, tier, min_pax, max_pax, discount_percentage, benefits, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'bronze', 0, 99, 0.0, '["Basic support", "Standard pricing"]', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'silver', 100, 499, 5.0, '["Priority support", "5% discount", "Monthly reports"]', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'gold', 500, 999, 10.0, '["Premium support", "10% discount", "Weekly reports", "Dedicated account manager"]', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440004', 'platinum', 1000, 9999999, 15.0, '["VIP support", "15% discount", "Daily reports", "Dedicated account manager", "Custom packages"]', NOW(), NOW())
ON CONFLICT (tier) DO NOTHING;

-- Insert default packages
INSERT INTO packages (id, name, description, duration, location, category, base_price, inclusions, exclusions, highlights, is_active, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440010', 'Bali Highlights 4D3N', 'Discover the best of Bali in 4 days with visits to iconic temples, rice terraces, and cultural sites.', 4, 'Ubud, Kintamani, Tanah Lot', 'Cultural', 299.00, '["Airport transfers", "3 nights accommodation", "Daily breakfast", "English speaking guide", "Entrance fees", "Transportation"]', '["International flights", "Lunch and dinner", "Personal expenses", "Travel insurance"]', '["Tegallalang Rice Terraces", "Tirta Empul Temple", "Kintamani Volcano View", "Tanah Lot Sunset"]', true, NOW(), NOW()),

('550e8400-e29b-41d4-a716-446655440011', 'Bali Adventure 5D4N', 'Action-packed adventure tour featuring water sports, volcano trekking, and jungle activities.', 5, 'Ubud, Kintamani, Sanur', 'Adventure', 450.00, '["Airport transfers", "4 nights accommodation", "Daily breakfast", "Adventure equipment", "Professional guides", "Transportation"]', '["International flights", "Lunch and dinner", "Personal expenses", "Travel insurance"]', '["Mount Batur Sunrise Trekking", "White Water Rafting", "ATV Quad Biking", "Sekumpul Waterfall"]', true, NOW(), NOW()),

('550e8400-e29b-41d4-a716-446655440012', 'Bali Beach & Culture 6D5N', 'Perfect blend of cultural exploration and beach relaxation in beautiful Bali.', 6, 'Ubud, Seminyak, Uluwatu', 'Beach & Culture', 520.00, '["Airport transfers", "5 nights accommodation", "Daily breakfast", "Cultural performances", "Beach activities", "Transportation"]', '["International flights", "Lunch and dinner", "Personal expenses", "Travel insurance"]', '["Uluwatu Temple & Kecak Dance", "Seminyak Beach", "Traditional Cooking Class", "Spa Treatment"]', true, NOW(), NOW()),

('550e8400-e29b-41d4-a716-446655440013', 'Bali Luxury Retreat 7D6N', 'Luxury experience with premium accommodations, private tours, and exclusive activities.', 7, 'Ubud, Seminyak, Nusa Dua', 'Luxury', 890.00, '["Private airport transfers", "6 nights luxury accommodation", "All meals", "Private guide", "Spa treatments", "Premium transportation"]', '["International flights", "Personal expenses", "Travel insurance", "Alcoholic beverages"]', '["Private Villa Stay", "Helicopter Tour", "Private Yacht Charter", "Michelin Star Dining"]', true, NOW(), NOW()),

('550e8400-e29b-41d4-a716-446655440014', 'Bali Family Fun 5D4N', 'Family-friendly package with activities suitable for all ages and comfortable accommodations.', 5, 'Sanur, Ubud, Denpasar', 'Family', 380.00, '["Airport transfers", "4 nights family accommodation", "Daily breakfast", "Family activities", "Child-friendly guide", "Transportation"]', '["International flights", "Lunch and dinner", "Personal expenses", "Travel insurance"]', '["Bali Safari & Marine Park", "Elephant Safari Park", "Traditional Village Visit", "Beach Activities"]', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert default hotels
INSERT INTO hotels (id, name, location, star_rating, description, amenities, room_types, contact_info, is_active, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440020', 'Grand Bali Resort', 'Seminyak', 5, 'Luxury beachfront resort with world-class amenities and stunning ocean views.', '["Private Beach", "Infinity Pool", "Spa", "Fitness Center", "Multiple Restaurants", "WiFi", "Airport Transfer"]', '[{"type": "Deluxe Ocean View", "capacity": 2, "price": 180.00}, {"type": "Family Suite", "capacity": 4, "price": 320.00}, {"type": "Presidential Villa", "capacity": 6, "price": 650.00}]', '{"phone": "+62-361-123456", "email": "info@grandbaliresor.com", "website": "www.grandbaliresort.com"}', true, NOW(), NOW()),

('550e8400-e29b-41d4-a716-446655440021', 'Ubud Nature Lodge', 'Ubud', 4, 'Eco-friendly lodge nestled in the heart of Ubud with rice field views and traditional architecture.', '["Rice Field Views", "Yoga Pavilion", "Organic Restaurant", "Bicycle Rental", "Cultural Activities", "WiFi", "Shuttle Service"]', '[{"type": "Garden View Room", "capacity": 2, "price": 95.00}, {"type": "Rice Field Villa", "capacity": 3, "price": 150.00}, {"type": "Treetop Suite", "capacity": 2, "price": 220.00}]', '{"phone": "+62-361-789012", "email": "reservations@ubudnaturelodge.com", "website": "www.ubudnaturelodge.com"}', true, NOW(), NOW()),

('550e8400-e29b-41d4-a716-446655440022', 'Sanur Beach Hotel', 'Sanur', 4, 'Comfortable beachfront hotel perfect for families with calm beach and traditional Balinese hospitality.', '["Beachfront Location", "Swimming Pool", "Kids Club", "Restaurant", "Spa Services", "WiFi", "Bicycle Rental"]', '[{"type": "Standard Room", "capacity": 2, "price": 75.00}, {"type": "Family Room", "capacity": 4, "price": 140.00}, {"type": "Beach Villa", "capacity": 4, "price": 200.00}]', '{"phone": "+62-361-345678", "email": "info@sanurbeachhotel.com", "website": "www.sanurbeachhotel.com"}', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert default add-ons
INSERT INTO add_ons (id, name, description, category, price, duration, location, inclusions, is_active, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440030', 'Traditional Balinese Spa', 'Relaxing traditional Balinese massage and spa treatment using natural ingredients.', 'Wellness', 45.00, 2, 'Various Locations', '["2-hour spa treatment", "Traditional massage", "Natural scrub", "Herbal tea", "Towels and amenities"]', true, NOW(), NOW()),

('550e8400-e29b-41d4-a716-446655440031', 'Sunset Dinner Cruise', 'Romantic dinner cruise with stunning sunset views and traditional entertainment.', 'Entertainment', 65.00, 3, 'Benoa Harbor', '["3-hour cruise", "International buffet dinner", "Live entertainment", "Welcome drink", "Hotel transfers"]', true, NOW(), NOW()),

('550e8400-e29b-41d4-a716-446655440032', 'Cooking Class Experience', 'Learn to cook authentic Balinese dishes with a local chef in a traditional setting.', 'Cultural', 35.00, 4, 'Ubud', '["4-hour cooking class", "Market visit", "Recipe book", "Lunch", "Certificate", "Apron"]', true, NOW(), NOW()),

('550e8400-e29b-41d4-a716-446655440033', 'Private Car with Driver', 'Full day private car rental with experienced English-speaking driver.', 'Transportation', 40.00, 8, 'Island Wide', '["8-hour service", "English speaking driver", "Fuel", "Parking fees", "Toll fees", "Bottled water"]', true, NOW(), NOW()),

('550e8400-e29b-41d4-a716-446655440034', 'Volcano Sunrise Trekking', 'Early morning trek to Mount Batur summit to witness spectacular sunrise views.', 'Adventure', 55.00, 6, 'Mount Batur', '["Professional guide", "Trekking equipment", "Breakfast on summit", "Hotel pickup", "Flashlight", "Certificate"]', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert seasonal rates for packages
INSERT INTO seasonal_rates (id, package_id, season_type, start_date, end_date, price_multiplier, description, is_active, created_at, updated_at) VALUES
-- Peak Season (December - January, July - August)
('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440010', 'peak', '2024-12-15', '2025-01-15', 1.5, 'Christmas and New Year peak season', true, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440010', 'peak', '2024-07-01', '2024-08-31', 1.4, 'Summer holiday peak season', true, NOW(), NOW()),

('550e8400-e29b-41d4-a716-446655440042', '550e8400-e29b-41d4-a716-446655440011', 'peak', '2024-12-15', '2025-01-15', 1.5, 'Christmas and New Year peak season', true, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440043', '550e8400-e29b-41d4-a716-446655440011', 'peak', '2024-07-01', '2024-08-31', 1.4, 'Summer holiday peak season', true, NOW(), NOW()),

-- High Season (March - May, September - November)
('550e8400-e29b-41d4-a716-446655440044', '550e8400-e29b-41d4-a716-446655440010', 'high', '2024-03-01', '2024-05-31', 1.2, 'Spring high season', true, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440045', '550e8400-e29b-41d4-a716-446655440010', 'high', '2024-09-01', '2024-11-30', 1.2, 'Autumn high season', true, NOW(), NOW()),

('550e8400-e29b-41d4-a716-446655440046', '550e8400-e29b-41d4-a716-446655440011', 'high', '2024-03-01', '2024-05-31', 1.2, 'Spring high season', true, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440047', '550e8400-e29b-41d4-a716-446655440011', 'high', '2024-09-01', '2024-11-30', 1.2, 'Autumn high season', true, NOW(), NOW()),

-- Low Season (February, June)
('550e8400-e29b-41d4-a716-446655440048', '550e8400-e29b-41d4-a716-446655440010', 'low', '2024-02-01', '2024-02-29', 0.8, 'Low season discount', true, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440049', '550e8400-e29b-41d4-a716-446655440010', 'low', '2024-06-01', '2024-06-30', 0.8, 'Low season discount', true, NOW(), NOW()),

('550e8400-e29b-41d4-a716-446655440050', '550e8400-e29b-41d4-a716-446655440011', 'low', '2024-02-01', '2024-02-29', 0.8, 'Low season discount', true, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440011', 'low', '2024-06-01', '2024-06-30', 0.8, 'Low season discount', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quotes_agent_id ON quotes(agent_id);
CREATE INDEX IF NOT EXISTS idx_quotes_package_id ON quotes(package_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at);

CREATE INDEX IF NOT EXISTS idx_bookings_agent_id ON bookings(agent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_quote_id ON bookings(quote_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(booking_reference);

CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_tier ON agents(tier);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE INDEX IF NOT EXISTS idx_packages_category ON packages(category);
CREATE INDEX IF NOT EXISTS idx_packages_active ON packages(is_active);
CREATE INDEX IF NOT EXISTS idx_packages_location ON packages(location);

CREATE INDEX IF NOT EXISTS idx_seasonal_rates_package_id ON seasonal_rates(package_id);
CREATE INDEX IF NOT EXISTS idx_seasonal_rates_season_type ON seasonal_rates(season_type);
CREATE INDEX IF NOT EXISTS idx_seasonal_rates_dates ON seasonal_rates(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_seasonal_rates_active ON seasonal_rates(is_active);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_id ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Insert sample admin user (optional - for development)
-- Note: In production, admin users should be created through the proper registration flow
-- This is just for initial setup and testing

-- Create a comment with setup instructions
COMMENT ON DATABASE balidmc_db IS 'Bali Malayali DMC Database - Production Ready Backend';

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'Bali Malayali DMC database initialized successfully!';
    RAISE NOTICE 'Default data inserted: % tier configs, % packages, % hotels, % add-ons', 
        (SELECT COUNT(*) FROM tier_configs),
        (SELECT COUNT(*) FROM packages),
        (SELECT COUNT(*) FROM hotels),
        (SELECT COUNT(*) FROM add_ons);
END $$;