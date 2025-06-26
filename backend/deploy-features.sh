#!/bin/bash

# Bali Malayali DMC - Feature Deployment Script
# This script deploys the seasonal pricing and payment processing features

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="Bali Malayali DMC"
VERSION="1.0.0"
DATABASE_NAME="balidmc_db"
BACKUP_DIR="./backups"
MIGRATION_DIR="./migrations"
LOG_FILE="./deploy-$(date +%Y%m%d_%H%M%S).log"

# Functions
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if PostgreSQL is available
    if ! command -v psql &> /dev/null; then
        log_error "PostgreSQL client (psql) is not installed"
        exit 1
    fi
    
    # Check if Python is available
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 is not installed"
        exit 1
    fi
    
    # Check if pip is available
    if ! command -v pip3 &> /dev/null; then
        log_error "pip3 is not installed"
        exit 1
    fi
    
    # Check if .env file exists
    if [ ! -f ".env" ]; then
        log_warning ".env file not found. Please create one based on .env.example"
        if [ -f ".env.example" ]; then
            log_info "Copying .env.example to .env"
            cp .env.example .env
            log_warning "Please update .env with your actual configuration values"
        else
            log_error ".env.example file not found"
            exit 1
        fi
    fi
    
    log_success "Prerequisites check completed"
}

backup_database() {
    log_info "Creating database backup..."
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    # Create backup filename with timestamp
    BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"
    
    # Create database backup
    if pg_dump "$DATABASE_NAME" > "$BACKUP_FILE"; then
        log_success "Database backup created: $BACKUP_FILE"
    else
        log_error "Failed to create database backup"
        exit 1
    fi
}

install_dependencies() {
    log_info "Installing Python dependencies..."
    
    # Upgrade pip
    pip3 install --upgrade pip
    
    # Install requirements
    if pip3 install -r requirements.txt; then
        log_success "Dependencies installed successfully"
    else
        log_error "Failed to install dependencies"
        exit 1
    fi
}

run_database_migration() {
    log_info "Running database migration..."
    
    # Check if migration file exists
    MIGRATION_FILE="$MIGRATION_DIR/001_add_seasonal_pricing_and_payments.sql"
    
    if [ ! -f "$MIGRATION_FILE" ]; then
        log_error "Migration file not found: $MIGRATION_FILE"
        exit 1
    fi
    
    # Run migration
    if psql -d "$DATABASE_NAME" -f "$MIGRATION_FILE"; then
        log_success "Database migration completed successfully"
    else
        log_error "Database migration failed"
        log_error "Please check the migration file and database connection"
        exit 1
    fi
}

run_tests() {
    log_info "Running tests..."
    
    # Install test dependencies if not already installed
    pip3 install pytest pytest-asyncio httpx
    
    # Run tests
    if python3 -m pytest tests/ -v; then
        log_success "All tests passed"
    else
        log_warning "Some tests failed. Please review the test results."
        read -p "Do you want to continue with deployment? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Deployment cancelled by user"
            exit 1
        fi
    fi
}

validate_environment() {
    log_info "Validating environment configuration..."
    
    # Source environment variables
    if [ -f ".env" ]; then
        source .env
    fi
    
    # Check required environment variables
    REQUIRED_VARS=(
        "DATABASE_URL"
        "STRIPE_SECRET_KEY"
        "STRIPE_PUBLISHABLE_KEY"
        "CLERK_SECRET_KEY"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    # Validate Stripe keys format
    if [[ ! $STRIPE_SECRET_KEY =~ ^sk_(test_|live_) ]]; then
        log_error "Invalid Stripe secret key format"
        exit 1
    fi
    
    if [[ ! $STRIPE_PUBLISHABLE_KEY =~ ^pk_(test_|live_) ]]; then
        log_error "Invalid Stripe publishable key format"
        exit 1
    fi
    
    # Check if using test keys in production
    if [[ $ENVIRONMENT == "production" && $STRIPE_SECRET_KEY =~ ^sk_test_ ]]; then
        log_warning "Using Stripe test keys in production environment"
        read -p "Are you sure you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Deployment cancelled by user"
            exit 1
        fi
    fi
    
    log_success "Environment validation completed"
}

test_database_connection() {
    log_info "Testing database connection..."
    
    if python3 test_connection.py; then
        log_success "Database connection test passed"
    else
        log_error "Database connection test failed"
        exit 1
    fi
}

start_application() {
    log_info "Starting application..."
    
    # Kill any existing processes
    pkill -f "uvicorn main:app" || true
    
    # Start the application in background
    if [ "$ENVIRONMENT" == "production" ]; then
        # Production mode
        nohup uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4 > app.log 2>&1 &
    else
        # Development mode
        nohup uvicorn main:app --host 0.0.0.0 --port 8000 --reload > app.log 2>&1 &
    fi
    
    APP_PID=$!
    echo $APP_PID > app.pid
    
    # Wait a moment for the app to start
    sleep 5
    
    # Test if the application is running
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        log_success "Application started successfully (PID: $APP_PID)"
    else
        log_error "Application failed to start"
        exit 1
    fi
}

run_health_checks() {
    log_info "Running health checks..."
    
    # Test API endpoints
    ENDPOINTS=(
        "/health"
        "/api/v1/packages"
        "/api/v1/seasonal-rates/package/550e8400-e29b-41d4-a716-446655440010"
    )
    
    for endpoint in "${ENDPOINTS[@]}"; do
        if curl -f "http://localhost:8000$endpoint" > /dev/null 2>&1; then
            log_success "Health check passed: $endpoint"
        else
            log_warning "Health check failed: $endpoint"
        fi
    done
}

cleanup() {
    log_info "Cleaning up temporary files..."
    
    # Remove any temporary files
    rm -f *.tmp
    
    # Clean up Python cache
    find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    find . -name "*.pyc" -delete 2>/dev/null || true
    
    log_success "Cleanup completed"
}

print_summary() {
    echo
    echo "========================================"
    echo "         DEPLOYMENT SUMMARY"
    echo "========================================"
    echo "Application: $APP_NAME"
    echo "Version: $VERSION"
    echo "Environment: ${ENVIRONMENT:-development}"
    echo "Database: $DATABASE_NAME"
    echo "Log file: $LOG_FILE"
    echo "Backup created: $(ls -t $BACKUP_DIR/*.sql 2>/dev/null | head -1 || echo 'None')"
    echo "Application URL: http://localhost:8000"
    echo "API Documentation: http://localhost:8000/docs"
    echo "========================================"
    echo
    echo "New Features Deployed:"
    echo "✅ Seasonal Pricing System"
    echo "✅ Payment Processing (Stripe Integration)"
    echo "✅ Enhanced Database Schema"
    echo "✅ Comprehensive API Endpoints"
    echo
    echo "Next Steps:"
    echo "1. Configure Stripe webhook endpoints"
    echo "2. Test payment flows in your environment"
    echo "3. Set up monitoring and alerts"
    echo "4. Review and update documentation"
    echo
}

# Main deployment process
main() {
    echo
    echo "========================================"
    echo "    $APP_NAME - Feature Deployment"
    echo "========================================"
    echo
    
    log_info "Starting deployment process..."
    
    # Run deployment steps
    check_prerequisites
    validate_environment
    backup_database
    install_dependencies
    test_database_connection
    run_database_migration
    run_tests
    start_application
    run_health_checks
    cleanup
    
    log_success "Deployment completed successfully!"
    print_summary
}

# Handle script interruption
trap 'log_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"

exit 0