#!/bin/bash

# Bali Malayali DMC Backend Development Setup Script
# This script sets up the development environment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_python() {
    log_info "Checking Python installation..."
    
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 is not installed. Please install Python 3.8 or higher."
        exit 1
    fi
    
    PYTHON_VERSION=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
    log_success "Python $PYTHON_VERSION found"
    
    if ! python3 -c "import sys; exit(0 if sys.version_info >= (3, 8) else 1)"; then
        log_error "Python 3.8 or higher is required. Current version: $PYTHON_VERSION"
        exit 1
    fi
}

check_docker() {
    log_info "Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        log_warning "Docker is not installed. You can install it from https://docs.docker.com/get-docker/"
        log_warning "Docker is optional but recommended for database setup"
        return 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_warning "Docker Compose is not installed. You can install it from https://docs.docker.com/compose/install/"
        return 1
    fi
    
    log_success "Docker and Docker Compose found"
    return 0
}

setup_virtual_environment() {
    log_info "Setting up Python virtual environment..."
    
    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        python3 -m venv venv
        log_success "Virtual environment created"
    else
        log_info "Virtual environment already exists"
    fi
    
    # Activate virtual environment
    source venv/bin/activate || source venv/Scripts/activate 2>/dev/null || {
        log_error "Failed to activate virtual environment"
        exit 1
    }
    
    log_success "Virtual environment activated"
}

install_dependencies() {
    log_info "Installing Python dependencies..."
    
    # Upgrade pip
    pip install --upgrade pip
    
    # Install requirements
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt
        log_success "Dependencies installed from requirements.txt"
    else
        log_error "requirements.txt not found"
        exit 1
    fi
    
    # Install development dependencies
    pip install pytest pytest-asyncio pytest-cov black flake8 mypy pre-commit
    log_success "Development dependencies installed"
}

setup_environment_file() {
    log_info "Setting up environment configuration..."
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_success "Created .env file from .env.example"
            log_warning "Please update the .env file with your actual configuration values"
        else
            log_info "Creating default .env file..."
            cat > .env << EOF
# Database Configuration
DATABASE_URL=postgresql://balidmc_user:balidmc_password@localhost:5432/balidmc_db
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=balidmc_db
DATABASE_USER=balidmc_user
DATABASE_PASSWORD=balidmc_password

# Clerk Authentication (Development)
CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# API Configuration
API_HOST=127.0.0.1
API_PORT=8001
API_WORKERS=1
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000

# Security
SECRET_KEY=dev_secret_key_change_in_production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Environment
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=DEBUG
EOF
            log_success "Created default .env file"
            log_warning "Please update the Clerk keys in the .env file"
        fi
    else
        log_info ".env file already exists"
    fi
}

setup_database_docker() {
    log_info "Setting up database with Docker..."
    
    if check_docker; then
        # Start database with Docker Compose
        if [ -f "docker-compose.yml" ]; then
            docker-compose up -d db
            log_success "Database started with Docker Compose"
            
            # Wait for database to be ready
            log_info "Waiting for database to be ready..."
            sleep 10
            
            # Check if database is ready
            for i in {1..30}; do
                if docker-compose exec -T db pg_isready -U balidmc_user -d balidmc_db > /dev/null 2>&1; then
                    log_success "Database is ready"
                    break
                fi
                if [ $i -eq 30 ]; then
                    log_error "Database failed to start after 30 attempts"
                    exit 1
                fi
                sleep 2
            done
        else
            log_warning "docker-compose.yml not found. Starting PostgreSQL container manually..."
            
            # Check if container already exists
            if docker ps -a --format "table {{.Names}}" | grep -q "balidmc_db"; then
                log_info "Database container already exists. Starting..."
                docker start balidmc_db
            else
                # Start PostgreSQL container
                docker run -d \
                    --name balidmc_db \
                    -e POSTGRES_DB=balidmc_db \
                    -e POSTGRES_USER=balidmc_user \
                    -e POSTGRES_PASSWORD=balidmc_password \
                    -p 5432:5432 \
                    postgres:15-alpine
                
                log_success "PostgreSQL container started"
            fi
        fi
        return 0
    else
        return 1
    fi
}

