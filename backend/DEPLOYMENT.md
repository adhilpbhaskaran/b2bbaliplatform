# Bali Malayali DMC Backend - Production Deployment Guide

This guide provides comprehensive instructions for deploying the Bali Malayali DMC backend to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Requirements](#server-requirements)
3. [Deployment Methods](#deployment-methods)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [SSL/TLS Configuration](#ssltls-configuration)
7. [Monitoring and Logging](#monitoring-and-logging)
8. [Backup Strategy](#backup-strategy)
9. [Security Considerations](#security-considerations)
10. [Performance Optimization](#performance-optimization)
11. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software
- Ubuntu 20.04 LTS or newer (recommended)
- Python 3.8 or higher
- PostgreSQL 13 or higher
- Nginx (latest stable)
- Docker and Docker Compose (optional but recommended)
- Git
- Certbot (for SSL certificates)

### Required Accounts/Services
- Domain name with DNS control
- Clerk account for authentication
- Email service (for notifications)
- Monitoring service (optional)

## Server Requirements

### Minimum Requirements
- **CPU**: 2 vCPUs
- **RAM**: 4GB
- **Storage**: 50GB SSD
- **Network**: 1Gbps

### Recommended for Production
- **CPU**: 4 vCPUs
- **RAM**: 8GB
- **Storage**: 100GB SSD
- **Network**: 1Gbps
- **Load Balancer**: For high availability

## Deployment Methods

### Method 1: Automated Deployment (Recommended)

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd balidmc/backend
   ```

2. **Run the deployment script**:
   ```bash
   sudo chmod +x deploy.sh
   sudo ./deploy.sh
   ```

3. **Follow the prompts** to configure your deployment.

### Method 2: Docker Deployment

1. **Clone and configure**:
   ```bash
   git clone <repository-url>
   cd balidmc/backend
   cp .env.example .env
   # Edit .env with your production values
   ```

2. **Build and deploy**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Method 3: Manual Deployment

Follow the detailed steps in the [Manual Deployment](#manual-deployment) section below.

## Environment Configuration

### Production Environment Variables

Create a `.env` file with the following variables:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/balidmc_db
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=balidmc_db
DATABASE_USER=balidmc_user
DATABASE_PASSWORD=your_secure_password

# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_live_your_publishable_key
CLERK_SECRET_KEY=sk_live_your_secret_key
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret

# API Configuration
API_HOST=0.0.0.0
API_PORT=8001
API_WORKERS=4
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Security
SECRET_KEY=your_very_secure_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Environment
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO

# Email Configuration (if applicable)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# Monitoring (optional)
SENTRY_DSN=your_sentry_dsn
```

### Security Best Practices

1. **Generate secure passwords**:
   ```bash
   openssl rand -hex 32  # For SECRET_KEY
   openssl rand -base64 32  # For database password
   ```

2. **Set proper file permissions**:
   ```bash
   chmod 600 .env
   chown www-data:www-data .env
   ```

3. **Use environment-specific configurations**.

## Database Setup

### PostgreSQL Installation and Configuration

1. **Install PostgreSQL**:
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   ```

2. **Create database and user**:
   ```bash
   sudo -u postgres psql
   ```
   ```sql
   CREATE DATABASE balidmc_db;
   CREATE USER balidmc_user WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE balidmc_db TO balidmc_user;
   ALTER USER balidmc_user CREATEDB;
   \q
   ```

3. **Configure PostgreSQL**:
   ```bash
   sudo nano /etc/postgresql/13/main/postgresql.conf
   ```
   
   Update the following settings:
   ```
   listen_addresses = 'localhost'
   max_connections = 100
   shared_buffers = 256MB
   effective_cache_size = 1GB
   ```

4. **Configure authentication**:
   ```bash
   sudo nano /etc/postgresql/13/main/pg_hba.conf
   ```
   
   Add:
   ```
   local   balidmc_db      balidmc_user                    md5
   ```

5. **Restart PostgreSQL**:
   ```bash
   sudo systemctl restart postgresql
   sudo systemctl enable postgresql
   ```

### Database Migrations

```bash
# Run migrations
alembic upgrade head

# Create new migration (if needed)
alembic revision --autogenerate -m "Description"
```

## SSL/TLS Configuration

### Using Certbot (Let's Encrypt)

1. **Install Certbot**:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   ```

2. **Obtain SSL certificate**:
   ```bash
   sudo certbot --nginx -d api.yourdomain.com
   ```

3. **Set up auto-renewal**:
   ```bash
   sudo crontab -e
   # Add: 0 12 * * * /usr/bin/certbot renew --quiet
   ```

### Manual SSL Configuration

If using custom certificates, update the Nginx configuration:

```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # ... rest of configuration
}
```

## Monitoring and Logging

### Application Logging

1. **Configure log rotation**:
   ```bash
   sudo nano /etc/logrotate.d/balidmc
   ```
   
   ```
   /opt/balidmc/logs/*.log {
       daily
       missingok
       rotate 52
       compress
       delaycompress
       notifempty
       create 644 www-data www-data
       postrotate
           systemctl reload balidmc-api
       endscript
   }
   ```

### System Monitoring

1. **Install monitoring tools**:
   ```bash
   sudo apt install htop iotop nethogs
   ```

2. **Set up health checks**:
   ```bash
   # Add to crontab
   */5 * * * * curl -f http://localhost:8001/health || echo "API health check failed" | mail -s "API Alert" admin@yourdomain.com
   ```

### External Monitoring (Optional)

- **Sentry**: For error tracking
- **New Relic**: For application performance monitoring
- **DataDog**: For infrastructure monitoring
- **Uptime Robot**: For uptime monitoring

## Backup Strategy

### Database Backups

1. **Create backup script**:
   ```bash
   sudo nano /opt/balidmc/backup.sh
   ```
   
   ```bash
   #!/bin/bash
   BACKUP_DIR="/opt/balidmc/backups"
   DATE=$(date +%Y%m%d_%H%M%S)
   
   # Create backup directory
   mkdir -p $BACKUP_DIR
   
   # Database backup
   pg_dump -h localhost -U balidmc_user balidmc_db > $BACKUP_DIR/db_backup_$DATE.sql
   
   # Compress backup
   gzip $BACKUP_DIR/db_backup_$DATE.sql
   
   # Remove backups older than 30 days
   find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
   
   # Upload to cloud storage (optional)
   # aws s3 cp $BACKUP_DIR/db_backup_$DATE.sql.gz s3://your-backup-bucket/
   ```

2. **Schedule backups**:
   ```bash
   sudo crontab -e
   # Add: 0 2 * * * /opt/balidmc/backup.sh
   ```

### Application Backups

```bash
# Backup application files
tar -czf /opt/balidmc/backups/app_backup_$(date +%Y%m%d).tar.gz /opt/balidmc --exclude=/opt/balidmc/backups
```

## Security Considerations

### Firewall Configuration

```bash
# Reset UFW
sudo ufw --force reset

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Allow PostgreSQL only from localhost
sudo ufw allow from 127.0.0.1 to any port 5432

# Enable firewall
sudo ufw enable
```

### Security Headers

Ensure Nginx includes security headers:

```nginx
# Security headers
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Referrer-Policy "strict-origin-when-cross-origin";
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';";
```

### Regular Security Updates

```bash
# Set up automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Performance Optimization

### Application Performance

1. **Gunicorn Configuration**:
   ```python
   # gunicorn.conf.py
   bind = "0.0.0.0:8001"
   workers = 4  # 2 * CPU cores
   worker_class = "uvicorn.workers.UvicornWorker"
   worker_connections = 1000
   max_requests = 1000
   max_requests_jitter = 100
   timeout = 30
   keepalive = 2
   ```

2. **Database Connection Pooling**:
   ```python
   # In database.py
   engine = create_engine(
       DATABASE_URL,
       pool_size=20,
       max_overflow=30,
       pool_pre_ping=True,
       pool_recycle=3600
   )
   ```

### Nginx Optimization

```nginx
# Nginx performance settings
worker_processes auto;
worker_connections 1024;

# Gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

# Caching
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req zone=api burst=20 nodelay;
```

### Database Optimization

```sql
-- Create indexes for better performance
CREATE INDEX CONCURRENTLY idx_quotes_agent_created ON quotes(agent_id, created_at);
CREATE INDEX CONCURRENTLY idx_bookings_status_created ON bookings(status, created_at);
CREATE INDEX CONCURRENTLY idx_users_email_active ON users(email) WHERE is_active = true;

-- Analyze tables
ANALYZE;
```

## Manual Deployment

### Step-by-Step Manual Deployment

1. **Update system**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Install dependencies**:
   ```bash
   sudo apt install python3 python3-pip python3-venv postgresql postgresql-contrib nginx git curl supervisor ufw
   ```

3. **Create application user**:
   ```bash
   sudo useradd -m -s /bin/bash balidmc
   sudo usermod -aG www-data balidmc
   ```

4. **Set up application directory**:
   ```bash
   sudo mkdir -p /opt/balidmc
   sudo chown balidmc:www-data /opt/balidmc
   cd /opt/balidmc
   ```

5. **Clone repository**:
   ```bash
   sudo -u balidmc git clone <repository-url> .
   ```

6. **Set up Python environment**:
   ```bash
   sudo -u balidmc python3 -m venv venv
   sudo -u balidmc venv/bin/pip install -r requirements.txt
   ```

7. **Configure environment**:
   ```bash
   sudo -u balidmc cp .env.example .env
   sudo -u balidmc nano .env  # Edit with production values
   ```

8. **Set up database** (see Database Setup section)

9. **Run migrations**:
   ```bash
   sudo -u balidmc venv/bin/alembic upgrade head
   ```

10. **Configure systemd service**:
    ```bash
    sudo nano /etc/systemd/system/balidmc-api.service
    ```
    
    ```ini
    [Unit]
    Description=Bali Malayali DMC FastAPI Backend
    After=network.target postgresql.service
    Requires=postgresql.service
    
    [Service]
    Type=exec
    User=balidmc
    Group=www-data
    WorkingDirectory=/opt/balidmc
    Environment=PATH=/opt/balidmc/venv/bin
    ExecStart=/opt/balidmc/venv/bin/gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8001
    ExecReload=/bin/kill -s HUP $MAINPID
    Restart=always
    RestartSec=3
    
    [Install]
    WantedBy=multi-user.target
    ```

11. **Start and enable service**:
    ```bash
    sudo systemctl daemon-reload
    sudo systemctl enable balidmc-api
    sudo systemctl start balidmc-api
    ```

12. **Configure Nginx** (see deploy.sh for configuration)

13. **Set up SSL** (see SSL/TLS Configuration section)

14. **Configure firewall** (see Security Considerations section)

## Troubleshooting

### Common Issues

1. **Service won't start**:
   ```bash
   sudo systemctl status balidmc-api
   sudo journalctl -u balidmc-api -f
   ```

2. **Database connection issues**:
   ```bash
   # Test database connection
   psql -h localhost -U balidmc_user -d balidmc_db
   
   # Check PostgreSQL status
   sudo systemctl status postgresql
   ```

3. **Nginx configuration issues**:
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

4. **SSL certificate issues**:
   ```bash
   sudo certbot certificates
   sudo certbot renew --dry-run
   ```

### Performance Issues

1. **High CPU usage**:
   - Check worker count in Gunicorn configuration
   - Monitor database queries
   - Check for infinite loops or inefficient code

2. **High memory usage**:
   - Check for memory leaks
   - Monitor database connection pool
   - Review caching strategies

3. **Slow database queries**:
   ```sql
   -- Enable query logging
   ALTER SYSTEM SET log_statement = 'all';
   ALTER SYSTEM SET log_min_duration_statement = 1000;
   SELECT pg_reload_conf();
   ```

### Logs and Debugging

```bash
# Application logs
sudo journalctl -u balidmc-api -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-13-main.log

# System logs
sudo dmesg
sudo tail -f /var/log/syslog
```

## Maintenance

### Regular Maintenance Tasks

1. **Update dependencies**:
   ```bash
   cd /opt/balidmc
   sudo -u balidmc venv/bin/pip list --outdated
   sudo -u balidmc venv/bin/pip install -r requirements.txt --upgrade
   ```

2. **Update application**:
   ```bash
   cd /opt/balidmc
   sudo -u balidmc git pull origin main
   sudo -u balidmc venv/bin/alembic upgrade head
   sudo systemctl restart balidmc-api
   ```

3. **Database maintenance**:
   ```sql
   -- Vacuum and analyze
   VACUUM ANALYZE;
   
   -- Reindex if needed
   REINDEX DATABASE balidmc_db;
   ```

4. **Log cleanup**:
   ```bash
   sudo journalctl --vacuum-time=30d
   sudo find /var/log -name "*.log" -mtime +30 -delete
   ```

### Health Checks

Set up automated health checks:

```bash
#!/bin/bash
# health-check.sh

# Check API health
if ! curl -f http://localhost:8001/health > /dev/null 2>&1; then
    echo "API health check failed" | mail -s "API Alert" admin@yourdomain.com
    sudo systemctl restart balidmc-api
fi

# Check database
if ! pg_isready -h localhost -U balidmc_user > /dev/null 2>&1; then
    echo "Database health check failed" | mail -s "DB Alert" admin@yourdomain.com
fi

# Check disk space
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "Disk usage is ${DISK_USAGE}%" | mail -s "Disk Alert" admin@yourdomain.com
fi
```

Add to crontab:
```bash
*/5 * * * * /opt/balidmc/health-check.sh
```

## Support

For additional support:

1. Check the application logs
2. Review this deployment guide
3. Check the main README.md for development information
4. Contact the development team

---

**Note**: This deployment guide assumes a Ubuntu/Debian-based system. Adjust commands and paths as necessary for other distributions.