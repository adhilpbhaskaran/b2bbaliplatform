#!/bin/bash

# Bali Malayali DMC Backend Deployment Script
# This script automates the deployment process for production environments

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="balidmc-backend"
APP_DIR="/opt/balidmc"
SERVICE_NAME="balidmc-api"
NGINX_CONF="/etc/nginx/sites-available/balidmc"
SSL_DOMAIN="api.balidmc.com"  # Change this to your domain

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

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

install_dependencies() {
    log_info "Installing system dependencies..."
    
    # Update system
    apt update && apt upgrade -y
    
    # Install required packages
    apt install -y \
        python3 \
        python3-pip \
        python3-venv \
        postgresql \
        postgresql-contrib \
        nginx \
        certbot \
        python3-certbot-nginx \
        git \
        curl \
        supervisor \
        ufw
    
    log_success "System dependencies installed"
}

setup_database() {
    log_info "Setting up PostgreSQL database..."
    
    # Start PostgreSQL service
    systemctl start postgresql
    systemctl enable postgresql
    
    # Create database and user
    sudo -u postgres psql << EOF
CREATE DATABASE balidmc_db;
CREATE USER balidmc_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE balidmc_db TO balidmc_user;
ALTER USER balidmc_user CREATEDB;
\q
EOF
    
    log_success "Database setup completed"
}

setup_application() {
    log_info "Setting up application..."
    
    # Create application directory
    mkdir -p $APP_DIR
    cd $APP_DIR
    
    # Clone or copy application code
    if [ -d ".git" ]; then
        log_info "Updating existing repository..."
        git pull origin main
    else
        log_info "Please copy your application code to $APP_DIR"
        log_warning "Make sure to copy all backend files to $APP_DIR"
    fi
    
    # Create virtual environment
    python3 -m venv venv
    source venv/bin/activate
    
    # Install Python dependencies
    pip install --upgrade pip
    pip install -r requirements.txt
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        log_info "Creating .env file..."
        cat > .env << EOF
# Database Configuration
DATABASE_URL=postgresql://balidmc_user:your_secure_password_here@localhost:5432/balidmc_db
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=balidmc_db
DATABASE_USER=balidmc_user
DATABASE_PASSWORD=your_secure_password_here

# Clerk Authentication
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret

# API Configuration
API_HOST=0.0.0.0
API_PORT=8001
API_WORKERS=4
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Security
SECRET_KEY=$(openssl rand -hex 32)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Environment
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO
EOF
        log_warning "Please update the .env file with your actual configuration values"
    fi
    
    # Run database migrations
    alembic upgrade head
    
    log_success "Application setup completed"
}

setup_systemd_service() {
    log_info "Setting up systemd service..."
    
    cat > /etc/systemd/system/$SERVICE_NAME.service << EOF
[Unit]
Description=Bali Malayali DMC FastAPI Backend
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=exec
User=www-data
Group=www-data
WorkingDirectory=$APP_DIR
Environment=PATH=$APP_DIR/venv/bin
ExecStart=$APP_DIR/venv/bin/gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8001
ExecReload=/bin/kill -s HUP \$MAINPID
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
    
    # Set proper permissions
    chown -R www-data:www-data $APP_DIR
    
    # Enable and start service
    systemctl daemon-reload
    systemctl enable $SERVICE_NAME
    systemctl start $SERVICE_NAME
    
    log_success "Systemd service configured and started"
}

setup_nginx() {
    log_info "Setting up Nginx reverse proxy..."
    
    cat > $NGINX_CONF << EOF
server {
    listen 80;
    server_name $SSL_DOMAIN;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $SSL_DOMAIN;
    
    # SSL Configuration (will be configured by certbot)
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    
    location / {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://127.0.0.1:8001/health;
    }
    
    # Static files (if any)
    location /static/ {
        alias $APP_DIR/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
    
    # Enable site
    ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
    
    # Remove default site
    rm -f /etc/nginx/sites-enabled/default
    
    # Test nginx configuration
    nginx -t
    
    # Restart nginx
    systemctl restart nginx
    systemctl enable nginx
    
    log_success "Nginx configured and started"
}

setup_ssl() {
    log_info "Setting up SSL certificate..."
    
    # Obtain SSL certificate
    certbot --nginx -d $SSL_DOMAIN --non-interactive --agree-tos --email admin@$SSL_DOMAIN
    
    # Setup auto-renewal
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
    
    log_success "SSL certificate configured"
}

setup_firewall() {
    log_info "Configuring firewall..."
    
    # Reset UFW
    ufw --force reset
    
    # Default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH
    ufw allow ssh
    
    # Allow HTTP and HTTPS
    ufw allow 'Nginx Full'
    
    # Allow PostgreSQL (only from localhost)
    ufw allow from 127.0.0.1 to any port 5432
    
    # Enable firewall
    ufw --force enable
    
    log_success "Firewall configured"
}

setup_monitoring() {
    log_info "Setting up basic monitoring..."
    
    # Create log rotation for application logs
    cat > /etc/logrotate.d/balidmc << EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload $SERVICE_NAME
    endscript
}
EOF
    
    # Create logs directory
    mkdir -p $APP_DIR/logs
    chown www-data:www-data $APP_DIR/logs
    
    log_success "Basic monitoring configured"
}

run_health_check() {
    log_info "Running health check..."
    
    sleep 5  # Wait for service to start
    
    # Check if service is running
    if systemctl is-active --quiet $SERVICE_NAME; then
        log_success "Service is running"
    else
        log_error "Service is not running"
        systemctl status $SERVICE_NAME
        exit 1
    fi
    
    # Check if API is responding
    if curl -f http://localhost:8001/health > /dev/null 2>&1; then
        log_success "API health check passed"
    else
        log_error "API health check failed"
        exit 1
    fi
    
    log_success "All health checks passed!"
}

print_summary() {
    log_success "Deployment completed successfully!"
    echo
    echo "=== Deployment Summary ==="
    echo "Application Directory: $APP_DIR"
    echo "Service Name: $SERVICE_NAME"
    echo "Domain: $SSL_DOMAIN"
    echo "API URL: https://$SSL_DOMAIN"
    echo
    echo "=== Next Steps ==="
    echo "1. Update the .env file with your actual configuration values"
    echo "2. Update the domain name in this script and Nginx configuration"
    echo "3. Configure your DNS to point to this server"
    echo "4. Test the API endpoints"
    echo "5. Set up monitoring and backup solutions"
    echo
    echo "=== Useful Commands ==="
    echo "Check service status: systemctl status $SERVICE_NAME"
    echo "View service logs: journalctl -u $SERVICE_NAME -f"
    echo "Restart service: systemctl restart $SERVICE_NAME"
    echo "Check Nginx status: systemctl status nginx"
    echo "Test Nginx config: nginx -t"
    echo "Renew SSL certificate: certbot renew"
    echo
}

# Main deployment process
main() {
    log_info "Starting Bali Malayali DMC Backend Deployment..."
    
    check_root
    install_dependencies
    setup_database
    setup_application
    setup_systemd_service
    setup_nginx
    
    # Ask for SSL setup
    read -p "Do you want to set up SSL certificate? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_ssl
    fi
    
    setup_firewall
    setup_monitoring
    run_health_check
    print_summary
}

# Run main function
main "$@"