setup_database_local() {
    log_warning "Docker not available. Please install PostgreSQL manually:"
    echo "1. Install PostgreSQL from https://www.postgresql.org/download/"
    echo "2. Create a database named 'balidmc_db'"
    echo "3. Create a user 'balidmc_user' with password 'balidmc_password'"
    echo "4. Grant all privileges on 'balidmc_db' to 'balidmc_user'"
    echo
    echo "SQL commands:"
    echo "CREATE DATABASE balidmc_db;"
    echo "CREATE USER balidmc_user WITH PASSWORD 'balidmc_password';"
    echo "GRANT ALL PRIVILEGES ON DATABASE balidmc_db TO balidmc_user;"
    echo "ALTER USER balidmc_user CREATEDB;"
    echo
    read -p "Press Enter after setting up the database manually..."
}

run_migrations() {
    log_info "Running database migrations..."
    
    # Initialize Alembic if not already done
    if [ ! -d "alembic/versions" ] || [ -z "$(ls -A alembic/versions)" ]; then
        log_info "Creating initial migration..."
        alembic revision --autogenerate -m "Initial migration"
    fi
    
    # Run migrations
    alembic upgrade head
    log_success "Database migrations completed"
}

setup_pre_commit() {
    log_info "Setting up pre-commit hooks..."
    
    # Create pre-commit config if it doesn't exist
    if [ ! -f ".pre-commit-config.yaml" ]; then
        cat > .pre-commit-config.yaml << EOF
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
      - id: check-merge-conflict
  
  - repo: https://github.com/psf/black
    rev: 23.3.0
    hooks:
      - id: black
        language_version: python3
  
  - repo: https://github.com/pycqa/flake8
    rev: 6.0.0
    hooks:
      - id: flake8
        args: [--max-line-length=88, --extend-ignore=E203,W503]
  
  - repo: https://github.com/pycqa/isort
    rev: 5.12.0
    hooks:
      - id: isort
        args: [--profile=black]
EOF
        log_success "Created .pre-commit-config.yaml"
    fi
    
    # Install pre-commit hooks
    pre-commit install
    log_success "Pre-commit hooks installed"
}

run_tests() {
    log_info "Running tests..."
    
    if [ -d "tests" ]; then
        pytest tests/ -v
        log_success "Tests completed"
    else
        log_warning "No tests directory found. Consider adding tests for your application."
    fi
}

start_development_server() {
    log_info "Starting development server..."
    
    # Check if start.py exists
    if [ -f "start.py" ]; then
        python start.py
    else
        # Fallback to uvicorn directly
        uvicorn main:app --host 127.0.0.1 --port 8001 --reload
    fi
}

print_summary() {
    log_success "Development environment setup completed!"
    echo
    echo "=== Setup Summary ==="
    echo "✅ Python virtual environment created and activated"
    echo "✅ Dependencies installed"
    echo "✅ Environment configuration set up"
    echo "✅ Database configured"
    echo "✅ Database migrations completed"
    echo "✅ Pre-commit hooks installed"
    echo
    echo "=== Next Steps ==="
    echo "1. Update the .env file with your Clerk authentication keys"
    echo "2. Start the development server: python start.py"
    echo "3. Visit http://localhost:8001/docs for API documentation"
    echo "4. Visit http://localhost:8001/health for health check"
    echo
    echo "=== Useful Commands ==="
    echo "Activate virtual environment: source venv/bin/activate (Linux/Mac) or venv\\Scripts\\activate (Windows)"
    echo "Start development server: python start.py"
    echo "Run tests: pytest"
    echo "Format code: black ."
    echo "Lint code: flake8 ."
    echo "Create migration: alembic revision --autogenerate -m 'description'"
    echo "Run migrations: alembic upgrade head"
    echo "Start database (Docker): docker-compose up -d db"
    echo "Stop database (Docker): docker-compose down"
    echo
}

# Main setup process
main() {
    log_info "Starting Bali Malayali DMC Backend Development Setup..."
    
    check_python
    setup_virtual_environment
    install_dependencies
    setup_environment_file
    
    # Try Docker setup first, fallback to manual setup
    if ! setup_database_docker; then
        setup_database_local
    fi
    
    run_migrations
    setup_pre_commit
    
    # Ask if user wants to run tests
    read -p "Do you want to run tests? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        run_tests
    fi
    
    print_summary
    
    # Ask if user wants to start the development server
    read -p "Do you want to start the development server now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_development_server
    fi
}

# Run main function
main "$@"